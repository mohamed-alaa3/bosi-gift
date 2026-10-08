const Address = require("../models/Address");
const ApiError = require("../utils/ApiError");

/**
 * Ensure only one address is marked as default per user.
 */
async function unsetOtherDefaults(userId, exceptId = null) {
  const filter = { user: userId, isDefault: true };
  if (exceptId) filter._id = { $ne: exceptId };
  await Address.updateMany(filter, { $set: { isDefault: false } });
}

/**
 * List all addresses for a user.
 * Sorted: default first, then newest.
 */
async function listAddresses(userId) {
  return Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });
}

/**
 * Get one address by id — must belong to the user.
 */
async function getAddressById(userId, addressId) {
  const address = await Address.findOne({ _id: addressId, user: userId });
  if (!address) throw ApiError.notFound("Address not found");
  return address;
}

/**
 * Create a new address.
 * If it's the first address, force isDefault = true.
 * If isDefault = true, unset others.
 */
async function createAddress(userId, data) {
  const count = await Address.countDocuments({ user: userId });
  const isFirst = count === 0;
  const isDefault = isFirst ? true : !!data.isDefault;

  if (isDefault) {
    await unsetOtherDefaults(userId);
  }

  const address = await Address.create({
    user: userId,
    fullName: data.fullName,
    phone: data.phone,
    country: data.country,
    city: data.city,
    area: data.area || "",
    street: data.street,
    building: data.building || "",
    apartment: data.apartment || "",
    postalCode: data.postalCode || "",
    isDefault,
  });

  return address;
}

/**
 * Update an existing address.
 * If isDefault toggles to true, unset others.
 */
async function updateAddress(userId, addressId, data) {
  const address = await Address.findOne({ _id: addressId, user: userId });
  if (!address) throw ApiError.notFound("Address not found");

  if (data.fullName !== undefined) address.fullName = data.fullName;
  if (data.phone !== undefined) address.phone = data.phone;
  if (data.country !== undefined) address.country = data.country;
  if (data.city !== undefined) address.city = data.city;
  if (data.area !== undefined) address.area = data.area;
  if (data.street !== undefined) address.street = data.street;
  if (data.building !== undefined) address.building = data.building;
  if (data.apartment !== undefined) address.apartment = data.apartment;
  if (data.postalCode !== undefined) address.postalCode = data.postalCode;

  if (data.isDefault === true) {
    await unsetOtherDefaults(userId, address._id);
    address.isDefault = true;
  } else if (data.isDefault === false) {
    // Do not allow removing default if it's the only address
    const count = await Address.countDocuments({ user: userId });
    if (count > 1) address.isDefault = false;
  }

  await address.save();
  return address;
}

/**
 * Delete an address.
 * If it was the default, promote the newest remaining to default.
 */
async function deleteAddress(userId, addressId) {
  const address = await Address.findOne({ _id: addressId, user: userId });
  if (!address) throw ApiError.notFound("Address not found");

  const wasDefault = address.isDefault;
  await address.deleteOne();

  if (wasDefault) {
    const next = await Address.findOne({ user: userId }).sort({
      createdAt: -1,
    });
    if (next) {
      next.isDefault = true;
      await next.save();
    }
  }

  return { _id: addressId };
}

/**
 * Set a specific address as default.
 */
async function setDefaultAddress(userId, addressId) {
  const address = await Address.findOne({ _id: addressId, user: userId });
  if (!address) throw ApiError.notFound("Address not found");

  await unsetOtherDefaults(userId, address._id);
  address.isDefault = true;
  await address.save();

  return address;
}

module.exports = {
  listAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
