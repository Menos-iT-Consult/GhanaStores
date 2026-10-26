import fs from 'fs';
import pg from 'pg';

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL=(.+)/);
const url = match[1].trim().replace(/^['"]|['"]$/g, '');
const { Pool } = pg;
const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

const settings = await pool.query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'affiliate%'");
console.log('Affiliate settings:');
settings.rows.forEach(r => console.log('  - ' + r.setting_key + ' = ' + r.setting_value));
await pool.end();
console.log('\n✅ Done');
