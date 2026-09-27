/**
 * Temporary READ-ONLY probe of the configured database: does a platform
 * administrator exist, and is the schema current? Prints no credentials and no
 * password hashes. This answers "why does admin login return 401" without
 * changing anything.
 */
import dotenv from 'dotenv';
dotenv.config();

import { query, pool } from '../config/database.js';

async function main() {
  try {
    const { rows } = await query(
      'SELECT id, email, name, created_at, last_login_at FROM platform_admins ORDER BY created_at',
    );
    console.log(`platform_admins rows: ${rows.length}`);
    for (const row of rows) {
      console.log(`  - ${row.email}  name=${row.name || '-'}  created=${row.created_at}`
        + `  lastLogin=${row.last_login_at || 'never'}`);
    }
    if (rows.length === 0) console.log('  >> NO ADMINISTRATOR EXISTS in this database.');
  } catch (err) {
    console.log('platform_admins : FAILED -', err.message, err.code || '');
  }

  try {
    const { rows } = await query('SELECT checksum, applied_at FROM schema_state WHERE id = 1');
    console.log('\nschema_state    :', rows[0] ? `applied ${rows[0].applied_at}` : 'no row (schema never applied)');
  } catch (err) {
    console.log('\nschema_state    : FAILED -', err.message);
  }

  // The login handler writes last_login_at, so that column must exist or a
  // correct password would still fail with a 500.
  try {
    await query('SELECT last_login_at, last_login_ip FROM platform_admins LIMIT 1');
    console.log('last_login cols : present (login will work once the password matches)');
  } catch (err) {
    console.log('last_login cols : MISSING - run `npm run db:migrate` before signing in', err.code || '');
  }

  try {
    const { rows } = await query('SELECT COUNT(*)::int AS n FROM admin_audit_log');
    console.log('admin_audit_log :', rows[0]?.n ?? 0, 'entries');
  } catch (err) {
    console.log('admin_audit_log : not present -', err.code || err.message);
  }
}

main().catch((err) => console.error('probe failed:', err.message))
  .finally(() => pool.end());
