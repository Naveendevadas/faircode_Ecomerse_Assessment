const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    image: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['In Stock', 'Out Of Stock'],
      default: 'In Stock',
    },
    flashSale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FlashSale',
      default: null,
    },
  },
  { timestamps: true }
);

productSchema.pre('save', function (next) {
  this.status = this.quantity > 0 ? 'In Stock' : 'Out Of Stock';
  next();
});

module.exports = mongoose.model('Product', productSchema);