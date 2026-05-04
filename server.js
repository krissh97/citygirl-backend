require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const mongoose = require('mongoose');

const app = express();

// ── CORS: allow your Vercel frontend ─────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,          // e.g. https://city-girl-sarees.vercel.app
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // allow Postman / curl (no origin) and listed origins
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── MongoDB ───────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => { console.error('❌ MongoDB failed:', err.message); process.exit(1); });

// ── Routes ────────────────────────────────────────────────────
app.use('/api/admin',  require('./routes/admin'));
app.use('/api/sarees', require('./routes/sarees'));
app.use('/api/orders', require('./routes/orders'));

// ── Health check (Railway uses this) ─────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date() }));

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `${req.method} ${req.path} not found` }));

// ── Error handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀  http://localhost:${PORT}`));
