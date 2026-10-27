// scripts/applyAffiliateMigration.js
// Applies the affiliate program database migration
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __filename = fileURLToPath(import.meta.url);

// Read .env file
const envPath = path.join(__dirname, '..', '.env');
let dbUrl = null;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    if (line.includes('=') && !line.trim().startsWith('#')) {
      const [key, ...rest] = line.split('=');
      const k = key.trim();
      const v = rest.join('=').trim().replace(/^["']|["']$/g, '');
      if (k.toLowerCase().includes('database_url') || k.toLowerCase().includes('postgres_url') || k.toLowerCase().includes('neon')) {
        dbUrl = v;
        console.log(`Found database URL in env var: ${k}`);
        break;
      }
    }
  }
}

// Also check environment variables
if (!dbUrl) {
  dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;
  if (dbUrl) {
    console.log('Found database URL from process.env');
  }
}

if (!dbUrl) {
  console.error('ERROR: No database URL found. Please check your .env file or environment variables.');
  process.exit(1);
}

const migrationPaths = [
  path.join(__dirname, '..', 'db', 'migrations', '001_affiliate_program.sql'),
  path.join(__dirname, '..', 'db', 'migrations', '002_short_affiliate_referral_codes.sql'),
];
for (const migrationPath of migrationPaths) {
  if (!fs.existsSync(migrationPath)) {
    console.error('ERROR: Migration file not found at', migrationPath);
    process.exit(1);
  }
}

// Apply migration
const { Pool } = pg;
const pool = new Pool({ connectionString: dbUrl });

console.log('Connecting to database...');
try {
  for (const migrationPath of migrationPaths) {
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    await pool.query(sqlContent);
    console.log('Migration applied:', path.basename(migrationPath));
  }

  // Verify affiliate tables
  const result = await pool.query("SELECT tablename FROM pg_tables WHERE tablename LIKE 'affiliate%' ORDER BY tablename");
  if (result.rows.length > 0) {
    console.log('\nAffiliate tables in database:');
    result.rows.forEach(r => console.log('  -', r.tablename));
  }

  // Show settings
  const settings = await pool.query(
    `SELECT setting_key, setting_value
       FROM system_settings
      WHERE setting_key LIKE 'affiliate_%'
      ORDER BY setting_key`,
  );
  if (settings.rows.length > 0) {
    console.log('\nAffiliate settings:');
    settings.rows.forEach(r => console.log(`  - ${r.setting_key} = ${r.setting_value}`));
  }

  console.log('\n🎉 Database migration complete!');
} catch (e) {
  console.error('Migration error:', e.message);
} finally {
  await pool.end();
}
