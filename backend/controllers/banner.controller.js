const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const bannerService = require("../services/banner.service");
const cloudinaryService = require("../services/cloudinary.service");
const { CLOUDINARY_FOLDERS } = require("../config/cloudinary");

async function uploadBannerImageToCloudinary(file) {
  if (!file) return { image: "", imagePublicId: "" };

  const { secure_url, public_id } = await cloudinaryService.uploadBuffer(
    file.buffer,
    CLOUDINARY_FOLDERS.banners,
  );
  return { image: secure_url, imagePublicId: public_id };
}

async function uploadBannerImages(files = {}) {
  const desktopFile = files.image?.[0];
  const mobileFile = files.mobileImage?.[0];
  if (!desktopFile && !mobileFile) return {};

  let desktop = {};
  try {
    if (desktopFile) desktop = await uploadBannerImageToCloudinary(desktopFile);
    const mobile = mobileFile
      ? await uploadBannerImageToCloudinary(mobileFile)
      : {};
    return { ...desktop, ...mobile, mobileImage: mobile.image || "", mobileImagePublicId: mobile.imagePublicId || "" };
  } catch (error) {
    if (desktop.imagePublicId) {
      await cloudinaryService.deleteAsset(desktop.imagePublicId).catch(() => {});
    }
    throw error;
  }
}

/**
 * GET /api/banners?position=hero
 * Public (only active). Admin can pass includeInactive=true.
 */
const list = asyncHandler(async (req, res) => {
  const includeInactive =
    req.user?.role === "admin" && req.query.includeInactive === "true";

  const data = await bannerService.listBanners({
    position: req.query.position,
    includeInactive,
  });
  return ok(res, data);
});

/**
 * GET /api/banners/:id  (admin)
 */
const getOne = asyncHandler(async (req, res) => {
  const data = await bannerService.getBannerById(req.params.id);
  return ok(res, data);
});

/**
 * POST /api/banners  (admin)
 */
const create = asyncHandler(async (req, res) => {
  const imagePayload = await uploadBannerImages(req.files);
  const data = await bannerService.createBanner(req.body, imagePayload);
  return ok(res, data, undefined, 201);
});

/**
 * PATCH /api/banners/:id  (admin)
 */
const update = asyncHandler(async (req, res) => {
  const newImage = await uploadBannerImages(req.files);
  const data = await bannerService.updateBanner(
    req.params.id,
    req.body,
    newImage,
  );
  return ok(res, data);
});

/**
 * DELETE /api/banners/:id  (admin)
 */
const remove = asyncHandler(async (req, res) => {
  const data = await bannerService.deleteBanner(req.params.id);
  return ok(res, data);
});

module.exports = { list, getOne, create, update, remove };
