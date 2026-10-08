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
 * @param {{ image: string, imagePublicId: string }} imagePayload
 */
async function createBanner(data, imagePayload) {
  const image = imagePayload?.image || "";
  const imagePublicId = imagePayload?.imagePublicId || "";

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
      isActive: data.isActive !== undefined ? data.isActive : true,
      sortOrder: data.sortOrder || 0,
    });
    return withImageUrl(banner);
  } catch (err) {
    if (imagePublicId) {
      await deleteImageBestEffort(imagePublicId);
    }
    throw err;
  }
}

/**
 * Update a banner.
 * If a new image is uploaded, old one is removed.
 *
 * @param {string} id
 * @param {object} data
 * @param {{ image: string, imagePublicId: string }|undefined} newImage
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

  if (newImage && newImage.image) {
    const oldImage = banner.image;
    banner.image = newImage.image;
    banner.imagePublicId = newImage.imagePublicId || "";

    await deleteImageBestEffort(oldImage);
  }

  try {
    await banner.save();
  } catch (err) {
    if (newImage && newImage.imagePublicId) {
      await deleteImageBestEffort(newImage.imagePublicId);
    }
    throw err;
  }

  return withImageUrl(banner);
}

/**
 * Delete a banner + its image file.
 */
async function deleteBanner(id) {
  const banner = await Banner.findById(id);
  if (!banner) throw ApiError.notFound("Banner not found");

  if (banner.image) {
    await deleteImageBestEffort(banner.image);
  }

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
