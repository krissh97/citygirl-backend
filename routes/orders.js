// routes/orders.js
const express    = require('express');
const router     = express.Router();
const Order      = require('../models/Order');
const Saree      = require('../models/Saree');
const auth       = require('../middleware/auth');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');

// ─── Email helper ─────────────────────────────────────────────
async function notifySellerByEmail(order) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return; // skip if not configured
  const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  const itemRows = order.items.map(i =>
    `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${i.name}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${i.color} · ${i.type}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${i.qty}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">₹${i.subtotal?.toLocaleString('en-IN')}</td>
    </tr>`
  ).join('');

  await transport.sendMail({
    from:    process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to:      process.env.EMAIL_USER,
    subject: `🛍️ New Order ${order.orderId} — ${order.customer.name}`,
    html: `<div style="font-family:sans-serif;max-width:600px">
      <h2 style="background:#1A0F00;color:#F2DDB4;padding:20px;margin:0">City Girl — New Order</h2>
      <div style="padding:20px">
        <p><strong>Order ID:</strong> ${order.orderId}</p>
        <p><strong>Customer:</strong> ${order.customer.name}</p>
        <p><strong>Phone:</strong> ${order.customer.phone}</p>
        <p><strong>Address:</strong> ${order.customer.address}</p>
        ${order.customer.notes ? `<p><strong>Notes:</strong> ${order.customer.notes}</p>` : ''}
        <table style="width:100%;border-collapse:collapse;margin-top:16px">
          <thead><tr style="background:#FBF5E9">
            <th style="padding:8px;text-align:left">Item</th>
            <th style="padding:8px;text-align:left">Details</th>
            <th style="padding:8px;text-align:left">Qty</th>
            <th style="padding:8px;text-align:left">Amount</th>
          </tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
        <p style="text-align:right;font-size:20px;color:#C9923A;margin-top:16px">
          <strong>Total: ₹${order.pricing?.grandTotal?.toLocaleString('en-IN')}</strong>
        </p>
      </div>
    </div>`,
  });
}

// ─── PUBLIC: place order ──────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { customer, items, pricing } = req.body;

    // Safely cast sareeId strings to ObjectId
    const cleanItems = items.map(item => ({
      ...item,
      sareeId: item.sareeId
        ? mongoose.Types.ObjectId.createFromHexString
          ? new mongoose.Types.ObjectId(item.sareeId)
          : item.sareeId
        : undefined,
    }));

    const order = await Order.create({
      customer,
      items: cleanItems,
      pricing,
    });

    // Deduct stock
    

    notifySellerByEmail(order).catch(e =>
      console.error('Email failed:', e.message)
    );

    res.status(201).json({ success: true, orderId: order.orderId });
  } catch (e) {
    console.error('Order error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── ADMIN: list all orders ───────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 30 } = req.query;
    const q    = status ? { status } : {};
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find(q).sort({ createdAt: -1 }).skip(skip).limit(+limit),
      Order.countDocuments(q),
    ]);
    res.json({ orders, total });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ADMIN: update status ─────────────────────────────────────
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const previousStatus = order.status;

    // Deduct stock only when moving TO confirmed for the first time
    if (status === 'confirmed' && previousStatus !== 'confirmed') {
      for (const item of order.items) {
        if (item.sareeId) {
          await Saree.findByIdAndUpdate(item.sareeId, {
            $inc: { stock: -item.qty },
          });
        }
      }
    }

    // If moving BACK from confirmed to pending, restore stock
    if (status === 'pending' && previousStatus === 'confirmed') {
      for (const item of order.items) {
        if (item.sareeId) {
          await Saree.findByIdAndUpdate(item.sareeId, {
            $inc: { stock: +item.qty },
          });
        }
      }
    }
    if (status === 'cancelled' && previousStatus === 'confirmed') {
      for (const item of order.items) {
        if (item.sareeId) {
          await Saree.findByIdAndUpdate(item.sareeId, {
            $inc: { stock: +item.qty },
          });
        }
      }
    }
    order.status = status;
    await order.save();

    res.json(order);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
