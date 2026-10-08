const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const productService = require("../services/product.service");
const cloudinaryService = require("../services/cloudinary.service");
const { CLOUDINARY_FOLDERS } = require("../config/cloudinary");

/**
 * Upload an array of multer memory-storage files to Cloudinary.
 * Order is preserved: uploaded file 0 → images[0] / imagePublicIds[0], etc.
 * If any upload fails, Promise.all rejects and no image is persisted
 * (the service is responsible for rolling back any partial DB state).
 */
async function uploadProductImagesToCloudinary(files) {
  if (!files || files.length === 0) {
    return { images: [], imagePublicIds: [] };
  }

  const results = await Promise.all(
    files.map((file) =>
      cloudinaryService.uploadBuffer(file.buffer, CLOUDINARY_FOLDERS.products),
    ),
  );

  return {
    images: results.map((r) => r.secure_url),
    imagePublicIds: results.map((r) => r.public_id),
  };
}

/**
 * GET /api/products
 */
const list = asyncHandler(async (req, res) => {
  const includeInactive =
    req.user?.role === "admin" && req.query.includeInactive === "true";
  const { items, meta } = await productService.listProducts(req.query, {
    includeInactive,
  });
  return ok(res, items, meta);
});

/**
 * GET /api/products/:id
 * Accepts id or slug.
 */
const getOne = asyncHandler(async (req, res) => {
  const includeInactive = req.user?.role === "admin";
  const data = await productService.getProductById(req.params.id, {
    includeInactive,
  });
  return ok(res, data);
});

/**
 * GET /api/products/:id/related
 */
const related = asyncHandler(async (req, res) => {
  const limit = Math.min(12, Math.max(1, parseInt(req.query.limit, 10) || 4));
  const data = await productService.getRelatedProducts(req.params.id, limit);
  return ok(res, data);
});

/**
 * POST /api/products  (admin)
 */
const create = asyncHandler(async (req, res) => {
  const { images, imagePublicIds } = await uploadProductImagesToCloudinary(
    req.files,
  );
  const data = await productService.createProduct(req.body, {
    images,
    imagePublicIds,
  });
  return ok(res, data, undefined, 201);
});

/**
 * PATCH /api/products/:id  (admin)
 */
const update = asyncHandler(async (req, res) => {
  const { images, imagePublicIds } = await uploadProductImagesToCloudinary(
    req.files,
  );
  const data = await productService.updateProduct(
    req.params.id,
    req.body,
    images.length > 0 ? { images, imagePublicIds } : undefined,
  );
  return ok(res, data);
});

/**
 * DELETE /api/products/:id  (admin) — soft delete
 */
const remove = asyncHandler(async (req, res) => {
  const data = await productService.deleteProduct(req.params.id);
  return ok(res, data);
});

module.exports = { list, getOne, related, create, update, remove };
