// models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId:  { type: String, unique: true, default: () => `CG-${Date.now()}` },
  customer: {
    name:    { type: String, required: true },
    phone:   { type: String, required: true },
    address: { type: String, required: true },
    notes:   { type: String, default: '' },
  },
  items: [{
    sareeId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Saree', required: false },
    sku:      { type: String, default: '' },
    name:     { type: String, default: '' },
    type:     { type: String, default: '' },
    color:    { type: String, default: '' },
    size:     { type: String, default: '' },
    price:    { type: Number, default: 0 },
    qty:      { type: Number, default: 1 },
    subtotal: { type: Number, default: 0 },
    imageUrl: { type: String, default: '' },
  }],
  pricing: {
    subtotal:   Number,
    shipping:   { type: Number, default: 0 },
    grandTotal: Number,
  },
  status: {
    type: String,
    enum: ['pending','confirmed','shipped','delivered','cancelled'],
    default: 'pending',
  },
  paymentStatus: { type: String, enum: ['unpaid','paid','refunded'], default: 'unpaid' },
  paymentId: String,
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
