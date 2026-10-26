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

// Read SQL migration
const sqlPath = path.join(__dirname, '..', 'db', 'migrations', '001_affiliate_program.sql');
if (!fs.existsSync(sqlPath)) {
  console.error('ERROR: Migration file not found at', sqlPath);
  process.exit(1);
}

const sqlContent = fs.readFileSync(sqlPath, 'utf8');
console.log('Migration file loaded:', sqlContent.length, 'chars');

// Apply migration
const { Pool } = pg;
const pool = new Pool({ connectionString: dbUrl });

console.log('Connecting to database...');
try {
  await pool.query(sqlContent);
  console.log('✅ Migration applied successfully!');

  // Verify affiliate tables
  const result = await pool.query("SELECT tablename FROM pg_tables WHERE tablename LIKE 'affiliate%' ORDER BY tablename");
  if (result.rows.length > 0) {
    console.log('\nAffiliate tables in database:');
    result.rows.forEach(r => console.log('  -', r.tablename));
  }

  // Show settings
  const settings = await pool.query('SELECT key, value FROM affiliate_settings ORDER BY key');
  if (settings.rows.length > 0) {
    console.log('\nAffiliate settings:');
    settings.rows.forEach(r => console.log(`  - ${r.key} = ${r.value}`));
  }

  console.log('\n🎉 Database migration complete!');
} catch (e) {
  console.error('Migration error:', e.message);
} finally {
  await pool.end();
}
