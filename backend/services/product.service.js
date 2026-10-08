const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Order = require("../models/Order");
const {
  RECIPIENTS,
  OCCASIONS,
  TRENDING_WINDOW_DAYS,
  TRENDING_MAX_PRODUCTS,
} = require("../config/giftTaxonomy");
const ApiError = require("../utils/ApiError");
const slugify = require("../utils/slugify");
const deleteCloudinaryFile = require("../utils/deleteCloudinaryFile");
const { buildImageUrl, buildImageUrls } = require("../utils/buildImageUrl");

/**
 * Build a unique product slug.
 */
async function generateUniqueSlug(name) {
  const base = slugify(name?.en || name?.ar || "product", "product");
  let slug = base;
  let counter = 1;

  // eslint-disable-next-line no-await-in-loop
  while (await Product.exists({ slug })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
}

/**
 * Add full URLs to image paths.
 */
function withImageUrls(product) {
  const obj = product.toJSON();
  obj.imageUrls = buildImageUrls(obj.images || []);
  obj.isDailyOfferActive = isDailyOfferActive(obj);
  return obj;
}

/**
 * A daily offer is live when it is flagged, has a valid discount price
 * (the existing `discountPrice` is the offer price) and "now" is inside the
 * optional start/end window.
 */
function isDailyOfferActive(p, now = new Date()) {
  if (!p || !p.isDailyOffer) return false;
  if (!(p.discountPrice > 0 && p.discountPrice < p.price)) return false;
  if (p.dailyOfferStart && new Date(p.dailyOfferStart) > now) return false;
  if (p.dailyOfferEnd && new Date(p.dailyOfferEnd) < now) return false;
  return true;
}

function assertDailyOfferConfig({
  isDailyOffer,
  discountPrice,
  dailyOfferStart,
  dailyOfferEnd,
}) {
  if (!isDailyOffer) return;
  if (!(discountPrice > 0)) {
    throw ApiError.badRequest("A daily offer requires a discount price");
  }
  if (
    dailyOfferStart &&
    dailyOfferEnd &&
    new Date(dailyOfferEnd) <= new Date(dailyOfferStart)
  ) {
    throw ApiError.badRequest("Offer end date must be after its start date");
  }
}

/**
 * Parse a comma-separated query value into a list of allowed slugs.
 * Non-string input (e.g. injected objects) and unknown slugs are ignored.
 */
function parseSlugList(value, allowed) {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter((v) => allowed.includes(v));
}

/**
 * Product ids ranked by units sold (non-cancelled product orders) in the
 * trending window. Pure analytics — no stored flag.
 */
async function getTrendingRanking() {
  const since = new Date(
    Date.now() - TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );
  const rows = await Order.aggregate([
    { $match: { status: { $ne: "cancelled" }, createdAt: { $gte: since } } },
    { $unwind: "$items" },
    {
      $match: {
        "items.type": { $ne: "gift-box" },
        "items.product": { $ne: null },
      },
    },
    { $group: { _id: "$items.product", sold: { $sum: "$items.quantity" } } },
    { $sort: { sold: -1 } },
    { $limit: TRENDING_MAX_PRODUCTS },
  ]);
  return rows.map((r) => String(r._id));
}

/**
 * Compute effective price (with discount).
 */
function computeEffectivePrice(product) {
  if (
    product.discountPrice &&
    product.discountPrice > 0 &&
    product.discountPrice < product.price
  ) {
    return product.discountPrice;
  }
  return product.price;
}

/**
 * Parse options from body (multipart sends them as JSON string).
 */
function parseOptions(rawOptions) {
  if (!rawOptions) return [];
  if (Array.isArray(rawOptions)) return rawOptions;
  try {
    const parsed =
      typeof rawOptions === "string" ? JSON.parse(rawOptions) : rawOptions;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Build a filter object from query params.
 */
function buildFilter(query, { includeInactive = false } = {}) {
  const filter = {};

  if (!includeInactive) filter.isActive = true;

  if (query.category) {
    filter.category = query.category;
  }

  if (query.featured === "true") {
    filter.isFeatured = true;
  }

  // --- Gift discovery filters (all optional, combinable) ---
  const recipients = parseSlugList(query.recipient, RECIPIENTS);
  if (recipients.length) filter.recipients = { $in: recipients };

  const occasions = parseSlugList(query.occasion, OCCASIONS);
  if (occasions.length) filter.occasions = { $in: occasions };

  if (query.readyBox === "true") filter.isReadyGiftBox = true;

  if (query.onSale === "true") filter.discountPrice = { $gt: 0 };

  if (query.dailyOffer === "true") {
    const now = new Date();
    filter.isDailyOffer = true;
    filter.discountPrice = { $gt: 0 };
    filter.$and = [
      ...(filter.$and || []),
      { $or: [{ dailyOfferStart: null }, { dailyOfferStart: { $lte: now } }] },
      { $or: [{ dailyOfferEnd: null }, { dailyOfferEnd: { $gte: now } }] },
    ];
  }

  if (query.inStock === "true") {
    filter.stock = { $gt: 0 };
  }

  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
  }

  if (query.rating) {
    filter.ratingAvg = { $gte: Number(query.rating) };
  }

  if (query.q) {
    filter.$or = [
      { "name.en": { $regex: query.q, $options: "i" } },
      { "name.ar": { $regex: query.q, $options: "i" } },
    ];
  }

  return filter;
}

/**
 * Parse sort string.
 */
function buildSort(sort) {
  const map = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    "price-asc": { price: 1 },
    "price-desc": { price: -1 },
    "rating-desc": { ratingAvg: -1 },
    featured: { isFeatured: -1, createdAt: -1 },
  };
  return map[sort] || { createdAt: -1 };
}

/**
 * List products with filters + pagination.
 */
async function listProducts(query, { includeInactive = false } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 12));
  const skip = (page - 1) * limit;

  const filter = buildFilter(query, { includeInactive });
  const sort = buildSort(query.sort);

  // Trending: rank by real sales, then page the (small) ranked set in memory.
  if (query.trending === "true") {
    const ranking = await getTrendingRanking();
    if (ranking.length === 0) {
      return { items: [], meta: { page, limit, total: 0, totalPages: 0 } };
    }
    filter._id = { $in: ranking };
    const all = await Product.find(filter).populate("category", "name slug");
    all.sort(
      (a, b) => ranking.indexOf(String(a._id)) - ranking.indexOf(String(b._id)),
    );
    return {
      items: all.slice(skip, skip + limit).map(withImageUrls),
      meta: {
        page,
        limit,
        total: all.length,
        totalPages: Math.ceil(all.length / limit),
      },
    };
  }

  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate("category", "name slug")
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  return {
    items: items.map(withImageUrls),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get one product by id or slug.
 */
async function getProductById(idOrSlug, { includeInactive = false } = {}) {
  const filter = mongoose.isValidObjectId(idOrSlug)
    ? { _id: idOrSlug }
    : { slug: idOrSlug };

  if (!includeInactive) filter.isActive = true;

  const product = await Product.findOne(filter).populate(
    "category",
    "name slug",
  );
  if (!product) throw ApiError.notFound("Product not found");

  return withImageUrls(product);
}

/**
 * Get related products (same category, exclude self).
 */
async function getRelatedProducts(id, limit = 4) {
  const product = await Product.findById(id).select("category isActive");
  if (!product || !product.isActive)
    throw ApiError.notFound("Product not found");

  const items = await Product.find({
    category: product.category,
    _id: { $ne: product._id },
    isActive: true,
  })
    .limit(limit)
    .sort({ createdAt: -1 });

  return items.map(withImageUrls);
}

/**
 * Delete a set of images (Cloudinary or legacy local) best-effort.
 * Empty strings and nulls are ignored silently.
 */
async function deleteImagesBestEffort(images) {
  if (!Array.isArray(images)) return;
  for (const img of images) {
    if (!img) continue;
    // eslint-disable-next-line no-await-in-loop
    await deleteCloudinaryFile(img).catch(() => {});
  }
}

/**
 * Create a product.
 *
 * @param {object} data
 * @param {{ images: string[], imagePublicIds: string[] }} imagesPayload
 */
async function createProduct(data, imagesPayload) {
  const category = await Category.findById(data.category);
  if (!category) throw ApiError.badRequest("Category not found");

  const images = imagesPayload?.images || [];
  const imagePublicIds = imagesPayload?.imagePublicIds || [];

  if (images.length === 0) {
    throw ApiError.badRequest("At least one product image is required");
  }

  if (data.discountPrice != null && data.discountPrice >= data.price) {
    throw ApiError.badRequest(
      "Discount price must be less than the regular price",
    );
  }

  assertDailyOfferConfig({
    isDailyOffer: data.isDailyOffer,
    discountPrice: data.discountPrice,
    dailyOfferStart: data.dailyOfferStart,
    dailyOfferEnd: data.dailyOfferEnd,
  });

  const slug = await generateUniqueSlug(data.name);

  // Pad imagePublicIds to match images length so the arrays stay index-aligned.
  const paddedPublicIds = images.map((_, i) => imagePublicIds[i] || "");

  try {
    const product = await Product.create({
      ...data,
      slug,
      images,
      imagePublicIds: paddedPublicIds,
      options: parseOptions(data.options),
    });
    return withImageUrls(product);
  } catch (err) {
    // Document creation failed after the images were uploaded — clean up.
    await deleteImagesBestEffort(images);
    throw err;
  }
}

/**
 * Update a product.
 * If new images uploaded, replace the full set (and delete old files).
 *
 * @param {string} id
 * @param {object} data
 * @param {{ images: string[], imagePublicIds: string[] }|undefined} newImages
 *        When provided, replaces the whole image set.
 */
async function updateProduct(id, data, newImages) {
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound("Product not found");

  if (data.category) {
    const category = await Category.findById(data.category);
    if (!category) throw ApiError.badRequest("Category not found");
    product.category = data.category;
  }

  if (data.name !== undefined) {
    product.name = data.name;
    product.slug = await generateUniqueSlug(data.name);
  }

  if (data.description !== undefined) product.description = data.description;
  if (data.shortDescription !== undefined)
    product.shortDescription = data.shortDescription;
  if (data.price !== undefined) product.price = data.price;
  if (data.discountPrice !== undefined)
    product.discountPrice = data.discountPrice;
  if (data.stock !== undefined) product.stock = data.stock;
  if (data.sku !== undefined) product.sku = data.sku;
  if (data.isFeatured !== undefined) product.isFeatured = data.isFeatured;
  if (data.isActive !== undefined) product.isActive = data.isActive;
  if (data.options !== undefined) product.options = parseOptions(data.options);
  if (data.recipients !== undefined) product.recipients = data.recipients;
  if (data.occasions !== undefined) product.occasions = data.occasions;
  if (data.isReadyGiftBox !== undefined)
    product.isReadyGiftBox = data.isReadyGiftBox;
  if (data.isDailyOffer !== undefined) product.isDailyOffer = data.isDailyOffer;
  if (data.dailyOfferStart !== undefined)
    product.dailyOfferStart = data.dailyOfferStart;
  if (data.dailyOfferEnd !== undefined)
    product.dailyOfferEnd = data.dailyOfferEnd;

  // Re-validate discount after price changes
  if (product.discountPrice != null && product.discountPrice >= product.price) {
    throw ApiError.badRequest(
      "Discount price must be less than the regular price",
    );
  }

  assertDailyOfferConfig(product);

  // Replace images if new ones uploaded
  if (newImages && newImages.images && newImages.images.length > 0) {
    const oldImages = product.images || [];
    const paddedPublicIds = newImages.images.map(
      (_, i) => newImages.imagePublicIds?.[i] || "",
    );

    product.images = newImages.images;
    product.imagePublicIds = paddedPublicIds;

    // Delete the previous images best-effort (Cloudinary or legacy disk).
    await deleteImagesBestEffort(oldImages);
  }

  try {
    await product.save();
  } catch (err) {
    // If the save fails AFTER we already replaced the images and deleted
    // the old ones, we can't fully restore — but at least clean up the
    // new uploads so they don't become orphans.
    if (newImages && newImages.images && newImages.images.length > 0) {
      await deleteImagesBestEffort(newImages.images);
    }
    throw err;
  }

  return withImageUrls(product);
}

/**
 * Soft delete: mark inactive.
 * Images are intentionally NOT removed — soft delete keeps them for
 * potential reactivation.
 */
async function deleteProduct(id) {
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound("Product not found");

  product.isActive = false;
  await product.save();

  return { _id: id, isActive: false };
}

module.exports = {
  listProducts,
  getProductById,
  getRelatedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  computeEffectivePrice,
  isDailyOfferActive,
};
