const Product = require('../models/Product');
const Category = require('../models/Categorymodel');
const asyncHandler = require('../utils/asyncHandler');
const mongoose = require('mongoose'); // ← NEW

// Escape regex special characters so a search term like "10\" TV" or
// "case+cover" doesn't break the RegExp or behave unexpectedly.
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /products — Public
// Supports:
//   ?category=<id>                — NEW: exact category _id filter (used by CategoryPage)
//   ?category=<name>              — exact category name filter (unchanged, still used by
//                                    ProductListPage's client-derived "Shop by Category" badges)
//   ?search=<term>                — backend search, matches product name
//                                    OR category / subcategory / subSubcategory name
//   ?category=<id|name>&search=<term> — both combined
//   ?page=<num>&limit=<num>        — pagination (default page=1, limit=10)
const getAllProducts = asyncHandler(async (req, res) => {
  const filter = {};
  // NEW: collect each condition separately and AND them together at the
  // end, instead of writing straight into filter.$or — category matching
  // and search matching each need their own $or, and a category page that
  // someday adds a search box would otherwise have one silently overwrite
  // the other.
  const andConditions = [];

  if (req.query.category) {
    // If the value is a valid Mongo ObjectId, match it against WHICHEVER
    // level of the hierarchy it belongs to — a product tagged under a
    // subcategory has category = <parent id> and subcategory = <this id>,
    // so a plain `filter.category = id` would never find it when id is
    // actually a subcategory or subSubcategory. This is the path
    // CategoryPage.jsx hits (id comes straight from the clicked
    // category/subcategory chip or breadcrumb link).
    if (mongoose.Types.ObjectId.isValid(req.query.category)) {
      const id = req.query.category;
      andConditions.push({
        $or: [{ category: id }, { subcategory: id }, { subSubcategory: id }],
      });
    } else {
      // Fallback: treat it as a category name (old behavior, still used
      // wherever the app passes a name instead of an id).
      const cat = await Category.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(req.query.category)}$`, 'i') },
      }).lean();
      andConditions.push({ category: cat ? cat._id : null });
    }
  }

  const search = req.query.search?.trim();
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');

    const matchingCategories = await Category.find({ name: regex }).select('_id').lean();
    const categoryIds = matchingCategories.map((c) => c._id);

    andConditions.push({
      $or: [
        { name: regex },
        { category: { $in: categoryIds } },
        { subcategory: { $in: categoryIds } },
        { subSubcategory: { $in: categoryIds } },
      ],
    });
  }

  if (andConditions.length === 1) {
    Object.assign(filter, andConditions[0]);
  } else if (andConditions.length > 1) {
    filter.$and = andConditions;
  }

  // ---- pagination params ----
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit) || 10, 1);
  const skip = (page - 1) * limit;

  // ---- total count for this filter (before pagination) ----
  const totalItems = await Product.countDocuments(filter);
  const totalPages = Math.ceil(totalItems / limit) || 1;

  const products = await Product.find(filter)
    .populate('category', 'name slug')
    .populate('subcategory', 'name slug')
    .populate('subSubcategory', 'name slug')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    success: true,
    count: products.length,     // items in THIS page
    products,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
});

// GET /products/:id — Public
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('category', 'name slug')
    .populate('subcategory', 'name slug')
    .populate('subSubcategory', 'name slug');

  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }
  res.status(200).json({ success: true, product });
});

// POST /products — Admin only
const addProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    price,
    quantity,
    images,
    category,
    subcategory,
    subSubcategory,
    isFeatured,
  } = req.body;

  const product = await Product.create({
    name,
    description,
    price,
    quantity,
    images: images || [],
    category,
    subcategory: subcategory || null,
    subSubcategory: subSubcategory || null,
    isFeatured: isFeatured ?? false,
  });

  res.status(201).json({
    success: true,
    message: 'Product added successfully',
    product,
  });
});

// PUT /products/:id — Admin only
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  const {
    name,
    description,
    price,
    quantity,
    images,
    category,
    subcategory,
    subSubcategory,
    isFeatured,
  } = req.body;

  product.name           = name           ?? product.name;
  product.description    = description    ?? product.description;
  product.price          = price          ?? product.price;
  product.quantity       = quantity       ?? product.quantity;
  product.images         = images         ?? product.images;
  product.category       = category       ?? product.category;
  product.subcategory    = subcategory    ?? product.subcategory;
  product.subSubcategory = subSubcategory ?? product.subSubcategory;
  if (isFeatured !== undefined) product.isFeatured = isFeatured;

  await product.save();

  res.status(200).json({
    success: true,
    message: 'Product updated successfully',
    product,
  });
});

// DELETE /products/:id — Admin only
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  await product.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Product deleted successfully',
  });
});

module.exports = {
  getAllProducts,
  getProductById,
  addProduct, 
  updateProduct,
  deleteProduct,
};