import { describe, it, expect } from '@jest/globals';
import { exportToManifest } from '../../export.js';
import { loadLiveDbForTheme } from '../../install.js';

/**
 * Guard for specifications/replace-homepage-with-landing-page.md §17: theme
 * export and the diff's live snapshot must never see entity-scoped placements
 * (landing page bodies, homepage backups) or instances that live only inside
 * them. A fake pool records every SQL statement.
 */
function fakePool() {
  const sql: string[] = [];
  return {
    sql,
    query: async (text: string) => {
      sql.push(text);
      // provisioningAvailable() probes information_schema; return "no table".
      if (/information_schema|to_regclass/i.test(text)) return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 0 };
    }
  };
}

describe('theme export / live snapshot ignore entity-scoped rows', () => {
  it('exportToManifest filters placements to entity_urn IS NULL and drops body-only instances', async () => {
    const pool = fakePool();
    const manifest = await exportToManifest({ themeId: 't', pool: pool as any, version: '1.0.0' });
    expect(manifest.placements).toEqual([]);
    const placementSql = pool.sql.find((s) => /FROM widget_placement p/.test(s));
    expect(placementSql).toMatch(/p\.entity_urn IS NULL/);
    // An instance is kept when it has a route-level placement, or a placement
    // inside a landing page THIS export includes (none here, so the uuid array
    // is empty and the second EXISTS matches nothing).
    const widgetSql = pool.sql.find((s) => /FROM widget_instance wi/.test(s));
    expect(widgetSql).toMatch(/p\.entity_urn IS NULL/);
    expect(widgetSql).toMatch(/p\.entity_urn = ANY\(\$2::text\[\]\)/);
  });

  it('loadLiveDbForTheme applies the same filters', async () => {
    const pool = fakePool();
    await loadLiveDbForTheme(pool as any, 't');
    const placementSql = pool.sql.find((s) => /FROM widget_placement p/.test(s));
    expect(placementSql).toMatch(/p\.entity_urn IS NULL/);
    // loadLiveDbForTheme keeps its stricter rule: an instance that lives ONLY
    // inside page bodies is invisible to the diff.
    const widgetSql = pool.sql.find((s) => /FROM widget_instance wi/.test(s));
    expect(widgetSql).toMatch(/p\.entity_urn IS NOT NULL/);
  });
});
