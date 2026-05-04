// routes/sarees.js
const express = require('express');
const router  = express.Router();
const Saree   = require('../models/Saree');
const auth    = require('../middleware/auth');
const upload  = require('../middleware/upload');

// ─── PUBLIC ──────────────────────────────────────────────────

// GET /api/sarees  — shop listing with filters
router.get('/', async (req, res) => {
  try {
    const { type, color, minPrice, maxPrice, inStock, featured, search } = req.query;
    const q = { isActive: true };

    if (type)     q.type  = type;
    if (color)    q.color = color;
    if (featured) q.isFeatured = true;
    if (inStock === 'true')  q.stock = { $gt: 0 };
    if (inStock === 'false') q.stock = 0;
    if (minPrice || maxPrice) {
      q.price = {};
      if (minPrice) q.price.$gte = +minPrice;
      if (maxPrice) q.price.$lte = +maxPrice;
    }
    if (search) q.$text = { $search: search };

    const sarees = await Saree.find(q).sort({ sortOrder: 1, createdAt: -1 });
    res.json(sarees);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ADMIN: get all including hidden ─────────────────────────

router.get('/admin/all', auth, async (req, res) => {
  try {
    const sarees = await Saree.find().sort({ sortOrder: 1, createdAt: -1 });
    res.json(sarees);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ADMIN: create saree (text fields only, no images yet) ───

router.post('/', auth, async (req, res) => {
  try {
    const saree = await Saree.create(req.body);
    res.status(201).json(saree);
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ error: `SKU "${req.body.sku}" already exists` });
    res.status(500).json({ error: e.message });
  }
});

// ─── ADMIN: update any saree fields ──────────────────────────

router.put('/:id', auth, async (req, res) => {
  try {
    const saree = await Saree.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!saree) return res.status(404).json({ error: 'Not found' });
    res.json(saree);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ADMIN: upload images → S3, add URLs to saree ────────────

router.post('/:id/images', auth, upload.array('images', 15), async (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ error: 'No files received' });
    const urls   = req.files.map(f => f.location);   // f.location = full S3 URL
    const saree  = await Saree.findByIdAndUpdate(
      req.params.id,
      { $push: { imageUrls: { $each: urls } } },
      { new: true }
    );
    res.json({ imageUrls: saree.imageUrls });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ADMIN: upload video → S3, set URL on saree ──────────────

router.post('/:id/video', auth, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No video received' });
    const saree = await Saree.findByIdAndUpdate(
      req.params.id,
      { videoUrl: req.file.location },
      { new: true }
    );
    res.json({ videoUrl: saree.videoUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ADMIN: remove one image URL from array ───────────────────

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
      req.params.id,
      { stock: Number(req.body.stock) },
      { new: true }
    );
    res.json({ stock: saree.stock });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ADMIN: delete (soft by default, permanent with ?hard=true) 

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
