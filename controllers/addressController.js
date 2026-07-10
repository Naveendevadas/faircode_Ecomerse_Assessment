const Address = require('../models/Address');
const asyncHandler = require('../utils/asyncHandler');

// GET /addresses
const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ user: req.user._id })
    .populate('user', 'name')
    .sort({ isDefault: -1, createdAt: -1 });

  res.status(200).json({ success: true, data: addresses });
});

// POST /addresses
const addAddress = asyncHandler(async (req, res) => {
  const {
    phone,
    houseNo,
    road,
    landmark,
    city,
    state,
    pincode,
    country,
    type,
  } = req.body;

  const existingCount = await Address.countDocuments({ user: req.user._id });

  let address = await Address.create({
    user: req.user._id,
    phone,
    houseNo,
    road,
    landmark,
    city,
    state,
    pincode,
    country,
    type,
    isDefault: existingCount === 0,
  });

  address = await address.populate('user', 'name');

  res.status(201).json({ success: true, message: 'Address added', data: address });
});

// PUT /addresses/:id
const updateAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, user: req.user._id });

  if (!address) {
    const error = new Error('Address not found');
    error.statusCode = 404;
    throw error;
  }

  const fields = ['phone', 'houseNo', 'road', 'landmark', 'city', 'state', 'pincode', 'country', 'type'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) address[field] = req.body[field];
  });

  await address.save();
  await address.populate('user', 'name');

  res.status(200).json({ success: true, message: 'Address updated', data: address });
});

// DELETE /addresses/:id
const deleteAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, user: req.user._id });

  if (!address) {
    const error = new Error('Address not found');
    error.statusCode = 404;
    throw error;
  }

  const wasDefault = address.isDefault;
  await address.deleteOne();

  if (wasDefault) {
    const next = await Address.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    if (next) {
      next.isDefault = true;
      await next.save();
    }
  }

  res.status(200).json({ success: true, message: 'Address deleted' });
});

// PATCH /addresses/:id/default
const setDefaultAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, user: req.user._id });

  if (!address) {
    const error = new Error('Address not found');
    error.statusCode = 404;
    throw error;
  }

  await Address.updateMany({ user: req.user._id }, { isDefault: false });
  address.isDefault = true;
  await address.save();
  await address.populate('user', 'name');

  res.status(200).json({ success: true, message: 'Default address updated', data: address });
});

module.exports = {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};