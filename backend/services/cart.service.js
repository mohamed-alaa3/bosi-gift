const Cart = require("../models/Cart");
const Product = require("../models/Product");
const ApiError = require("../utils/ApiError");
const { buildImageUrl } = require("../utils/buildImageUrl");
const GiftBox = require("../models/GiftBox");
const WrapStyle = require("../models/WrapStyle");
const Ribbon = require("../models/Ribbon");

/**
 * Parse selectedOptions (may come as JSON string from multipart or as array from JSON body).
 */
function parseSelectedOptions(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Find or create the cart document for a user.
 */
async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
}

/**
 * Effective price of a product (with discount if present).
 */
function effectivePrice(product) {
  if (
    product.discountPrice != null &&
    product.discountPrice > 0 &&
    product.discountPrice < product.price
  ) {
    return product.discountPrice;
  }
  return product.price;
}

/**
 * Compute the total price of a gift-box snapshot.
 */
function giftBoxTotal(gb) {
  const boxPrice = gb.boxPrice || 0;
  const itemsTotal = (gb.items || []).reduce(
    (sum, gi) => sum + (gi.price || 0) * (gi.quantity || 1),
    0,
  );
  const wrapTotal = gb.wrap?.price || 0;
  const ribbonTotal = gb.ribbon?.price || 0;
  return (
    Math.round((boxPrice + itemsTotal + wrapTotal + ribbonTotal) * 100) / 100
  );
}

/**
 * Enrich cart items with fresh product data (name, image, price, stock).
 * Handles both 'product' and 'gift-box' item types.
 */
async function enrichCart(cart) {
  const populated = await cart.populate({
    path: "items.product",
    select: "name images price discountPrice stock isActive",
  });

  const items = [];
  let subtotal = 0;
  let hasUnavailable = false;
  let itemCount = 0;

  for (const item of populated.items) {
    // ---------- GIFT BOX ITEM ----------
    if (item.type === "gift-box" && item.giftBox) {
      const gb = item.giftBox;
      const lineTotal = giftBoxTotal(gb);

      subtotal += lineTotal;
      itemCount += 1;

      // Check availability of the box + all internal products
      let available = true;
      let reason = null;

      const boxExists = await GiftBox.exists({ _id: gb.boxId, isActive: true });
      if (!boxExists) {
        available = false;
        reason = "Gift box is no longer available";
      } else {
        // Check each product inside
        const productIds = (gb.items || []).map((gi) => gi.productId);
        const products = await Product.find({ _id: { $in: productIds } });
        const productMap = new Map(products.map((p) => [p._id.toString(), p]));

        for (const gi of gb.items || []) {
          const p = productMap.get(String(gi.productId));
          if (!p || !p.isActive) {
            available = false;
            reason = "A product inside this gift box is no longer available";
            break;
          }
          if (p.stock < (gi.quantity || 1)) {
            available = false;
            reason = `Only ${p.stock} left in stock for one of the items`;
            break;
          }
        }
      }

      if (!available) hasUnavailable = true;

      items.push({
        _id: item._id,
        type: "gift-box",
        product: null,
        giftBox: {
          boxId: gb.boxId,
          boxName: gb.boxName,
          boxPrice: gb.boxPrice,
          boxImage: gb.boxImage,
          boxImageUrl: buildImageUrl(gb.boxImage || ""),
          capacity: gb.capacity,
          items: (gb.items || []).map((gi) => ({
            productId: gi.productId,
            name: gi.name,
            price: gi.price,
            image: gi.image,
            imageUrl: buildImageUrl(gi.image || ""),
            quantity: gi.quantity || 1,
          })),
          wrap: gb.wrap
            ? {
                wrapStyleId: gb.wrap.wrapStyleId,
                name: gb.wrap.name,
                price: gb.wrap.price,
                image: gb.wrap.image,
                imageUrl: buildImageUrl(gb.wrap.image || ""),
              }
            : null,
          ribbon: gb.ribbon
            ? {
                ribbonId: gb.ribbon.ribbonId,
                name: gb.ribbon.name,
                price: gb.ribbon.price,
                color: gb.ribbon.color,
                image: gb.ribbon.image,
                imageUrl: buildImageUrl(gb.ribbon.image || ""),
              }
            : null,
          note: gb.note || "",
        },
        quantity: 1,
        selectedOptions: [],
        lineTotal,
        available,
        reason,
      });

      continue;
    }

    // ---------- REGULAR PRODUCT ITEM ----------
    const product = item.product;

    if (!product || !product.isActive) {
      hasUnavailable = true;
      itemCount += item.quantity || 0;
      items.push({
        _id: item._id,
        type: "product",
        product: null,
        giftBox: null,
        quantity: item.quantity,
        selectedOptions: item.selectedOptions || [],
        lineTotal: 0,
        available: false,
        reason: "Product is no longer available",
      });
      continue;
    }

    const unitPrice = effectivePrice(product);
    const lineTotal = unitPrice * item.quantity;
    subtotal += lineTotal;
    itemCount += item.quantity;

    items.push({
      _id: item._id,
      type: "product",
      product: {
        _id: product._id,
        name: product.name,
        image: product.images?.[0] || "",
        imageUrl: buildImageUrl(product.images?.[0] || ""),
        price: product.price,
        discountPrice: product.discountPrice ?? null,
        effectivePrice: unitPrice,
        stock: product.stock,
      },
      giftBox: null,
      quantity: item.quantity,
      selectedOptions: item.selectedOptions || [],
      lineTotal,
      available: product.stock >= item.quantity,
      reason:
        product.stock >= item.quantity
          ? null
          : `Only ${product.stock} left in stock`,
    });
  }

  return {
    _id: cart._id,
    user: cart.user,
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    itemCount,
    hasUnavailable,
    updatedAt: cart.updatedAt,
    createdAt: cart.createdAt,
  };
}

