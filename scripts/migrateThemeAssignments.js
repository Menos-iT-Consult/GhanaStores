/**
 * Safely plan or apply assignments from retired generated themes to the
 * curated catalog. The default mode is a read-only dry run.
 *
 * Dry run: node scripts/migrateThemeAssignments.js
 * Apply:   node scripts/migrateThemeAssignments.js --apply --confirm-theme-assignment-migration
 */
import 'dotenv/config';
import pg from 'pg';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { buildThemeIdMigrationMap } from './themeCatalog.js';

export function planThemeAssignmentMigration(rows, idMap = buildThemeIdMigrationMap()) {
  const updates = [];
  const unchanged = [];
  const unresolved = [];

  for (const row of rows) {
    const fromThemeId = row.active_theme_id;
    if (!fromThemeId || !idMap[fromThemeId]) {
      unresolved.push({ storeId: row.id, themeId: fromThemeId || null });
      continue;
    }

    const toThemeId = idMap[fromThemeId];
    if (toThemeId === fromThemeId) {
      unchanged.push({ storeId: row.id, themeId: fromThemeId });
      continue;
    }
    updates.push({ storeId: row.id, fromThemeId, toThemeId });
  }

  return { updates, unchanged, unresolved };
}

function summarizePlan(plan) {
  const counts = new Map();
  for (const update of plan.updates) {
    const key = `${update.fromThemeId} -> ${update.toThemeId}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return {
    changes: plan.updates.length,
    unchanged: plan.unchanged.length,
    unresolved: plan.unresolved.length,
    mappings: [...counts].map(([mapping, stores]) => ({ mapping, stores })),
    unresolvedThemeIds: [...new Set(plan.unresolved.map(({ themeId }) => themeId))],
  };
}

export async function runThemeAssignmentMigration(args = process.argv.slice(2)) {
  const apply = args.includes('--apply');
  if (apply && !args.includes('--confirm-theme-assignment-migration')) {
    throw new Error('Applying assignments requires --confirm-theme-assignment-migration.');
  }
  const connectionString = String(process.env.DATABASE_URL || '').trim();
  if (!connectionString) {
    throw new Error('DATABASE_URL is required; no database connection was attempted.');
  }

  const client = new pg.Client({ connectionString });
  const idMap = buildThemeIdMigrationMap();
  await client.connect();
  let transactionOpen = false;
  try {
    await client.query(apply ? 'BEGIN' : 'BEGIN READ ONLY');
    transactionOpen = true;
    const { rows } = await client.query(
      `SELECT id, active_theme_id
         FROM stores
        WHERE active_theme_id IS NOT NULL${apply ? ' FOR UPDATE' : ''}`,
    );
    const plan = planThemeAssignmentMigration(rows, idMap);
    console.log(JSON.stringify({
      mode: apply ? 'apply' : 'dry-run',
      storesScanned: rows.length,
      ...summarizePlan(plan),
    }, null, 2));

    if (apply && plan.unresolved.length > 0) {
      throw new Error('Unrecognized theme assignments remain; resolve them before applying any changes.');
    }

    if (apply && plan.updates.length > 0) {
      const sourceIds = [...new Set(plan.updates.map(({ fromThemeId }) => fromThemeId))];
      const targetIds = sourceIds.map((id) => idMap[id]);
      await client.query(
        `UPDATE stores AS s
            SET active_theme_id = mapping.new_theme_id
           FROM unnest($1::text[], $2::text[]) AS mapping(old_theme_id, new_theme_id)
          WHERE s.active_theme_id = mapping.old_theme_id`,
        [sourceIds, targetIds],
      );
    }

    await client.query(apply ? 'COMMIT' : 'ROLLBACK');
    transactionOpen = false;
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('[theme-migration] Rollback failed:', rollbackError.message);
      }
    }
    throw error;
  } finally {
    await client.end();
  }
}

if (process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runThemeAssignmentMigration().catch((error) => {
    console.error(`[theme-migration] ${error.message}`);
    process.exitCode = 1;
  });
}
