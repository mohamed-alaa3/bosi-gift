const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");
const ApiError = require("../utils/ApiError");
const { buildImageUrl } = require("../utils/buildImageUrl");

/**
 * Find or create the wishlist document for a user.
 */
async function getOrCreateWishlist(userId) {
  let wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: userId, products: [] });
  }
  return wishlist;
}

/**
 * Build a simplified product view for the wishlist response.
 */
function buildProductPreview(product) {
  return {
    _id: product._id,
    name: product.name,
    slug: product.slug,
    image: product.images?.[0] || "",
    imageUrl: buildImageUrl(product.images?.[0] || ""),
    price: product.price,
    discountPrice: product.discountPrice ?? null,
    stock: product.stock,
    isActive: product.isActive,
  };
}

/**
 * Get the user's wishlist with product details populated.
 * Items whose product was deleted are automatically pruned.
 */
async function getWishlist(userId) {
  const wishlist = await getOrCreateWishlist(userId);

  const populated = await wishlist.populate({
    path: "products",
    select: "name slug images price discountPrice stock isActive",
  });

  // Filter out null entries (deleted products) and map
  const items = populated.products
    .filter((p) => p) // null if product was hard-deleted
    .map(buildProductPreview);

  // Sync back: remove any nulls so next call doesn't re-fetch them
  const cleanIds = populated.products.filter((p) => p).map((p) => p._id);

  if (cleanIds.length !== populated.products.length) {
    wishlist.products = cleanIds;
    await wishlist.save();
  }

  return {
    _id: wishlist._id,
    user: wishlist.user,
    items,
    count: items.length,
    updatedAt: wishlist.updatedAt,
  };
}

/**
 * Add a product to the wishlist.
 * Idempotent — adding an existing product does not error.
 */
async function addItem(userId, productId) {
  const product = await Product.findById(productId);
  if (!product) throw ApiError.notFound("Product not found");

  const wishlist = await getOrCreateWishlist(userId);

  const exists = wishlist.products.some((p) => p.toString() === productId);
  if (!exists) {
    wishlist.products.push(productId);
    await wishlist.save();
  }

  return getWishlist(userId);
}

/**
 * Remove a product from the wishlist.
 * Idempotent — removing a non-existent product does not error.
 */
async function removeItem(userId, productId) {
  const wishlist = await getOrCreateWishlist(userId);

  wishlist.products = wishlist.products.filter(
    (p) => p.toString() !== productId,
  );
  await wishlist.save();

  return getWishlist(userId);
}

module.exports = {
  getWishlist,
  addItem,
  removeItem,
};
