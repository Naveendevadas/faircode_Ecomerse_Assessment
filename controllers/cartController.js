const Cart = require('../models/Cart');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');

// 🔧 FIX: Product schema has `images: [String]`, not a singular `image`
// field. Every populate() below was selecting 'image', which Mongoose
// silently ignores (unknown field names in a projection just get dropped
// instead of throwing), so `product.images` never reached the frontend and
// every cart item fell back to the "No Image" placeholder.
const CART_PRODUCT_FIELDS = 'name price images status';

// GET /cart — Private
const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user._id })
    .populate('items.product', CART_PRODUCT_FIELDS);

  if (!cart) {
    return res.status(200).json({ success: true, cart: { items: [] } });
  }

  res.status(200).json({ success: true, cart });
});

// POST /cart — Private
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  // Check product exists and is in stock
  const product = await Product.findById(productId);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  if (product.status === 'Out Of Stock') {
    const error = new Error('Product is out of stock');
    error.statusCode = 400;
    throw error;
  }

  // NOTE: the single-request check below (`quantity > product.quantity`)
  // only guards a first-time add. If the item is already in the cart, the
  // real check has to be against existing-cart-quantity + new-quantity —
  // see below where itemIndex > -1. This top check still catches the
  // simple "trying to add 10 when only 5 exist" case on a fresh add.
  if (quantity > product.quantity) {
    const error = new Error(`Only ${product.quantity} items available`);
    error.statusCode = 400;
    throw error;
  }

  let cart = await Cart.findOne({ userId: req.user._id });

  if (!cart) {
    // Create new cart
    cart = await Cart.create({
      userId: req.user._id,
      items: [{ product: productId, quantity }],
    });
  } else {
    // Check if product already in cart
    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (itemIndex > -1) {
      // 🔧 FIX: this used to just add the new quantity on top of whatever
      // was already in the cart with no upper bound — clicking "Add to
      // Cart" repeatedly let the cart quantity blow past actual stock,
      // even though each individual click looked valid on its own.
      const newTotalQty = cart.items[itemIndex].quantity + quantity;

      if (newTotalQty > product.quantity) {
        const error = new Error(
          `Only ${product.quantity} available — you already have ${cart.items[itemIndex].quantity} in your cart`
        );
        error.statusCode = 400;
        throw error;
      }

      cart.items[itemIndex].quantity = newTotalQty;
    } else {
      // Add new item
      cart.items.push({ product: productId, quantity });
    }

    await cart.save();
  }

  await cart.populate('items.product', CART_PRODUCT_FIELDS);

  res.status(200).json({
    success: true,
    message: 'Product added to cart',
    cart,
  });
});

// PUT /cart/:productId — Private
const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const { productId } = req.params;

  if (!quantity || quantity < 1) {
    const error = new Error('Quantity must be at least 1');
    error.statusCode = 400;
    throw error;
  }

  // Check stock
  const product = await Product.findById(productId);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  if (quantity > product.quantity) {
    const error = new Error(`Only ${product.quantity} items available`);
    error.statusCode = 400;
    throw error;
  }

  const cart = await Cart.findOne({ userId: req.user._id });
  if (!cart) {
    const error = new Error('Cart not found');
    error.statusCode = 404;
    throw error;
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId
  );

  if (itemIndex === -1) {
    const error = new Error('Product not in cart');
    error.statusCode = 404;
    throw error;
  }

  cart.items[itemIndex].quantity = quantity;
  await cart.save();
  await cart.populate('items.product', CART_PRODUCT_FIELDS);

  res.status(200).json({
    success: true,
    message: 'Cart updated',
    cart,
  });
});

// DELETE /cart/:productId — Private
const removeFromCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user._id });
  if (!cart) {
    const error = new Error('Cart not found');
    error.statusCode = 404;
    throw error;
  }

  cart.items = cart.items.filter(
    (item) => item.product.toString() !== req.params.productId
  );

  await cart.save();
  await cart.populate('items.product', CART_PRODUCT_FIELDS);

  res.status(200).json({
    success: true,
    message: 'Product removed from cart',
    cart,
  });
});

// DELETE /cart — Private
const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user._id });
  if (!cart) {
    return res.status(200).json({ success: true, message: 'Cart already empty' });
  }

  cart.items = [];
  await cart.save();

  res.status(200).json({
    success: true,
    message: 'Cart cleared',
  });
});

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};