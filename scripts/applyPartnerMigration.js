import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.join(scriptDir, '..', 'db', 'migrations', '004_partner_program.sql');
const connectionString = String(process.env.DATABASE_URL || '').trim();

if (!connectionString) {
  console.error('DATABASE_URL is required. No database connection was attempted.');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const prerequisites = ['stores', 'affiliates', 'orders', 'affiliate_commissions', 'system_settings'];

try {
  const client = await pool.connect();
  try {
    const missing = await client.query(
      `SELECT relation_name
         FROM unnest($1::text[]) AS required(relation_name)
        WHERE to_regclass(relation_name) IS NULL`,
      [prerequisites],
    );
    if (missing.rows.length > 0) {
      throw new Error(
        `Cannot apply the partner migration; required tables are missing: ${missing.rows.map((row) => row.relation_name).join(', ')}. `
        + 'Apply the base schema and affiliate migrations to this database first.',
      );
    }

    await client.query(await fs.readFile(migrationPath, 'utf8'));

    const result = await client.query(
      `SELECT name
         FROM unnest($1::text[]) AS expected(name)
        WHERE to_regclass(name) IS NOT NULL`,
      [['partners', 'partner_network', 'partner_ledgers', 'partner_payouts']],
    );
    if (result.rows.length !== 4) {
      throw new Error('Partner migration ran, but one or more partner tables could not be verified.');
    }
    console.log('Partner migration applied and verified: partners, partner_network, partner_ledgers, partner_payouts.');
  } finally {
    client.release();
  }
} catch (error) {
  console.error('Partner migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
