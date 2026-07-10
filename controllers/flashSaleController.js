const FlashSale = require('../models/FlashSale');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');

// POST /flashsale — Superadmin only
const createFlashSale = asyncHandler(async (req, res) => {
  const { title, description, products, startTime, endTime } = req.body;

  // Calculate sale price for each product
  const saleProducts = [];
  for (const item of products) {
    const product = await Product.findById(item.productId);
    if (!product) {
      const error = new Error(`Product not found: ${item.productId}`);
      error.statusCode = 404;
      throw error;
    }

    const salePrice = product.price - (product.price * item.discountPercent) / 100;

    saleProducts.push({
      product: product._id,
      discountPercent: item.discountPercent,
      salePrice: Math.round(salePrice),
    });
  }

  const flashSale = await FlashSale.create({
    title,
    description: description || '',
    products: saleProducts,
    startTime,
    endTime,
    createdBy: req.user._id,
  });

  // 🔧 FIX: write the flash sale reference back onto each product so
  // `product.flashSale` is truthy and the "🔥 Flash Sale" badge on product
  // cards actually shows up. Previously this was never set.
  const productIds = saleProducts.map((p) => p.product);
  await Product.updateMany(
    { _id: { $in: productIds } },
    { flashSale: flashSale._id }
  );

  res.status(201).json({
    success: true,
    message: 'Flash sale created',
    flashSale,
  });
});

// GET /flashsale — Superadmin only
const getAllFlashSales = asyncHandler(async (req, res) => {
  const flashSales = await FlashSale.find()
    .populate('products.product', 'name price image')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: flashSales.length,
    flashSales,
  });
});

// GET /flashsale/active — Public
const getActiveFlashSales = asyncHandler(async (req, res) => {
  const now = new Date();
  const flashSales = await FlashSale.find({
    isActive: true,
    startTime: { $lte: now },
    endTime: { $gte: now },
  }).populate('products.product', 'name price image status');

  res.status(200).json({
    success: true,
    count: flashSales.length,
    flashSales,
  });
});

// GET /flashsale/:id — Superadmin only
const getFlashSaleById = asyncHandler(async (req, res) => {
  const flashSale = await FlashSale.findById(req.params.id)
    .populate('products.product', 'name price image')
    .populate('createdBy', 'name email');

  if (!flashSale) {
    const error = new Error('Flash sale not found');
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({ success: true, flashSale });
});

// PUT /flashsale/:id — Superadmin only
const updateFlashSale = asyncHandler(async (req, res) => {
  const flashSale = await FlashSale.findById(req.params.id);
  if (!flashSale) {
    const error = new Error('Flash sale not found');
    error.statusCode = 404;
    throw error;
  }

  const { title, description, startTime, endTime, isActive } = req.body;

  if (title)       flashSale.title       = title;
  if (description) flashSale.description = description;
  if (startTime)   flashSale.startTime   = startTime;
  if (endTime)     flashSale.endTime     = endTime;
  if (isActive !== undefined) flashSale.isActive = isActive;

  await flashSale.save();

  // 🔧 FIX: if the sale was just switched off, clear the badge on its
  // products too — otherwise "Flash Sale" keeps showing after deactivation.
  if (isActive === false) {
    const productIds = flashSale.products.map((p) => p.product);
    await Product.updateMany(
      { _id: { $in: productIds }, flashSale: flashSale._id },
      { flashSale: null }
    );
  } else if (isActive === true) {
    const productIds = flashSale.products.map((p) => p.product);
    await Product.updateMany(
      { _id: { $in: productIds } },
      { flashSale: flashSale._id }
    );
  }

  res.status(200).json({
    success: true,
    message: 'Flash sale updated',
    flashSale,
  });
});

// DELETE /flashsale/:id — Superadmin only
const deleteFlashSale = asyncHandler(async (req, res) => {
  const flashSale = await FlashSale.findById(req.params.id);
  if (!flashSale) {
    const error = new Error('Flash sale not found');
    error.statusCode = 404;
    throw error;
  }

  // 🔧 FIX: clear the reference on affected products before deleting the
  // sale — otherwise product.flashSale points at a document that no longer
  // exists, and any populate() on it silently returns null/breaks.
  const productIds = flashSale.products.map((p) => p.product);
  await Product.updateMany(
    { _id: { $in: productIds }, flashSale: flashSale._id },
    { flashSale: null }
  );

  await flashSale.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Flash sale deleted',
  });
});

module.exports = {
  createFlashSale,
  getAllFlashSales,
  getActiveFlashSales,
  getFlashSaleById,
  updateFlashSale,
  deleteFlashSale,
};