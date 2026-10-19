const Banner = require("../models/Banner");
const ApiError = require("../utils/ApiError");
const deleteCloudinaryFile = require("../utils/deleteCloudinaryFile");
const { buildImageUrl } = require("../utils/buildImageUrl");

/**
 * Add a full image URL to the response.
 */
function withImageUrl(banner) {
  const obj = banner.toJSON();
  if (obj.image) obj.imageUrl = buildImageUrl(obj.image);
  if (obj.mobileImage) obj.mobileImageUrl = buildImageUrl(obj.mobileImage);
  return obj;
}

async function deleteImageBestEffort(image) {
  if (!image) return;
  await deleteCloudinaryFile(image).catch(() => {});
}

/**
 * List banners.
 * - Public: only active, optional position filter.
 * - Admin: all, optional position filter.
 */
async function listBanners({ position, includeInactive = false } = {}) {
  const filter = {};
  if (!includeInactive) filter.isActive = true;
  if (position) filter.position = position;

  const banners = await Banner.find(filter).sort({
    sortOrder: 1,
    createdAt: -1,
  });
  return banners.map(withImageUrl);
}

/**
 * Get one banner by id.
 */
async function getBannerById(id) {
  const banner = await Banner.findById(id);
  if (!banner) throw ApiError.notFound("Banner not found");
  return withImageUrl(banner);
}

/**
 * Create a banner. Requires an uploaded image.
 *
 * @param {object} data
 * @param {{ image?: string, imagePublicId?: string, mobileImage?: string, mobileImagePublicId?: string }} imagePayload
 */
async function createBanner(data, imagePayload) {
  const image = imagePayload?.image || "";
  const imagePublicId = imagePayload?.imagePublicId || "";
  const mobileImage = imagePayload?.mobileImage || "";
  const mobileImagePublicId = imagePayload?.mobileImagePublicId || "";

  if (!image) {
    throw ApiError.badRequest("Banner image is required");
  }

  try {
    const banner = await Banner.create({
      title: data.title,
      subtitle: data.subtitle || {},
      buttonText: data.buttonText || {},
      buttonLink: data.buttonLink || "",
      position: data.position,
      image,
      imagePublicId,
      mobileImage,
      mobileImagePublicId,
      isActive: data.isActive !== undefined ? data.isActive : true,
      sortOrder: data.sortOrder || 0,
    });
    return withImageUrl(banner);
  } catch (err) {
    await Promise.all([
      imagePublicId ? deleteImageBestEffort(imagePublicId) : Promise.resolve(),
      mobileImagePublicId ? deleteImageBestEffort(mobileImagePublicId) : Promise.resolve(),
    ]);
    throw err;
  }
}

/**
 * Update a banner.
 * If a new image is uploaded, old one is removed.
 *
 * @param {string} id
 * @param {object} data
 * @param {{ image?: string, imagePublicId?: string, mobileImage?: string, mobileImagePublicId?: string }|undefined} newImage
 */
async function updateBanner(id, data, newImage) {
  const banner = await Banner.findById(id);
  if (!banner) throw ApiError.notFound("Banner not found");

  if (data.title !== undefined) banner.title = data.title;
  if (data.subtitle !== undefined) banner.subtitle = data.subtitle;
  if (data.buttonText !== undefined) banner.buttonText = data.buttonText;
  if (data.buttonLink !== undefined) banner.buttonLink = data.buttonLink;
  if (data.position !== undefined) banner.position = data.position;
  if (data.isActive !== undefined) banner.isActive = data.isActive;
  if (data.sortOrder !== undefined) banner.sortOrder = data.sortOrder;

  const oldImagesToDelete = [];
  if (newImage?.image) {
    oldImagesToDelete.push(banner.imagePublicId || banner.image);
    banner.image = newImage.image;
    banner.imagePublicId = newImage.imagePublicId || "";
  }
  if (newImage?.mobileImage) {
    oldImagesToDelete.push(banner.mobileImagePublicId || banner.mobileImage);
    banner.mobileImage = newImage.mobileImage;
    banner.mobileImagePublicId = newImage.mobileImagePublicId || "";
  }

  try {
    await banner.save();
  } catch (err) {
    await Promise.all([
      newImage?.imagePublicId ? deleteImageBestEffort(newImage.imagePublicId) : Promise.resolve(),
      newImage?.mobileImagePublicId ? deleteImageBestEffort(newImage.mobileImagePublicId) : Promise.resolve(),
    ]);
    throw err;
  }

  await Promise.all(oldImagesToDelete.map(deleteImageBestEffort));

  return withImageUrl(banner);
}

/**
 * Delete a banner + its image file.
 */
async function deleteBanner(id) {
  const banner = await Banner.findById(id);
  if (!banner) throw ApiError.notFound("Banner not found");

  await Promise.all([
    deleteImageBestEffort(banner.imagePublicId || banner.image),
    deleteImageBestEffort(banner.mobileImagePublicId || banner.mobileImage),
  ]);

  await banner.deleteOne();
  return { _id: id };
}

module.exports = {
  listBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
};
