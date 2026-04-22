const { query } = require('./db');
async function test() {
  try {
    const worker_id = '191f8f7d-0908-48d9-a130-422996617f3b'; // using the known worker id
    const sql = `
      SELECT c.*, cu.name as customer_name, cu.type as customer_type 
      FROM finance_collections c 
      JOIN finance_customers cu ON c.customer_id = cu.id 
      WHERE c.worker_id = $1
      ORDER BY c.collection_date DESC
    `;
    const res = await query(sql, [worker_id]);
    console.log(res.rows);
  } catch (e) { console.error(e); }
  process.exit(0);
}
test();