/**
 * Get the user's cart with enriched data.
 */
async function getCart(userId) {
  const cart = await getOrCreateCart(userId);
  return enrichCart(cart);
}

/**
 * Add a fully-configured gift box to the cart.
 * Validates all entities and builds a complete snapshot.
 */
async function addGiftBox(userId, giftBoxInput) {
  if (
    !giftBoxInput ||
    !giftBoxInput.boxId ||
    !Array.isArray(giftBoxInput.items)
  ) {
    throw ApiError.badRequest("Invalid gift box configuration");
  }

  const box = await GiftBox.findById(giftBoxInput.boxId);
  if (!box || !box.isActive)
    throw ApiError.badRequest("Gift box is not available");

  if (giftBoxInput.items.length === 0) {
    throw ApiError.badRequest("Gift box must contain at least one item");
  }
  if (giftBoxInput.items.length > box.capacity) {
    throw ApiError.conflict(
      `Gift box capacity is ${box.capacity} items, you selected ${giftBoxInput.items.length}`,
    );
  }

  const productIds = giftBoxInput.items.map((i) => i.productId);
  const products = await Product.find({
    _id: { $in: productIds },
    isActive: true,
  });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const itemsSnapshot = [];
  for (const inputItem of giftBoxInput.items) {
    const product = productMap.get(String(inputItem.productId));
    if (!product)
      throw ApiError.badRequest(`Product not found: ${inputItem.productId}`);
    if (product.stock < 1) {
      throw ApiError.conflict(
        `${product.name.en || product.name.ar}: out of stock`,
      );
    }
    itemsSnapshot.push({
      productId: product._id.toString(),
      name: product.name,
      price: effectivePrice(product),
      image: product.images?.[0] || "",
      quantity: Math.max(1, Number(inputItem.quantity) || 1),
    });
  }

  let wrapSnapshot = null;
  if (giftBoxInput.wrapStyleId) {
    const wrap = await WrapStyle.findById(giftBoxInput.wrapStyleId);
    if (!wrap || !wrap.isActive) {
      throw ApiError.badRequest("Wrap style is not available");
    }
    wrapSnapshot = {
      wrapStyleId: wrap._id.toString(),
      name: wrap.name,
      price: wrap.price,
      image: wrap.image || "",
    };
  }

  let ribbonSnapshot = null;
  if (giftBoxInput.ribbonId) {
    const ribbon = await Ribbon.findById(giftBoxInput.ribbonId);
    if (!ribbon || !ribbon.isActive) {
      throw ApiError.badRequest("Ribbon is not available");
    }
    ribbonSnapshot = {
      ribbonId: ribbon._id.toString(),
      name: ribbon.name,
      price: ribbon.price,
      color: ribbon.color,
      image: ribbon.image || "",
    };
  }

  const giftBoxPayload = {
    boxId: box._id.toString(),
    boxName: box.name,
    boxPrice: box.basePrice,
    boxImage: box.image || "",
    capacity: box.capacity,
    items: itemsSnapshot,
    wrap: wrapSnapshot,
    ribbon: ribbonSnapshot,
    note: (giftBoxInput.note || "").toString().slice(0, 500),
  };

  const cart = await getOrCreateCart(userId);
  cart.items.push({
    type: "gift-box",
    product: null,
    quantity: 1,
    selectedOptions: [],
    giftBox: giftBoxPayload,
  });

  await cart.save();
  return enrichCart(cart);
}

