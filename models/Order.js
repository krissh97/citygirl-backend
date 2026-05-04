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
    sareeId:  mongoose.Schema.Types.ObjectId,
    sku:      String,
    name:     String,
    type:     String,
    color:    String,
    size:     String,
    price:    Number,
    qty:      Number,
    subtotal: Number,
    imageUrl: String,
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
