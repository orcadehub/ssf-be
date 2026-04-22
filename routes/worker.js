const express = require('express');
const { query } = require('../db');
const { auth } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const router = express.Router();

router.use(auth); // Workers and Admins can access worker routes (maybe only worker? I'll allow both but focus on worker)

// Get all customers for collection
router.get('/customers', async (req, res) => {
  try {
    const result = await query('SELECT * FROM finance_customers ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a collection
router.post('/collect', async (req, res) => {
  const { customer_id, amount, password } = req.body;
  const worker_id = req.user.id;

  try {
    if (!password) {
      return res.status(400).json({ message: 'Password is required to confirm collection' });
    }

    const workerResult = await query('SELECT password FROM finance_users WHERE id = $1', [worker_id]);
    const worker = workerResult.rows[0];
    const isMatch = await bcrypt.compare(password, worker.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    // 1. Get current customer stats
    const custResult = await query('SELECT * FROM finance_customers WHERE id = $1', [customer_id]);
    if (custResult.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const customer = custResult.rows[0];
    const amountVal = parseFloat(amount);
    const outstandingVal = parseFloat(customer.outstanding);

    if (amountVal <= 0) {
      return res.status(400).json({ message: 'Collection amount must be positive' });
    }

    if (amountVal > outstandingVal) {
      return res.status(400).json({ message: 'Cannot collect more than the outstanding balance' });
    }

    const new_total_paid = parseFloat(customer.total_paid) + amountVal;
    const new_outstanding = parseFloat(customer.total_due) - new_total_paid;

    // 2. Insert collection record
    await query(
      'INSERT INTO finance_collections (customer_id, worker_id, amount) VALUES ($1, $2, $3)',
      [customer_id, worker_id, amountVal]
    );

    // 3. Update customer
    const updateResult = await query(
      'UPDATE finance_customers SET total_paid = $1, outstanding = $2 WHERE id = $3 RETURNING *',
      [new_total_paid, new_outstanding, customer_id]
    );

    res.json(updateResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// View worker's own collections
router.get('/my-collections', async (req, res) => {
  try {
     const result = await query(`
      SELECT c.*, cu.name as customer_name, cu.type as customer_type 
      FROM finance_collections c 
      JOIN finance_customers cu ON c.customer_id = cu.id 
      WHERE c.worker_id = $1
      ORDER BY c.collection_date DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// View all collections
router.get('/collections', async (req, res) => {
  try {
     const result = await query(`
      SELECT c.*, u.username as worker_name, cu.name as customer_name, cu.type as customer_type
      FROM finance_collections c 
      JOIN finance_users u ON c.worker_id = u.id 
      JOIN finance_customers cu ON c.customer_id = cu.id
      ORDER BY c.collection_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/collections/:customer_id', async (req, res) => {
  try {
    const result = await query(`
      SELECT c.*, u.username as worker_name 
      FROM finance_collections c 
      JOIN finance_users u ON c.worker_id = u.id 
      WHERE c.customer_id = $1 
      ORDER BY c.collection_date DESC
    `, [req.params.customer_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});
module.exports = router;
