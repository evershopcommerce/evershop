import { resolve } from 'path';
import { CONSTANTS } from '../helpers.js';
import { error, info, warning } from '../log/logger.js';
import { provisionThemeMetafields } from '../metafield/provision.js';
import { pool } from '../postgres/connection.js';
import { getActiveTheme } from '../util/getActiveTheme.js';
import { readManifest } from './manifest.js';

/**
 * Ensure the active theme's manifest-declared metafield definitions exist.
 *
 * Called from `startUp.js` AFTER migrations and BEFORE the server listens —
 * module bootstraps run before `migrate()`, so this cannot live in a
 * bootstrap.ts (the tables wouldn't exist on a fresh DB). Running here also
 * covers deploys that never run the theme CLI (baked `config.system.theme`
 * on a fresh database): `installOrUpgrade` only runs from `theme:active`,
 * but definitions provision on first boot regardless.
 *
 * The ensure is idempotent (ON CONFLICT DO NOTHING + provenance upserts), so
 * re-running every boot is safe and is what picks up manifest edits without a
 * version bump. Never throws — a bad manifest must not stop the store.
 */
export async function provisionActiveThemeMetafields(): Promise<void> {
  try {
    // getActiveTheme (plain config read), NOT getEnabledTheme — the latter
    // process.exit(1)s on a missing theme dir, which would turn a broken
    // theme path into a boot crash instead of a per-request error.
    const themeName = getActiveTheme();
    if (!themeName) return;
    const manifest = await readManifest(resolve(CONSTANTS.THEMEPATH, themeName));
    if (!manifest) return;
    const entries = manifest.metafieldDefinitions ?? [];
    const result = await provisionThemeMetafields(themeName, entries, pool);
    if (result.seeded.length > 0 || result.retired.length > 0) {
      info(
        `Theme '${themeName}' metafields: seeded ${result.seeded.length}, ` +
          `adopted ${result.adopted.length}, retired ${result.retired.length}`
      );
    }
    for (const c of result.conflicts) {
      warning(
        `Theme '${themeName}' metafield conflict: "${c.ref}" exists with ` +
          `different ${c.details.map((d) => d.field).join(', ')} — declaration skipped`
      );
    }
    for (const e of result.errors) {
      warning(`Theme '${themeName}' metafield declaration error: ${e.message}`);
    }
  } catch (e) {
    error(e as Error);
  }
}
