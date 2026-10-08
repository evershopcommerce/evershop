/**
 * Virtual collections — collections that exist for the storefront but not in
 * the database.
 *
 * A theme's merchandising widgets name a collection by `code`, and a theme
 * cannot know which collections a store has. That leaves a demo homepage empty
 * on a fresh install, which no amount of reference-resolving can fix: nothing
 * can invent a merchant's collections, and `theme:active` must never seed.
 *
 * A virtual collection closes it from the other side. The code below always
 * resolves, on any store, because it is answered by a query rather than by
 * rows: "the newest products". A theme ships it, the storefront fills it, and
 * the merchant can still point the widget at a real collection whenever they
 * make one.
 *
 * A real collection with the same code always wins — the merchant's data is
 * never shadowed — so the code is deliberately one nobody types by accident.
 */

export const NEWEST_PRODUCTS_COLLECTION_CODE = '__evershop_newest_products__';

/** Stable, obviously synthetic, and a valid v4 so it passes anything that checks. */
const NEWEST_PRODUCTS_COLLECTION_UUID = '00000000-0000-4000-8000-000000000001';

/**
 * `Collection.collectionId` is `Int!` in the schema, so a null there makes
 * GraphQL null the WHOLE collection field and every widget falls back to its
 * "pick a collection" placeholder (2026-09-17). Virtual collections therefore
 * carry a sentinel id instead: `collection_id` is an identity column starting
 * at 1, so 0 can never be a real row.
 */
export const VIRTUAL_COLLECTION_ID = 0;

export interface VirtualCollection {
  /** Always `VIRTUAL_COLLECTION_ID`: there is no row, so nothing to join on. */
  collectionId: number;
  uuid: string;
  name: string;
  code: string;
  description: string | null;
}

const VIRTUAL_COLLECTIONS: Record<string, VirtualCollection> = {
  [NEWEST_PRODUCTS_COLLECTION_CODE]: {
    collectionId: VIRTUAL_COLLECTION_ID,
    uuid: NEWEST_PRODUCTS_COLLECTION_UUID,
    name: 'Products',
    code: NEWEST_PRODUCTS_COLLECTION_CODE,
    description: null
  }
};

export function isVirtualCollectionCode(code: unknown): code is string {
  return typeof code === 'string' && code in VIRTUAL_COLLECTIONS;
}

/** The synthetic collection for `code`, or `null` when the code is not a virtual one. */
export function getVirtualCollection(code: unknown): VirtualCollection | null {
  return isVirtualCollectionCode(code) ? { ...VIRTUAL_COLLECTIONS[code] } : null;
}

/**
 * Was this collection produced by `getVirtualCollection`? Both halves matter: a
 * merchant who creates a REAL collection with the same code must still get the
 * real membership join, and that row has a real `collection_id`.
 */
export function isVirtualCollection(collection: {
  collectionId?: number | null;
  code?: string;
}): boolean {
  if (!isVirtualCollectionCode(collection?.code)) {
    return false;
  }
  const id = collection?.collectionId;
  return id === VIRTUAL_COLLECTION_ID || id === null || id === undefined;
}

/** Every virtual collection, for pickers and documentation. */
export function listVirtualCollections(): VirtualCollection[] {
  return Object.values(VIRTUAL_COLLECTIONS).map((c) => ({ ...c }));
}
