const Category = require("../models/Category");
const Product = require("../models/Product");
const ApiError = require("../utils/ApiError");
const slugify = require("../utils/slugify");
const deleteCloudinaryFile = require("../utils/deleteCloudinaryFile");
const { buildImageUrl } = require("../utils/buildImageUrl");

/**
 * Build a unique slug from the category's English or Arabic name.
 */
async function generateUniqueSlug(name) {
  const base = slugify(name?.en || name?.ar || "category", "category");
  let slug = base;
  let counter = 1;

  // eslint-disable-next-line no-await-in-loop
  while (await Category.exists({ slug })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
}

/**
 * Add a full URL to the image field for API consumers.
 */
function withImageUrl(category) {
  const obj = category.toJSON();
  if (obj.image) obj.imageUrl = buildImageUrl(obj.image);
  return obj;
}

/**
 * Delete a single image (Cloudinary URL, public_id, or legacy /uploads path).
 * Best-effort — never throws.
 */
async function deleteImageBestEffort(image) {
  if (!image) return;
  await deleteCloudinaryFile(image).catch(() => {});
}

/**
 * List categories with optional filters.
 */
async function listCategories({ includeInactive = false } = {}) {
  const filter = {};
  if (!includeInactive) filter.isActive = true;

  const categories = await Category.find(filter).sort({
    sortOrder: 1,
    createdAt: 1,
  });
  return categories.map(withImageUrl);
}

/**
 * Get one category by id.
 */
async function getCategoryById(id) {
  const category = await Category.findById(id);
  if (!category) throw ApiError.notFound("Category not found");
  return withImageUrl(category);
}

/**
 * Create a new category. Optionally receives an uploaded image.
 *
 * @param {object} data
 * @param {string} data.image         Cloudinary secure_url or ""
 * @param {string} data.imagePublicId Cloudinary public_id or ""
 */
async function createCategory({
  name,
  description,
  isActive,
  sortOrder,
  image,
  imagePublicId,
}) {
  const slug = await generateUniqueSlug(name);

  try {
    const category = await Category.create({
      name,
      description: description || {},
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder || 0,
      slug,
      image: image || "",
      imagePublicId: imagePublicId || "",
    });
    return withImageUrl(category);
  } catch (err) {
    if (imagePublicId) {
      await deleteImageBestEffort(imagePublicId);
    }
    throw err;
  }
}

/**
 * Update an existing category.
 * If a new image is uploaded, the old one is removed.
 *
 * @param {string} id
 * @param {object} patch
 * @param {{ image: string, imagePublicId: string }|undefined} newImage
 */
async function updateCategory(
  id,
  { name, description, isActive, sortOrder, newImage },
) {
  const category = await Category.findById(id);
  if (!category) throw ApiError.notFound("Category not found");

  if (name !== undefined) {
    category.name = name;
    // regenerate slug only if name changed
    category.slug = await generateUniqueSlug(name);
  }
  if (description !== undefined) category.description = description;
  if (isActive !== undefined) category.isActive = isActive;
  if (sortOrder !== undefined) category.sortOrder = sortOrder;

  if (newImage && newImage.image) {
    const oldImage = category.image;
    category.image = newImage.image;
    category.imagePublicId = newImage.imagePublicId || "";

    // Delete the previous image (Cloudinary or legacy disk) best-effort.
    await deleteImageBestEffort(oldImage);
  }

  try {
    await category.save();
  } catch (err) {
    if (newImage && newImage.imagePublicId) {
      await deleteImageBestEffort(newImage.imagePublicId);
    }
    throw err;
  }

  return withImageUrl(category);
}

/**
 * Delete a category.
 * Blocked if the category still has products attached.
 */
async function deleteCategory(id) {
  const category = await Category.findById(id);
  if (!category) throw ApiError.notFound("Category not found");

  const productCount = await Product.countDocuments({ category: id });
  if (productCount > 0) {
    throw ApiError.conflict(
      `Cannot delete category: ${productCount} product(s) still assigned to it`,
    );
  }

  if (category.image) {
    await deleteImageBestEffort(category.image);
  }

  await category.deleteOne();
  return { _id: id };
}

module.exports = {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
