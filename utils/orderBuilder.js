const Cart = require('../models/Cart');
const FlashSale = require('../models/FlashSale');

// Returns the price that should actually be charged for this product right
// now: if there's an active flash sale for it, apply that sale's
// discountPercent to the product's CURRENT price; otherwise the product's
// normal price.
//
// 🔧 FIX: this previously read back `entry.salePrice` — a value computed
// once and cached on the FlashSale document at the moment the sale was
// created (see createFlashSale: `product.price - product.price * pct/100`,
// stored permanently). If the product's price was ever edited afterward
// (e.g. correcting a typo), that cached salePrice went stale — still based
// on the OLD price — while the checkout page recalculates the discount
// live from the CURRENT price and showed the correct number. That's why
// the on-screen total was right but the Razorpay charge was wrong (and, in
// this case, way too high, because the price had been corrected downward
// after the sale was created).
//
// Now we only trust the stored discountPercent (the thing the admin
// actually configured) and always apply it to product.price as it stands
// right now — so it can never drift out of sync with a later price edit.
const getEffectivePrice = async (product) => {
  const now = new Date();

  const flashSale = await FlashSale.findOne({
    isActive: true,
    startTime: { $lte: now },
    endTime: { $gte: now },
    'products.product': product._id,
  }).lean();

  if (!flashSale) return product.price;

  const entry = flashSale.products.find(
    (p) => p.product.toString() === product._id.toString()
  );

  if (!entry) return product.price;

  const discounted = product.price - (product.price * entry.discountPercent) / 100;
  return Math.round(discounted);
};

// Loads the user's cart and builds the order line items + total using each
// product's EFFECTIVE price. Validates stock/availability but does NOT
// deduct stock — callers that actually create the order own that step so
// it stays atomic with the order-creation itself.
const buildOrderFromCart = async (userId) => {
  const cart = await Cart.findOne({ userId }).populate('items.product');

  if (!cart || cart.items.length === 0) {
    const error = new Error('Cart is empty');
    error.statusCode = 400;
    throw error;
  }

  let totalAmount = 0;
  const orderProducts = [];

  for (const item of cart.items) {
    const product = item.product;

    if (!product) {
      const error = new Error('A product in your cart no longer exists');
      error.statusCode = 404;
      throw error;
    }

    if (product.status === 'Out Of Stock') {
      const error = new Error(`${product.name} is out of stock`);
      error.statusCode = 400;
      throw error;
    }

    if (item.quantity > product.quantity) {
      const error = new Error(`Only ${product.quantity} units available for ${product.name}`);
      error.statusCode = 400;
      throw error;
    }

    const effectivePrice = await getEffectivePrice(product);
    totalAmount += effectivePrice * item.quantity;

    orderProducts.push({
      product: product._id,
      name: product.name,
      price: effectivePrice, // ← flash-sale-aware price, computed server-side
      quantity: item.quantity,
    });
  }

  return { cart, orderProducts, totalAmount };
};

module.exports = { getEffectivePrice, buildOrderFromCart };