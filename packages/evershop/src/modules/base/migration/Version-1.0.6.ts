import { execute, type PoolClient } from '@evershop/postgres-query-builder';

/**
 * Seed a store-wide "copyright" text metafield (owner_type = 'shop').
 *
 * Lives in the `base` module on purpose — the same module as Version-1.0.3,
 * which creates the `metafield_type` enum and the `metafield_definition` /
 * `metafield_shop` tables this INSERT depends on. Migrations within a module run
 * in strict semver order (bin/lib/bootstrap/migrate.js sorts by semver.compare),
 * so 1.0.6 is guaranteed to execute after 1.0.3 — no cross-module ordering
 * assumption.
 *
 * Gives merchants an editable footer copyright line: the definition surfaces
 * automatically in the Store Settings custom-fields card (StandaloneMetafieldCard
 * with ownerType="shop"), its value lives in the `metafield_shop` singleton, and
 * the storefront + admin footers read it via `themeConfig.copyRight` (the cms
 * ThemeConfig resolver), falling back to the theme config default while unset.
 *
 * `short_text` is the single-line text type. `ON CONFLICT DO NOTHING` keeps the
 * migration idempotent and never clobbers an operator's own `custom.copyright`.
 */
export default async (connection: PoolClient): Promise<void> => {
  await execute(
    connection,
    `INSERT INTO "metafield_definition"
       ("owner_type", "namespace", "field_key", "name", "description", "field_type", "visible_to_customer")
     VALUES ('shop', 'custom', 'copyright', 'Copyright', 'Copyright line shown in the store footer.', 'short_text', TRUE)
     ON CONFLICT ("owner_type", "namespace", "field_key") DO NOTHING`
  );
};
