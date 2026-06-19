const mongoose = require('mongoose');

const flashSaleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Flash sale title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        discountPercent: {
          type: Number,
          required: true,
          min: 1,
          max: 100,
        },
        salePrice: {
          type: Number,
          required: true,
        },
      },
    ],
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

flashSaleSchema.methods.isExpired = function () {
  return new Date() > this.endTime;
};

module.exports = mongoose.model('FlashSale', flashSaleSchema)