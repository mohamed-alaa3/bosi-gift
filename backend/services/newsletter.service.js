const NewsletterSubscriber = require("../models/NewsletterSubscriber");
const ApiError = require("../utils/ApiError");

/**
 * Subscribe an email.
 * Idempotent: if already subscribed:
 *   - if active → return existing with a friendly message
 *   - if inactive → reactivate
 */
async function subscribe(email) {
  let subscriber = await NewsletterSubscriber.findOne({ email });

  if (subscriber) {
    if (!subscriber.isActive) {
      subscriber.isActive = true;
      subscriber.subscribedAt = new Date();
      await subscriber.save();
    }
    return { subscriber, alreadySubscribed: true };
  }

  subscriber = await NewsletterSubscriber.create({ email });
  return { subscriber, alreadySubscribed: false };
}

/**
 * List all subscribers (admin).
 */
async function listSubscribers(query = {}) {
  const filter = {};
  if (query.isActive === "true") filter.isActive = true;
  if (query.isActive === "false") filter.isActive = false;

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(query.limit, 10) || 50));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    NewsletterSubscriber.find(filter)
      .sort({ subscribedAt: -1 })
      .skip(skip)
      .limit(limit),
    NewsletterSubscriber.countDocuments(filter),
  ]);

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Toggle subscription status (admin).
 */
async function setSubscriberStatus(id, isActive) {
  const subscriber = await NewsletterSubscriber.findById(id);
  if (!subscriber) throw ApiError.notFound("Subscriber not found");

  subscriber.isActive = isActive;
  if (isActive) subscriber.subscribedAt = new Date();
  await subscriber.save();

  return subscriber;
}

/**
 * Delete a subscriber (admin).
 */
async function deleteSubscriber(id) {
  const subscriber = await NewsletterSubscriber.findById(id);
  if (!subscriber) throw ApiError.notFound("Subscriber not found");

  await subscriber.deleteOne();
  return { _id: id };
}

module.exports = {
  subscribe,
  listSubscribers,
  setSubscriberStatus,
  deleteSubscriber,
};