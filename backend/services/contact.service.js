const ContactMessage = require("../models/ContactMessage");
const ApiError = require("../utils/ApiError");

/**
 * Create a new contact message (public).
 */
async function createMessage({ name, email, subject, message }) {
  const doc = await ContactMessage.create({
    name,
    email,
    subject: subject || "",
    message,
    status: "new",
  });
  return doc;
}

/**
 * List all contact messages (admin).
 * Optional status filter.
 */
async function listMessages(query = {}) {
  const filter = {};
  if (query.status) filter.status = query.status;

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    ContactMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ContactMessage.countDocuments(filter),
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
 * Get a single contact message (admin).
 */
async function getMessageById(id) {
  const doc = await ContactMessage.findById(id);
  if (!doc) throw ApiError.notFound("Contact message not found");
  return doc;
}

/**
 * Update contact message status (admin).
 */
async function setMessageStatus(id, status) {
  const doc = await ContactMessage.findById(id);
  if (!doc) throw ApiError.notFound("Contact message not found");

  doc.status = status;
  await doc.save();
  return doc;
}

/**
 * Delete a contact message (admin).
 */
async function deleteMessage(id) {
  const doc = await ContactMessage.findById(id);
  if (!doc) throw ApiError.notFound("Contact message not found");

  await doc.deleteOne();
  return { _id: id };
}

module.exports = {
  createMessage,
  listMessages,
  getMessageById,
  setMessageStatus,
  deleteMessage,
};