/**
 * Add a product to the cart.
 * If the same product (with identical selectedOptions) is already in the cart,
 * increment its quantity.
 */
async function addItem(
  userId,
  { productId, quantity = 1, selectedOptions = [] },
) {
  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    throw ApiError.notFound("Product not found");
  }

  if (product.stock < quantity) {
    throw ApiError.conflict(`Only ${product.stock} left in stock`);
  }

  const cart = await getOrCreateCart(userId);
  const parsedOptions = parseSelectedOptions(selectedOptions);

  const normalizeOpts = (opts) =>
    [...opts]
      .map(
        (o) =>
          `${o.name?.en || o.name?.ar || ""}|${o.value?.en || o.value?.ar || ""}`,
      )
      .sort()
      .join("||");

  const incomingKey = normalizeOpts(parsedOptions);

  // Only merge with OTHER PRODUCT items
  const existing = cart.items.find(
    (item) =>
      item.type === "product" &&
      item.product &&
      item.product.toString() === productId &&
      normalizeOpts(item.selectedOptions || []) === incomingKey,
  );

  if (existing) {
    const newQty = existing.quantity + quantity;
    if (product.stock < newQty) {
      throw ApiError.conflict(`Only ${product.stock} left in stock`);
    }
    existing.quantity = newQty;
  } else {
    cart.items.push({
      type: "product",
      product: productId,
      quantity,
      selectedOptions: parsedOptions,
      giftBox: null,
    });
  }

  await cart.save();
  return enrichCart(cart);
}

/**
 * Update the quantity of a specific cart item.
 * Only applies to 'product' items — gift-box items have fixed quantity 1.
 */
async function updateItem(userId, itemId, quantity) {
  const cart = await getOrCreateCart(userId);
  const item = cart.items.id(itemId);
  if (!item) throw ApiError.notFound("Cart item not found");

  if (item.type === "gift-box") {
    throw ApiError.badRequest(
      "Gift box quantity cannot be changed. Remove and rebuild instead.",
    );
  }

  const product = await Product.findById(item.product);
  if (!product || !product.isActive) {
    throw ApiError.notFound("Product is no longer available");
  }

  if (product.stock < quantity) {
    throw ApiError.conflict(`Only ${product.stock} left in stock`);
  }

  item.quantity = quantity;
  await cart.save();
  return enrichCart(cart);
}

/**
 * Remove a specific item from the cart.
 */
async function removeItem(userId, itemId) {
  const cart = await getOrCreateCart(userId);
  const item = cart.items.id(itemId);
  if (!item) throw ApiError.notFound("Cart item not found");

  item.deleteOne();
  await cart.save();
  return enrichCart(cart);
}

/**
 * Clear the entire cart.
 */
async function clearCart(userId) {
  const cart = await getOrCreateCart(userId);
  cart.items = [];
  await cart.save();
  return enrichCart(cart);
}

module.exports = {
  getCart,
  addItem,
  addGiftBox,
  updateItem,
  removeItem,
  clearCart,
  enrichCart,
  getOrCreateCart,
  effectivePrice,
};
