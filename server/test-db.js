const mysql = require('mysql2/promise');

async function test() {
  for (const pw of ['Possible024237!@', 'Possible024237!!', 'Possible024237@!', 'possible024237!@', '']) {
    try {
      const pool = mysql.createPool({
        host: 'localhost', port: 3306, user: 'root',
        password: pw, database: 'bihlabsc_bluespacehrr',
        waitForConnections: true, connectionLimit: 1
      });
      const conn = await pool.getConnection();
      await conn.ping();
      console.log('SUCCESS with password:', pw);
      const [users] = await conn.query('SELECT id, name, email, type FROM users LIMIT 5');
      console.log('Users:', users);
      conn.release();
      process.exit(0);
    } catch(e) {
      console.log('FAIL:', pw, '-', e.message);
    }
  }
  console.log('No password worked');
  process.exit(1);
}

test();
