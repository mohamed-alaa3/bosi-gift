const GiftBox = require("../models/GiftBox");
const ApiError = require("../utils/ApiError");
const slugify = require("../utils/slugify");
const deleteCloudinaryFile = require("../utils/deleteCloudinaryFile");
const { buildImageUrl } = require("../utils/buildImageUrl");

async function generateUniqueSlug(name) {
  const base = slugify(name?.en || name?.ar || "gift-box", "gift-box");
  let slug = base;
  let counter = 1;

  // eslint-disable-next-line no-await-in-loop
  while (await GiftBox.exists({ slug })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
}

function withImageUrl(box) {
  const obj = box.toJSON();
  if (obj.image) obj.imageUrl = buildImageUrl(obj.image);
  return obj;
}

async function deleteImageBestEffort(image) {
  if (!image) return;
  await deleteCloudinaryFile(image).catch(() => {});
}

async function listGiftBoxes({ includeInactive = false } = {}) {
  const filter = {};
  if (!includeInactive) filter.isActive = true;

  const boxes = await GiftBox.find(filter).sort({ sortOrder: 1, createdAt: 1 });
  return boxes.map(withImageUrl);
}

async function getGiftBoxById(id) {
  const box = await GiftBox.findById(id);
  if (!box) throw ApiError.notFound("Gift box not found");
  return withImageUrl(box);
}

async function createGiftBox(data, imagePayload) {
  const slug = await generateUniqueSlug(data.name);
  const image = imagePayload?.image || "";
  const imagePublicId = imagePayload?.imagePublicId || "";

  try {
    const box = await GiftBox.create({
      name: data.name,
      description: data.description || {},
      slug,
      image,
      imagePublicId,
      basePrice: data.basePrice,
      capacity: data.capacity,
      isActive: data.isActive !== undefined ? data.isActive : true,
      sortOrder: data.sortOrder || 0,
    });
    return withImageUrl(box);
  } catch (err) {
    if (imagePublicId) {
      await deleteImageBestEffort(imagePublicId);
    }
    throw err;
  }
}

async function updateGiftBox(id, data, newImage) {
  const box = await GiftBox.findById(id);
  if (!box) throw ApiError.notFound("Gift box not found");

  if (data.name !== undefined) {
    box.name = data.name;
    box.slug = await generateUniqueSlug(data.name);
  }
  if (data.description !== undefined) box.description = data.description;
  if (data.basePrice !== undefined) box.basePrice = data.basePrice;
  if (data.capacity !== undefined) box.capacity = data.capacity;
  if (data.isActive !== undefined) box.isActive = data.isActive;
  if (data.sortOrder !== undefined) box.sortOrder = data.sortOrder;

  if (newImage && newImage.image) {
    const oldImage = box.image;
    box.image = newImage.image;
    box.imagePublicId = newImage.imagePublicId || "";

    await deleteImageBestEffort(oldImage);
  }

  try {
    await box.save();
  } catch (err) {
    if (newImage && newImage.imagePublicId) {
      await deleteImageBestEffort(newImage.imagePublicId);
    }
    throw err;
  }

  return withImageUrl(box);
}

async function deleteGiftBox(id) {
  const box = await GiftBox.findById(id);
  if (!box) throw ApiError.notFound("Gift box not found");

  if (box.image) await deleteImageBestEffort(box.image);

  await box.deleteOne();
  return { _id: id };
}

module.exports = {
  listGiftBoxes,
  getGiftBoxById,
  createGiftBox,
  updateGiftBox,
  deleteGiftBox,
};
