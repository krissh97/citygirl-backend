// models/Saree.js
const mongoose = require('mongoose');

// ── Review sub-document ───────────────────────────────────────
const reviewSchema = new mongoose.Schema({
  customerName: { type: String, required: true, trim: true },
  rating:       { type: Number, required: true, min: 1, max: 5 },
  comment:      { type: String, default: '', trim: true },
  createdAt:    { type: Date, default: Date.now },
});

// ── Color variant sub-document ────────────────────────────────
// Each variant is a DIFFERENT colored version of the same saree design.
// They share the same name/type/size but have their own stock, images, price.
const variantSchema = new mongoose.Schema({
  color:     { type: String, required: true, trim: true },
  price:     { type: Number, required: true, min: 0 },
  stock:     { type: Number, required: true, min: 0, default: 0 },
  imageUrls: { type: [String], default: [] },
  videoUrl:  { type: String, default: '' },
  sku:       { type: String, trim: true }, // optional per-variant SKU
});

// ── Main Saree schema ─────────────────────────────────────────
const sareeSchema = new mongoose.Schema({
  sku:           { type: String, required: true, unique: true, trim: true },
  name:          { type: String, required: true, trim: true },
  description:   { type: String, default: '' },
  type:          { type: String, required: true, enum: ['Silk','Cotton','Pattu','Georgette','Linen','Chiffon','Other'] },

  // Primary color (the "main" version of this saree)
  color:         { type: String, required: true, trim: true },
  colors:        { type: [String], default: [] },
  price:         { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, default: null },
  stock:         { type: Number, required: true, min: 0, default: 0 },
  size:          { type: String, default: '5.5m' },
  blouseIncluded:{ type: Boolean, default: false },
  weight:        { type: String, default: '' },

  // Media for the primary color
  imageUrls:     { type: [String], default: [] },
  videoUrl:      { type: String, default: '' },

  // Color variants (other color versions of the same design)
  // e.g. same Kanjivaram saree in Red, Blue, Green
  variants:      { type: [variantSchema], default: [] },

  // Ratings — calculated from reviews
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount:   { type: Number, default: 0 },
  reviews:       { type: [reviewSchema], default: [] },

  isActive:      { type: Boolean, default: true },
  isFeatured:    { type: Boolean, default: false },
  tags:          [{ type: String }],
  sortOrder:     { type: Number, default: 0 },
}, { timestamps: true });

// ── Text search index ─────────────────────────────────────────
sareeSchema.index({ name: 'text', description: 'text', tags: 'text' });

// ── Auto-calculate averageRating when reviews change ──────────
sareeSchema.methods.recalculateRating = function () {
  if (!this.reviews.length) {
    this.averageRating = 0;
    this.reviewCount   = 0;
  } else {
    const sum = this.reviews.reduce((acc, r) => acc + r.rating, 0);
    this.averageRating = Math.round((sum / this.reviews.length) * 10) / 10;
    this.reviewCount   = this.reviews.length;
  }
};

module.exports = mongoose.model('Saree', sareeSchema);
