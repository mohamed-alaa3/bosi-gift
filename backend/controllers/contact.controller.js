const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const contactService = require("../services/contact.service");

/**
 * POST /api/contact  (public)
 */
const create = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;
  const data = await contactService.createMessage({
    name,
    email,
    subject,
    message,
  });

  return ok(
    res,
    {
      _id: data._id,
      message: "Your message has been received. We will get back to you soon.",
    },
    undefined,
    201,
  );
});

/**
 * GET /api/contact  (admin)
 */
const list = asyncHandler(async (req, res) => {
  const { items, meta } = await contactService.listMessages(req.query);
  return ok(res, items, meta);
});

/**
 * GET /api/contact/:id  (admin)
 */
const getOne = asyncHandler(async (req, res) => {
  const data = await contactService.getMessageById(req.params.id);
  return ok(res, data);
});

/**
 * PATCH /api/contact/:id  (admin) — update status
 */
const updateStatus = asyncHandler(async (req, res) => {
  const data = await contactService.setMessageStatus(
    req.params.id,
    req.body.status,
  );
  return ok(res, data);
});

/**
 * DELETE /api/contact/:id  (admin)
 */
const remove = asyncHandler(async (req, res) => {
  const data = await contactService.deleteMessage(req.params.id);
  return ok(res, data);
});

module.exports = { create, list, getOne, updateStatus, remove };
