const { query } = require('./db');

const initDatabase = async () => {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS finance_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'worker')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createCustomersTable = `
    CREATE TABLE IF NOT EXISTS finance_customers (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL CHECK (type IN ('Satya', 'Dharma', 'Shanti', 'Prema')),
      mobile VARCHAR(20),
      email VARCHAR(255),
      address TEXT,
      adhar VARCHAR(20),
      pan VARCHAR(20),
      amount_given NUMERIC(10, 2) NOT NULL,
      interest_amount NUMERIC(10, 2) NOT NULL,
      total_due NUMERIC(10, 2) NOT NULL,
      total_paid NUMERIC(10, 2) DEFAULT 0,
      outstanding NUMERIC(10, 2) NOT NULL,
      created_by UUID REFERENCES finance_users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createCollectionsTable = `
    CREATE TABLE IF NOT EXISTS finance_collections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id VARCHAR(20) REFERENCES finance_customers(id),
      worker_id UUID REFERENCES finance_users(id),
      amount NUMERIC(10, 2) NOT NULL,
      collection_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await query(createUsersTable);
    await query(createCustomersTable);
    await query(createCollectionsTable);
    console.log('Database tables verified/created successfully.');
  } catch (err) {
    console.error('Error creating tables:', err.message);
  }
};

module.exports = initDatabase;
