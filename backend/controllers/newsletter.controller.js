const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const newsletterService = require("../services/newsletter.service");

/**
 * POST /api/newsletter/subscribe  (public)
 */
const subscribe = asyncHandler(async (req, res) => {
  const { subscriber, alreadySubscribed } = await newsletterService.subscribe(
    req.body.email,
  );

  return ok(
    res,
    {
      email: subscriber.email,
      isActive: subscriber.isActive,
      subscribedAt: subscriber.subscribedAt,
    },
    undefined,
    alreadySubscribed ? 200 : 201,
  );
});

/**
 * GET /api/newsletter  (admin)
 */
const list = asyncHandler(async (req, res) => {
  const { items, meta } = await newsletterService.listSubscribers(req.query);
  return ok(res, items, meta);
});

/**
 * PATCH /api/newsletter/:id  (admin)
 */
const update = asyncHandler(async (req, res) => {
  const data = await newsletterService.setSubscriberStatus(
    req.params.id,
    req.body.isActive,
  );
  return ok(res, data);
});

/**
 * DELETE /api/newsletter/:id  (admin)
 */
const remove = asyncHandler(async (req, res) => {
  const data = await newsletterService.deleteSubscriber(req.params.id);
  return ok(res, data);
});

module.exports = { subscribe, list, update, remove };
