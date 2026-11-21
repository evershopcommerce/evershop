import type { Pool } from 'pg';
import { PgLookup } from '../adapters/PgLookup.js';
import { buildTemplate } from '../services/templates/importTemplate.js';
import type { ImportWeb } from './ImportWeb.js';

/**
 * The template of an entity, made for the store behind `pool`: it asks which
 * attributes and custom fields the store has, and how it writes names; it reads
 * no route and no language.
 */
export function pgTemplate(pool: Pool): ImportWeb['template'] {
  return async (entity) => {
    const lookup = new PgLookup(pool, {
      routePaths: () => [],
      enabledLanguages: async () => []
    });
    // What a file does not use, `buildTemplate` leaves out.
    return buildTemplate(entity, {
      attributeCodes: await lookup.attributeCodes(),
      metafieldKeys: [...(await lookup.metafieldKeys(entity))],
      nameFormat: (await lookup.addressRules()).nameFormat()
    });
  };
}
