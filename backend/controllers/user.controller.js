const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const userService = require("../services/user.service");

/** GET /api/admin/users */
const list = asyncHandler(async (req, res) => {
  const { items, meta } = await userService.listUsers(req.query);
  return ok(res, items, meta);
});

/** PATCH /api/admin/users/:id/status  { isActive } */
const setStatus = asyncHandler(async (req, res) => {
  const data = await userService.setUserStatus(
    req.user,
    req.params.id,
    req.body.isActive,
  );
  return ok(res, data);
});

/** DELETE /api/admin/users/:id */
const remove = asyncHandler(async (req, res) => {
  const data = await userService.deleteUser(req.user, req.params.id);
  return ok(res, data);
});

module.exports = { list, setStatus, remove };
