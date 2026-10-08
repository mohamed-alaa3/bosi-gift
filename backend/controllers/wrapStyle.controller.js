const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const wrapStyleService = require("../services/wrapStyle.service");
const cloudinaryService = require("../services/cloudinary.service");
const { CLOUDINARY_FOLDERS } = require("../config/cloudinary");

async function uploadWrapStyleImageToCloudinary(file) {
  if (!file) return { image: "", imagePublicId: "" };

  const { secure_url, public_id } = await cloudinaryService.uploadBuffer(
    file.buffer,
    CLOUDINARY_FOLDERS.wrapStyles,
  );
  return { image: secure_url, imagePublicId: public_id };
}

const list = asyncHandler(async (req, res) => {
  const includeInactive =
    req.user?.role === "admin" && req.query.includeInactive === "true";
  const data = await wrapStyleService.listWrapStyles({ includeInactive });
  return ok(res, data);
});

const getOne = asyncHandler(async (req, res) => {
  const data = await wrapStyleService.getWrapStyleById(req.params.id);
  return ok(res, data);
});

const create = asyncHandler(async (req, res) => {
  const { image, imagePublicId } = await uploadWrapStyleImageToCloudinary(
    req.file,
  );
  const data = await wrapStyleService.createWrapStyle(
    {
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      isActive: req.body.isActive,
      sortOrder: req.body.sortOrder,
    },
    { image, imagePublicId },
  );
  return ok(res, data, undefined, 201);
});

const update = asyncHandler(async (req, res) => {
  const newImage = req.file
    ? await uploadWrapStyleImageToCloudinary(req.file)
    : undefined;
  const data = await wrapStyleService.updateWrapStyle(
    req.params.id,
    req.body,
    newImage,
  );
  return ok(res, data);
});

const remove = asyncHandler(async (req, res) => {
  const data = await wrapStyleService.deleteWrapStyle(req.params.id);
  return ok(res, data);
});

module.exports = { list, getOne, create, update, remove };
