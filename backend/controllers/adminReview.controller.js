const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const reviewService = require("../services/review.service");

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await reviewService.adminList(req.query);
  return ok(res, items, meta);
});

const create = asyncHandler(async (req, res) => ok(res, await reviewService.adminCreate(req.body), undefined, 201));

const update = asyncHandler(async (req, res) => ok(res, await reviewService.adminUpdate(req.params.id, req.body)));

const remove = asyncHandler(async (req, res) => ok(res, await reviewService.adminDelete(req.params.id)));

module.exports = { list, create, update, remove };
