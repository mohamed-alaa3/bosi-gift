const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const giftBoxService = require("../services/giftBox.service");
const cloudinaryService = require("../services/cloudinary.service");
const { CLOUDINARY_FOLDERS } = require("../config/cloudinary");

async function uploadGiftBoxImageToCloudinary(file) {
  if (!file) return { image: "", imagePublicId: "" };

  const { secure_url, public_id } = await cloudinaryService.uploadBuffer(
    file.buffer,
    CLOUDINARY_FOLDERS.giftBoxes,
  );
  return { image: secure_url, imagePublicId: public_id };
}

const list = asyncHandler(async (req, res) => {
  const includeInactive =
    req.user?.role === "admin" && req.query.includeInactive === "true";
  const data = await giftBoxService.listGiftBoxes({ includeInactive });
  return ok(res, data);
});

const getOne = asyncHandler(async (req, res) => {
  const data = await giftBoxService.getGiftBoxById(req.params.id);
  return ok(res, data);
});

const create = asyncHandler(async (req, res) => {
  const { image, imagePublicId } = await uploadGiftBoxImageToCloudinary(
    req.file,
  );
  const data = await giftBoxService.createGiftBox(
    {
      name: req.body.name,
      description: req.body.description,
      basePrice: req.body.basePrice,
      capacity: req.body.capacity,
      isActive: req.body.isActive,
      sortOrder: req.body.sortOrder,
    },
    { image, imagePublicId },
  );
  return ok(res, data, undefined, 201);
});

const update = asyncHandler(async (req, res) => {
  const newImage = req.file
    ? await uploadGiftBoxImageToCloudinary(req.file)
    : undefined;
  const data = await giftBoxService.updateGiftBox(
    req.params.id,
    req.body,
    newImage,
  );
  return ok(res, data);
});

const remove = asyncHandler(async (req, res) => {
  const data = await giftBoxService.deleteGiftBox(req.params.id);
  return ok(res, data);
});

module.exports = { list, getOne, create, update, remove };
