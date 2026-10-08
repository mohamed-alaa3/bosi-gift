const Ribbon = require("../models/Ribbon");
const ApiError = require("../utils/ApiError");
const slugify = require("../utils/slugify");
const deleteCloudinaryFile = require("../utils/deleteCloudinaryFile");
const { buildImageUrl } = require("../utils/buildImageUrl");

async function generateUniqueSlug(name) {
  const base = slugify(name?.en || name?.ar || "ribbon", "ribbon");
  let slug = base;
  let counter = 1;

  // eslint-disable-next-line no-await-in-loop
  while (await Ribbon.exists({ slug })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
}

function withImageUrl(ribbon) {
  const obj = ribbon.toJSON();
  if (obj.image) obj.imageUrl = buildImageUrl(obj.image);
  return obj;
}

async function deleteImageBestEffort(image) {
  if (!image) return;
  await deleteCloudinaryFile(image).catch(() => {});
}

async function listRibbons({ includeInactive = false } = {}) {
  const filter = {};
  if (!includeInactive) filter.isActive = true;

  const ribbons = await Ribbon.find(filter).sort({
    sortOrder: 1,
    createdAt: 1,
  });
  return ribbons.map(withImageUrl);
}

async function getRibbonById(id) {
  const ribbon = await Ribbon.findById(id);
  if (!ribbon) throw ApiError.notFound("Ribbon not found");
  return withImageUrl(ribbon);
}

async function createRibbon(data, imagePayload) {
  const slug = await generateUniqueSlug(data.name);
  const image = imagePayload?.image || "";
  const imagePublicId = imagePayload?.imagePublicId || "";

  try {
    const ribbon = await Ribbon.create({
      name: data.name,
      slug,
      color: data.color,
      image,
      imagePublicId,
      price: data.price,
      isActive: data.isActive !== undefined ? data.isActive : true,
      sortOrder: data.sortOrder || 0,
    });
    return withImageUrl(ribbon);
  } catch (err) {
    if (imagePublicId) {
      await deleteImageBestEffort(imagePublicId);
    }
    throw err;
  }
}

async function updateRibbon(id, data, newImage) {
  const ribbon = await Ribbon.findById(id);
  if (!ribbon) throw ApiError.notFound("Ribbon not found");

  if (data.name !== undefined) {
    ribbon.name = data.name;
    ribbon.slug = await generateUniqueSlug(data.name);
  }
  if (data.color !== undefined) ribbon.color = data.color;
  if (data.price !== undefined) ribbon.price = data.price;
  if (data.isActive !== undefined) ribbon.isActive = data.isActive;
  if (data.sortOrder !== undefined) ribbon.sortOrder = data.sortOrder;

  if (newImage && newImage.image) {
    const oldImage = ribbon.image;
    ribbon.image = newImage.image;
    ribbon.imagePublicId = newImage.imagePublicId || "";

    await deleteImageBestEffort(oldImage);
  }

  try {
    await ribbon.save();
  } catch (err) {
    if (newImage && newImage.imagePublicId) {
      await deleteImageBestEffort(newImage.imagePublicId);
    }
    throw err;
  }

  return withImageUrl(ribbon);
}

async function deleteRibbon(id) {
  const ribbon = await Ribbon.findById(id);
  if (!ribbon) throw ApiError.notFound("Ribbon not found");

  if (ribbon.image) await deleteImageBestEffort(ribbon.image);

  await ribbon.deleteOne();
  return { _id: id };
}

module.exports = {
  listRibbons,
  getRibbonById,
  createRibbon,
  updateRibbon,
  deleteRibbon,
};
