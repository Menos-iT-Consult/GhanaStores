// scripts/verifyAffiliate.js
// Verify affiliate database tables and settings
import fs from 'fs';
import pg from 'pg';

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL=(.+)/);
const url = match[1].trim().replace(/^['"]|['"]$/g, '');
const { Pool } = pg;
const pool = new Pool({ connectionString: url });

console.log('Verifying affiliate database...\n');

try {
  // Check all 5 tables
  const tables = await pool.query(`
    SELECT tablename FROM pg_tables 
    WHERE tablename IN ('system_settings','affiliates','referrals','affiliate_commissions','affiliate_payouts') 
    ORDER BY tablename
  `);
  
  console.log('Tables created:');
  const tableMap = {};
  tables.rows.forEach(r => { console.log('  ✅ ' + r.tablename); tableMap[r.tablename] = true; });
  
  const expected = ['system_settings','affiliates','referrals','affiliate_commissions','affiliate_payouts'];
  const missing = expected.filter(t => !tableMap[t]);
  if (missing.length > 0) {
    console.log('  ❌ Missing:', missing.join(', '));
  }

  // Check settings
  const settings = await pool.query(`
    SELECT setting_key, setting_value, description 
    FROM system_settings 
    WHERE setting_key LIKE 'affiliate%'
  `);
  
  console.log('\nAffiliate settings:');
  if (settings.rows.length === 0) {
    console.log('  (none found)');
  } else {
    settings.rows.forEach(r => console.log('  - ' + r.setting_key + ' = ' + r.setting_value));
  }

  console.log('\n✅ Verification complete!');
} catch (e) {
  console.error('Error:', e.message);
} finally {
  await pool.end();
}
