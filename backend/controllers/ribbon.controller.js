const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const ribbonService = require("../services/ribbon.service");
const cloudinaryService = require("../services/cloudinary.service");
const { CLOUDINARY_FOLDERS } = require("../config/cloudinary");

async function uploadRibbonImageToCloudinary(file) {
  if (!file) return { image: "", imagePublicId: "" };

  const { secure_url, public_id } = await cloudinaryService.uploadBuffer(
    file.buffer,
    CLOUDINARY_FOLDERS.ribbons,
  );
  return { image: secure_url, imagePublicId: public_id };
}

const list = asyncHandler(async (req, res) => {
  const includeInactive =
    req.user?.role === "admin" && req.query.includeInactive === "true";
  const data = await ribbonService.listRibbons({ includeInactive });
  return ok(res, data);
});

const getOne = asyncHandler(async (req, res) => {
  const data = await ribbonService.getRibbonById(req.params.id);
  return ok(res, data);
});

const create = asyncHandler(async (req, res) => {
  const { image, imagePublicId } = await uploadRibbonImageToCloudinary(
    req.file,
  );
  const data = await ribbonService.createRibbon(
    {
      name: req.body.name,
      color: req.body.color,
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
    ? await uploadRibbonImageToCloudinary(req.file)
    : undefined;
  const data = await ribbonService.updateRibbon(
    req.params.id,
    req.body,
    newImage,
  );
  return ok(res, data);
});

const remove = asyncHandler(async (req, res) => {
  const data = await ribbonService.deleteRibbon(req.params.id);
  return ok(res, data);
});

module.exports = { list, getOne, create, update, remove };
