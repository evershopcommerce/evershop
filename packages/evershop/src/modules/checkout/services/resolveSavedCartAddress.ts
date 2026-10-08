import { select, type PoolClient } from '@evershop/postgres-query-builder';
import { ADDRESS_COLUMNS } from '../../../lib/address/tokens.js';
import type { Address } from '../../../types/address.js';

/**
 * Saved address → cart, "sync in both directions" (spec § 3.1, § 3.8). A
 * logged-in customer reusing an address-book entry sends
 * `{ customerAddressUuid }` instead of re-posting the fields the form shows;
 * the saved row is copied verbatim — every shared column and `extra` — so a
 * field collected only in the address book (an extra scoped to the `account`
 * surface) reaches the cart and, from there, the order. Ownership is checked
 * against the cart's customer; the copy is then normalized and validated like
 * any other write.
 */
export async function resolveSavedCartAddress(
  addressData: Address,
  cart: { customer_id?: number | null },
  connection: PoolClient
): Promise<Address> {
  const uuid = addressData?.customerAddressUuid;
  if (uuid === undefined || uuid === null) {
    return addressData;
  }
  if (typeof uuid !== 'string' || uuid.trim() === '') {
    throw new Error('Invalid customerAddressUuid');
  }
  if (!cart?.customer_id) {
    throw new Error('A saved address can only be used by a logged-in customer');
  }
  const saved = (await select()
    .from('customer_address')
    .where('uuid', '=', uuid.trim())
    .and('customer_id', '=', cart.customer_id)
    .load(connection)) as Address | null;
  if (!saved) {
    throw new Error('Saved address not found');
  }
  const copy: Address = {};
  for (const column of ADDRESS_COLUMNS) {
    copy[column] = (saved[column] as string | null | undefined) ?? null;
  }
  copy.extra = (saved.extra as Record<string, unknown> | null | undefined) ?? null;
  return copy;
}
