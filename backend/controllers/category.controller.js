const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const categoryService = require("../services/category.service");
const cloudinaryService = require("../services/cloudinary.service");
const { CLOUDINARY_FOLDERS } = require("../config/cloudinary");

/**
 * Upload a single multer memory-storage file to Cloudinary.
 * Returns { image, imagePublicId } or empty strings when no file was sent.
 */
async function uploadCategoryImageToCloudinary(file) {
  if (!file) return { image: "", imagePublicId: "" };

  const { secure_url, public_id } = await cloudinaryService.uploadBuffer(
    file.buffer,
    CLOUDINARY_FOLDERS.categories,
  );
  return { image: secure_url, imagePublicId: public_id };
}

/**
 * GET /api/categories
 */
const list = asyncHandler(async (req, res) => {
  const includeInactive =
    req.user?.role === "admin" && req.query.includeInactive === "true";
  const data = await categoryService.listCategories({ includeInactive });
  return ok(res, data);
});

/**
 * GET /api/categories/:id
 */
const getOne = asyncHandler(async (req, res) => {
  const data = await categoryService.getCategoryById(req.params.id);
  return ok(res, data);
});

/**
 * POST /api/categories  (admin)
 */
const create = asyncHandler(async (req, res) => {
  const { image, imagePublicId } = await uploadCategoryImageToCloudinary(
    req.file,
  );
  const data = await categoryService.createCategory({
    name: req.body.name,
    description: req.body.description,
    isActive: req.body.isActive,
    sortOrder: req.body.sortOrder,
    image,
    imagePublicId,
  });
  return ok(res, data, undefined, 201);
});

/**
 * PATCH /api/categories/:id  (admin)
 */
const update = asyncHandler(async (req, res) => {
  const newImage = req.file
    ? await uploadCategoryImageToCloudinary(req.file)
    : undefined;
  const data = await categoryService.updateCategory(req.params.id, {
    name: req.body.name,
    description: req.body.description,
    isActive: req.body.isActive,
    sortOrder: req.body.sortOrder,
    newImage,
  });
  return ok(res, data);
});

/**
 * DELETE /api/categories/:id  (admin)
 */
const remove = asyncHandler(async (req, res) => {
  const data = await categoryService.deleteCategory(req.params.id);
  return ok(res, data);
});

module.exports = { list, getOne, create, update, remove };
