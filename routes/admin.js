// routes/admin.js
const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const auth    = require('../middleware/auth');

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD)
    return res.status(401).json({ error: 'Wrong username or password' });

  const token = jwt.sign({ username, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.json({ token });
});

// GET /api/admin/verify  — frontend calls this to check stored token is still valid
router.get('/verify', auth, (req, res) => res.json({ ok: true }));

module.exports = router;
