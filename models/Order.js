const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },

        // 🔧 NEW: each item now carries its OWN status, independent of the
        // other items in the same order. This is what actually lets you
        // cancel/ship one product (e.g. the iPhone) while another (the
        // MacBook) stays processing/paid in the same order.
        orderStatus: {
          type: String,
          enum: ['processing', 'shipped', 'delivered', 'cancelled'],
          default: 'processing',
        },
        paymentStatus: {
          type: String,
          enum: ['pending', 'paid', 'failed', 'refunded'],
          default: 'pending',
        },

        // Per-item cancellation request state
        cancellationRequested: {
          type: Boolean,
          default: false,
        },
        cancellationReason: {
          type: String,
          default: '',
        },
        cancellationRequestedAt: {
          type: Date,
          default: null,
        },
        cancellationDecision: {
          type: String,
          enum: ['approved', 'rejected', null],
          default: null,
        },
      },
    ],
    address: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Address',
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'cod'],
      required: true,
    },
    // ── Order-level fields kept as an OVERALL summary (e.g. for order
    // lists/emails) — but the per-item fields above are now the source of
    // truth for what's actually happening to each product.
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    orderStatus: {
      type: String,
      enum: ['processing', 'shipped', 'delivered', 'cancelled'],
      default: 'processing',
    },
    razorpayOrderId: {
      type: String,
      default: '',
    },
    razorpayPaymentId: {
      type: String,
      default: '',
    },

    cancellationRequested: {
      type: Boolean,
      default: false,
    },
    cancellationReason: {
      type: String,
      default: '',
    },
    cancellationRequestedAt: {
      type: Date,
      default: null,
    },
    cancellationDecision: {
      type: String,
      enum: ['approved', 'rejected', null],
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);