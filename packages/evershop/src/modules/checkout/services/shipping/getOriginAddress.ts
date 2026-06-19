import type { Address } from '../../../../types/customerAddress.js';
import {
  getStoreAddress,
  getStoreCity,
  getStoreCountry,
  getStorePostalCode,
  getStoreProvince
} from '../../../setting/services/setting.js';

/**
 * Compose the shop's origin address from the existing store settings.
 *
 * The store address is already configurable under Settings → Store. We reuse
 * those individual settings (storeCountry, storeProvince, storeCity,
 * storeAddress, storePostalCode) rather than introducing a new combined
 * `shop.origin_address` JSONB setting — same data, fewer settings to manage.
 *
 * Returns a defined-but-incomplete Address if some settings are unset.
 * Providers that need specific fields (e.g., USPS needs country + postcode)
 * are responsible for validating and returning empty methods if missing.
 *
 * See wiki/shipping-provider-design.md → "Origin address" section.
 */
export async function getOriginAddress(): Promise<Address> {
  const [country, province, city, address1, postcode] = await Promise.all([
    getStoreCountry(),
    getStoreProvince(),
    getStoreCity(),
    getStoreAddress(),
    getStorePostalCode()
  ]);
  return {
    country,
    province,
    city,
    address_1: address1,
    postcode
  };
}
