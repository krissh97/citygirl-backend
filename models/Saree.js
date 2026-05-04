// models/Saree.js
const mongoose = require('mongoose');

const sareeSchema = new mongoose.Schema({
  sku:           { type: String, required: true, unique: true, trim: true },
  name:          { type: String, required: true, trim: true },
  description:   { type: String, default: '' },
  type:          { type: String, required: true, enum: ['Silk','Cotton','Pattu','Georgette','Linen','Chiffon','Other'] },
  color:         { type: String, required: true, trim: true },
  price:         { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, default: null },   // for showing strikethrough price
  stock:         { type: Number, required: true, min: 0, default: 0 },
  size:          { type: String, default: '5.5m' },
  blouseIncluded:{ type: Boolean, default: false },
  weight:        { type: String, default: '' },
  imageUrls:     { type: [String], default: [] },   // S3 URLs — first one is the thumbnail
  videoUrl:      { type: String, default: '' },     // S3 URL
  isActive:      { type: Boolean, default: true },  // false = hidden from shop
  isFeatured:    { type: Boolean, default: false },  // shown on home page
  tags:          [{ type: String }],                // e.g. ["bridal","festive"]
  sortOrder:     { type: Number, default: 0 },      // lower = appears first
}, { timestamps: true });

// Text index for search
sareeSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Saree', sareeSchema);
