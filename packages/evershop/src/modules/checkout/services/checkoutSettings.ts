import { toBoolean } from '../../../lib/util/coerce.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { getSettingSync } from '../../setting/services/setting.js';

/**
 * Whether shoppers may place an order without a customer account. Admin `setting` →
 * legacy `checkout.allowGuestCheckout` config → default `true` (guest checkout allowed).
 * Synchronous/cache-only so it is safe in the order validator and request handlers. See
 * `getStoreCurrency` (`modules/setting/services/setting.ts`) for the DB → config → default
 * pattern; the value is coerced because the `setting` table returns scalars as strings.
 */
export function getAllowGuestCheckout(): boolean {
  return toBoolean(
    getSettingSync<unknown>(
      'allowGuestCheckout',
      getConfig('checkout.allowGuestCheckout', true)
    )
  );
}
