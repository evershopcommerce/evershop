import type { Address } from '../../../../types/address.js';
import {
  getStoreAddress,
  getStoreCity,
  getStoreCountry,
  getStorePostalCode,
  getStoreProvince
} from '../../../setting/services/setting.js';

/**
 * Compose the shop's origin address from the existing store settings, in the
 * address vocabulary (spec § 3.10): `storeCountry` → `country`,
 * `storeProvince` → `administrative_area` (a region key such as `US-CA`),
 * `storeCity` → `locality`, `storeAddress` → `address_line_1`,
 * `storePostalCode` → `postal_code`. The setting names themselves are
 * unchanged (spec § 10 Q5).
 *
 * Returns a defined-but-incomplete Address if some settings are unset.
 * Providers that need specific fields (e.g., USPS needs country + postal code)
 * are responsible for validating and returning empty methods if missing.
 *
 * See wiki/shipping-provider-design.md → "Origin address" section.
 */
export async function getOriginAddress(): Promise<Address> {
  const [country, administrativeArea, locality, addressLine1, postalCode] =
    await Promise.all([
      getStoreCountry(),
      getStoreProvince(),
      getStoreCity(),
      getStoreAddress(),
      getStorePostalCode()
    ]);
  return {
    country,
    administrative_area: administrativeArea,
    locality,
    address_line_1: addressLine1,
    postal_code: postalCode
  };
}
