const WrapStyle = require("../models/WrapStyle");
const ApiError = require("../utils/ApiError");
const slugify = require("../utils/slugify");
const deleteCloudinaryFile = require("../utils/deleteCloudinaryFile");
const { buildImageUrl } = require("../utils/buildImageUrl");

async function generateUniqueSlug(name) {
  const base = slugify(name?.en || name?.ar || "wrap-style", "wrap-style");
  let slug = base;
  let counter = 1;

  // eslint-disable-next-line no-await-in-loop
  while (await WrapStyle.exists({ slug })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
}

function withImageUrl(style) {
  const obj = style.toJSON();
  if (obj.image) obj.imageUrl = buildImageUrl(obj.image);
  return obj;
}

async function deleteImageBestEffort(image) {
  if (!image) return;
  await deleteCloudinaryFile(image).catch(() => {});
}

async function listWrapStyles({ includeInactive = false } = {}) {
  const filter = {};
  if (!includeInactive) filter.isActive = true;

  const styles = await WrapStyle.find(filter).sort({
    sortOrder: 1,
    createdAt: 1,
  });
  return styles.map(withImageUrl);
}

async function getWrapStyleById(id) {
  const style = await WrapStyle.findById(id);
  if (!style) throw ApiError.notFound("Wrap style not found");
  return withImageUrl(style);
}

async function createWrapStyle(data, imagePayload) {
  const slug = await generateUniqueSlug(data.name);
  const image = imagePayload?.image || "";
  const imagePublicId = imagePayload?.imagePublicId || "";

  try {
    const style = await WrapStyle.create({
      name: data.name,
      description: data.description || {},
      slug,
      image,
      imagePublicId,
      price: data.price,
      isActive: data.isActive !== undefined ? data.isActive : true,
      sortOrder: data.sortOrder || 0,
    });
    return withImageUrl(style);
  } catch (err) {
    if (imagePublicId) {
      await deleteImageBestEffort(imagePublicId);
    }
    throw err;
  }
}

async function updateWrapStyle(id, data, newImage) {
  const style = await WrapStyle.findById(id);
  if (!style) throw ApiError.notFound("Wrap style not found");

  if (data.name !== undefined) {
    style.name = data.name;
    style.slug = await generateUniqueSlug(data.name);
  }
  if (data.description !== undefined) style.description = data.description;
  if (data.price !== undefined) style.price = data.price;
  if (data.isActive !== undefined) style.isActive = data.isActive;
  if (data.sortOrder !== undefined) style.sortOrder = data.sortOrder;

  if (newImage && newImage.image) {
    const oldImage = style.image;
    style.image = newImage.image;
    style.imagePublicId = newImage.imagePublicId || "";

    await deleteImageBestEffort(oldImage);
  }

  try {
    await style.save();
  } catch (err) {
    if (newImage && newImage.imagePublicId) {
      await deleteImageBestEffort(newImage.imagePublicId);
    }
    throw err;
  }

  return withImageUrl(style);
}

async function deleteWrapStyle(id) {
  const style = await WrapStyle.findById(id);
  if (!style) throw ApiError.notFound("Wrap style not found");

  if (style.image) await deleteImageBestEffort(style.image);

  await style.deleteOne();
  return { _id: id };
}

module.exports = {
  listWrapStyles,
  getWrapStyleById,
  createWrapStyle,
  updateWrapStyle,
  deleteWrapStyle,
};
