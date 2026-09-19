import { select, insert } from '@evershop/postgres-query-builder';
import { v4 as uuidv4 } from 'uuid';
import { info, success } from '../../lib/log/logger.js';
import { pool } from '../../lib/postgres/connection.js';

/**
 * Seed storefront widgets so a freshly seeded store renders a REAL
 * storefront instead of an empty shell:
 *
 *  - "Demo Main Menu" (basic_menu) on `headerMiddleLeft`, route `all`:
 *    one link per TOP-LEVEL category read from the database at seed time
 *    (the category set comes partly from categories.json and partly from
 *    the product seeder, so the DB is the only honest source), plus a
 *    Blog link to /blog.
 *  - "Demo Homepage Products" (collection_products) on the homepage
 *    `content` area, showing the seeded `homepage` collection.
 *
 * Post-1.3.0 widget model: a `widget_instance` row (name/type/settings)
 * plus `widget_placement` rows (route, area, sort_order). Idempotent by
 * widget name — re-running the seed never duplicates either widget.
 */

const MENU_WIDGET_NAME = 'Demo Main Menu';
const HOME_PRODUCTS_WIDGET_NAME = 'Demo Homepage Products';

interface MenuNode {
  id: string;
  uuid: string;
  name: string;
  url: string;
  type: string;
  children: MenuNode[];
}

function menuNode(name: string, url: string): MenuNode {
  const id = uuidv4();
  return { id, uuid: id, name, url, type: 'custom', children: [] };
}

async function widgetExists(name: string): Promise<boolean> {
  const existing = await select()
    .from('widget_instance')
    .where('name', '=', name)
    .load(pool);
  return existing !== null && existing !== undefined;
}

async function insertWidget(
  name: string,
  type: string,
  settings: Record<string, unknown>,
  placement: { route: string; area: string; sortOrder: number }
): Promise<void> {
  const instance = await insert('widget_instance')
    .given({
      name,
      type,
      settings: JSON.stringify(settings),
      status: true
    })
    .execute(pool);
  await insert('widget_placement')
    .given({
      widget_instance_id: instance.widget_instance_id,
      route: placement.route,
      area: placement.area,
      sort_order: placement.sortOrder
    })
    .execute(pool);
}

export async function seedWidgets(): Promise<void> {
  info('Seeding storefront widgets...');

  if (await widgetExists(MENU_WIDGET_NAME)) {
    info(`"${MENU_WIDGET_NAME}" already exists, skipping...`);
  } else {
    // Top-level categories as they ACTUALLY exist after the other seeders.
    const categories = await pool.query(
      `SELECT cd.name, cd.url_key
         FROM category c
         JOIN category_description cd
           ON cd.category_description_category_id = c.category_id
        WHERE c.parent_id IS NULL AND c.status = TRUE
        ORDER BY c.category_id`
    );
    const menus: MenuNode[] = categories.rows.map((row) =>
      menuNode(row.name, `/${row.url_key}`)
    );
    menus.push(menuNode('Blog', '/blog'));
    await insertWidget(
      MENU_WIDGET_NAME,
      'basic_menu',
      { menus, isMain: true },
      { route: 'all', area: 'headerMiddleLeft', sortOrder: 1 }
    );
    success(
      `"${MENU_WIDGET_NAME}" created (${menus.length - 1} categories + Blog)`
    );
  }

  if (await widgetExists(HOME_PRODUCTS_WIDGET_NAME)) {
    info(`"${HOME_PRODUCTS_WIDGET_NAME}" already exists, skipping...`);
  } else {
    await insertWidget(
      HOME_PRODUCTS_WIDGET_NAME,
      'collection_products',
      {
        collection: 'homepage', // the collection CODE (collections.json)
        count: 8,
        countPerRow: 4,
        heading: null, // falls back to the collection's own name
        subText: null,
        viewAllLink: null,
        viewAllLabel: null
      },
      { route: 'homepage', area: 'content', sortOrder: 10 }
    );
    success(`"${HOME_PRODUCTS_WIDGET_NAME}" created (collection: homepage)`);
  }
}
