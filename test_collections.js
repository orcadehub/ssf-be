const { query } = require('./db');
async function test() {
  try {
    const res = await query('SELECT * FROM finance_collections');
    console.log(res.rows);
  } catch (e) { console.error(e); }
  process.exit(0);
}
test();
