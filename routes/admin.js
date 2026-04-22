const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { auth, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all admin routes
router.use(auth, restrictTo('admin'));

// --- Worker Management ---

router.post('/workers', async (req, res) => {
  const { username, password } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await query(
      'INSERT INTO finance_users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role, created_at',
      [username, hashedPassword, 'worker']
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // Unique violation
      return res.status(400).json({ message: 'Username already exists' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/workers', async (req, res) => {
  try {
    const result = await query('SELECT id, username, role, created_at FROM finance_users WHERE role = $1 ORDER BY created_at DESC', ['worker']);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Customer Management ---

const typePrefix = {
  'Satya': 'S',
  'Dharma': 'D',
  'Shanti': 'H',
  'Prema': 'P'
};

router.post('/customers', async (req, res) => {
  const { name, type, amount_given, interest_amount, mobile, email, address, adhar, pan } = req.body;
  
  if (!typePrefix[type]) {
    return res.status(400).json({ message: 'Invalid customer type' });
  }

  try {
    const total_due = parseFloat(amount_given) + parseFloat(interest_amount);
    
    // Generate inner_id
    const highestIdResult = await query(
      `SELECT COALESCE(MAX(cast(substring(id from 2) as integer)), 0) + 1 as next_id FROM finance_customers WHERE type = $1`,
      [type]
    );
    const next_idNum = highestIdResult.rows[0].next_id;
    const newId = `${typePrefix[type]}${next_idNum}`;

    const result = await query(
      `INSERT INTO finance_customers 
       (id, name, type, amount_given, interest_amount, total_due, total_paid, outstanding, created_by, mobile, email, address, adhar, pan) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [newId, name, type, amount_given, interest_amount, total_due, 0, total_due, req.user.id, mobile, email, address, adhar, pan]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/customers', async (req, res) => {
  try {
    const result = await query('SELECT * FROM finance_customers ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
