import { getAddressExtras } from '../../../../../lib/address/extras.js';
import {
  ADDRESS_COLUMNS,
  ADDRESS_ROW_METADATA_KEYS
} from '../../../../../lib/address/tokens.js';
import type { Address } from '../../../../../types/address.js';

/**
 * Turn a validated payload into the row to persist (spec § 3.8).
 *
 * Registered extra fields arrive as top-level keys and are folded into the
 * `extra` JSONB column; the shared columns and the row metadata keys pass
 * through. Nothing else can reach `.given()` because `validateAddress` has
 * already rejected unknown keys (`unknown_field`), which is what makes the
 * silent-drop class of bug (§ 1.8) impossible.
 *
 * `extra` merges key by key on update (D-11): a value replaces, `null`
 * deletes the key, absent keys are kept from the stored row's `extra`. A
 * client may also send `extra` wholesale; its keys merge the same way.
 * `previous` is the stored row on update: its `extra` seeds the merge and
 * its `country` scopes the extras when the payload does not repeat it.
 */
export function foldAddressExtras(payload: Address, previous?: Address | null): Address {
  const previousExtra =
    previous === undefined
      ? undefined
      : ((previous?.extra as Record<string, unknown> | null | undefined) ?? null);
  const country = String(payload.country ?? previous?.country ?? '')
    .trim()
    .toUpperCase();
  const extraIds = new Set(getAddressExtras(country).map((def) => def.id));
  const columns = new Set<string>([...ADDRESS_COLUMNS, ...ADDRESS_ROW_METADATA_KEYS]);

  const row: Address = {};
  const extra: Record<string, unknown> = { ...(previousExtra ?? {}) };
  let extraTouched = false;

  if (payload.extra && typeof payload.extra === 'object') {
    for (const [key, value] of Object.entries(payload.extra)) {
      extraTouched = true;
      if (value === null) {
        delete extra[key];
      } else {
        extra[key] = value;
      }
    }
  }

  for (const [key, value] of Object.entries(payload)) {
    if (key === 'extra') {
      continue;
    }
    if (extraIds.has(key)) {
      extraTouched = true;
      if (value === null) {
        delete extra[key];
      } else if (value !== undefined) {
        extra[key] = value;
      }
      continue;
    }
    if (columns.has(key)) {
      row[key] = value;
    }
  }

  if (extraTouched || previousExtra === undefined) {
    row.extra = Object.keys(extra).length > 0 ? extra : null;
  }
  return row;
}
