// routes/sarees.js
const express = require('express');
const router  = express.Router();
const Saree   = require('../models/Saree');
const auth    = require('../middleware/auth');
const upload  = require('../middleware/upload');

// ─── PUBLIC: get all active sarees ───────────────────────────
router.get('/', async (req, res) => {
  try {
    const { type, color, minPrice, maxPrice, inStock, search } = req.query;
    const q = { isActive: true };
    if (type)    q.type  = type;
    if (color)   q.color = color;
    if (inStock === 'true')  q.stock = { $gt: 0 };
    if (inStock === 'false') q.stock = 0;
    if (minPrice || maxPrice) {
      q.price = {};
      if (minPrice) q.price.$gte = +minPrice;
      if (maxPrice) q.price.$lte = +maxPrice;
    }
    if (search) q.$text = { $search: search };

    const sarees = await Saree.find(q)
      .select('-reviews')   // don't send full reviews in listing — saves bandwidth
      .sort({ sortOrder: 1, createdAt: -1 });
    res.json(sarees);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── PUBLIC: get single saree (full detail including reviews) ─
router.get('/:id', async (req, res) => {
  try {
    const saree = await Saree.findById(req.params.id);
    if (!saree || !saree.isActive)
      return res.status(404).json({ error: 'Saree not found' });
    res.json(saree);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── PUBLIC: submit a review ──────────────────────────────────
// POST /api/sarees/:id/reviews
// Body: { customerName, rating, comment }
router.post('/:id/reviews', async (req, res) => {
  try {
    const { customerName, rating, comment } = req.body;
    if (!customerName || !rating)
      return res.status(400).json({ error: 'Name and rating are required' });
    if (rating < 1 || rating > 5)
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });

    const saree = await Saree.findById(req.params.id);
    if (!saree) return res.status(404).json({ error: 'Saree not found' });

    saree.reviews.push({ customerName, rating: Number(rating), comment });
    saree.recalculateRating();
    await saree.save();

    res.status(201).json({
      averageRating: saree.averageRating,
      reviewCount:   saree.reviewCount,
      review:        saree.reviews[saree.reviews.length - 1],
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ADMIN: get all sarees including hidden ───────────────────
router.get('/admin/all', auth, async (req, res) => {
  try {
    const sarees = await Saree.find()
      .select('-reviews')
      .sort({ sortOrder: 1, createdAt: -1 });
    res.json(sarees);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ADMIN: create saree ──────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const saree = await Saree.create(req.body);
    res.status(201).json(saree);
  } catch (e) {
    if (e.code === 11000)
      return res.status(400).json({ error: `SKU "${req.body.sku}" already exists` });
    res.status(500).json({ error: e.message });
  }
});

// ─── ADMIN: update saree ──────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const saree = await Saree.findByIdAndUpdate(
      req.params.id, { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!saree) return res.status(404).json({ error: 'Not found' });
    res.json(saree);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ADMIN: upload images for primary color ───────────────────
router.post('/:id/images', auth, upload.array('images', 15), async (req, res) => {
  try {
    if (!req.files?.length)
      return res.status(400).json({ error: 'No files received' });
    const urls  = req.files.map(f => f.location);
    const saree = await Saree.findByIdAndUpdate(
      req.params.id,
      { $push: { imageUrls: { $each: urls } } },
      { new: true }
    );
    res.json({ imageUrls: saree.imageUrls });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ADMIN: upload video for primary color ────────────────────
router.post('/:id/video', auth, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No video received' });
    const saree = await Saree.findByIdAndUpdate(
      req.params.id, { videoUrl: req.file.location }, { new: true }
    );
    res.json({ videoUrl: saree.videoUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ADMIN: remove one image ──────────────────────────────────
router.delete('/:id/images', auth, async (req, res) => {
  try {
    const saree = await Saree.findByIdAndUpdate(
      req.params.id,
      { $pull: { imageUrls: req.body.url } },
      { new: true }
    );
    res.json({ imageUrls: saree.imageUrls });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ADMIN: quick stock update ────────────────────────────────
router.patch('/:id/stock', auth, async (req, res) => {
  try {
    const saree = await Saree.findByIdAndUpdate(
      req.params.id, { stock: Number(req.body.stock) }, { new: true }
    );
    res.json({ stock: saree.stock });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ADMIN: add a color variant ──────────────────────────────
// POST /api/sarees/:id/variants
// Body: { color, price, stock, sku }
router.post('/:id/variants', auth, async (req, res) => {
  try {
    const saree = await Saree.findByIdAndUpdate(
      req.params.id,
      { $push: { variants: req.body } },
      { new: true }
    );
    res.json(saree.variants);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ADMIN: upload images for a variant ──────────────────────
// POST /api/sarees/:id/variants/:variantId/images
router.post('/:id/variants/:variantId/images', auth, upload.array('images', 15), async (req, res) => {
  try {
    if (!req.files?.length)
      return res.status(400).json({ error: 'No files received' });
    const urls  = req.files.map(f => f.location);
    const saree = await Saree.findOneAndUpdate(
      { _id: req.params.id, 'variants._id': req.params.variantId },
      { $push: { 'variants.$.imageUrls': { $each: urls } } },
      { new: true }
    );
    res.json(saree.variants);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ADMIN: update variant stock ─────────────────────────────
router.patch('/:id/variants/:variantId/stock', auth, async (req, res) => {
  try {
    const saree = await Saree.findOneAndUpdate(
      { _id: req.params.id, 'variants._id': req.params.variantId },
      { $set: { 'variants.$.stock': Number(req.body.stock) } },
      { new: true }
    );
    res.json(saree.variants);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ADMIN: delete a variant ──────────────────────────────────
router.delete('/:id/variants/:variantId', auth, async (req, res) => {
  try {
    const saree = await Saree.findByIdAndUpdate(
      req.params.id,
      { $pull: { variants: { _id: req.params.variantId } } },
      { new: true }
    );
    res.json(saree.variants);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ADMIN: delete a review ───────────────────────────────────
router.delete('/:id/reviews/:reviewId', auth, async (req, res) => {
  try {
    const saree = await Saree.findById(req.params.id);
    if (!saree) return res.status(404).json({ error: 'Not found' });
    saree.reviews = saree.reviews.filter(r => r._id.toString() !== req.params.reviewId);
    saree.recalculateRating();
    await saree.save();
    res.json({ averageRating: saree.averageRating, reviewCount: saree.reviewCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ADMIN: delete saree ──────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.query.hard === 'true') {
      await Saree.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Deleted permanently' });
    }
    await Saree.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Hidden from shop' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
