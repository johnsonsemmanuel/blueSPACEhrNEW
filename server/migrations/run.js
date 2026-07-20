const pool = require('../config/database');

const migrations = [
  {
    name: 'add_next_of_kin_to_employees',
    sql: `ALTER TABLE employees
            ADD COLUMN IF NOT EXISTS next_of_kin_name varchar(191) DEFAULT NULL AFTER address,
            ADD COLUMN IF NOT EXISTS next_of_kin_phone varchar(191) DEFAULT NULL AFTER next_of_kin_name,
            ADD COLUMN IF NOT EXISTS next_of_kin_relationship varchar(191) DEFAULT NULL AFTER next_of_kin_phone`,
  },
  {
    name: 'add_force_password_change_to_users',
    sql: `ALTER TABLE users
            ADD COLUMN IF NOT EXISTS force_password_change tinyint(1) DEFAULT 0 AFTER is_enable_login`,
  },
  {
    name: 'add_leave_handover_columns',
    sql: `ALTER TABLE leaves
            ADD COLUMN IF NOT EXISTS handover_to int DEFAULT NULL AFTER leave_reason,
            ADD COLUMN IF NOT EXISTS handover_notes text AFTER handover_to,
            ADD COLUMN IF NOT EXISTS contact_during_leave varchar(50) DEFAULT NULL AFTER handover_notes,
            ADD COLUMN IF NOT EXISTS leave_address text AFTER contact_during_leave,
            ADD COLUMN IF NOT EXISTS is_half_day tinyint(1) DEFAULT '0' AFTER leave_address`,
  },
];

async function runMigrations() {
  console.log('Running database migrations...');

  for (const migration of migrations) {
    try {
      await pool.query(migration.sql);
      console.log(`  [OK] ${migration.name}`);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log(`  [SKIP] ${migration.name} (columns already exist)`);
      } else {
        console.error(`  [FAIL] ${migration.name}:`, err.message);
      }
    }
  }

  console.log('Migrations complete.');
}

module.exports = runMigrations;
