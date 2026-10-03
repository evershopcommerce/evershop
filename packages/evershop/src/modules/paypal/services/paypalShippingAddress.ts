import { toIntegrationAddressFromRow } from '../../../lib/address/integration.js';
import type { Address } from '../../../types/address.js';

/**
 * PayPal Orders API `purchase_units[].shipping` from an order address, mapped
 * by token (spec § 3.10): `address_line_1` ← the first address line,
 * `address_line_2` ← the remaining lines plus the dependent locality,
 * `admin_area_2` ← the locality, `admin_area_1` ← the administrative area's
 * ISO suffix (`CA` for `US-CA`) or its key where no ISO code exists (Hong Kong
 * areas), `postal_code`, `country_code`, `name.full_name` ← `recipient`.
 * Field lengths follow PayPal's limits.
 */
export interface PaypalShippingAddress {
  address_line_1: string;
  address_line_2?: string;
  admin_area_1?: string;
  admin_area_2?: string;
  postal_code: string;
  country_code: string;
}

export interface PaypalShipping {
  name: { full_name: string };
  type: 'SHIPPING';
  address: PaypalShippingAddress;
}

const LIMITS = {
  address_line_1: 300,
  address_line_2: 300,
  admin_area_1: 300,
  admin_area_2: 120,
  postal_code: 60
} as const;

const cut = (value: string, max: number): string =>
  value.length > max ? value.slice(0, max) : value;

export async function buildPaypalShipping(
  row: Address,
  locale?: string
): Promise<PaypalShipping> {
  const address = await toIntegrationAddressFromRow(row, locale);
  const result: PaypalShippingAddress = {
    address_line_1: cut(address.lines[0] ?? '', LIMITS.address_line_1),
    postal_code: cut(address.postalCode ?? '', LIMITS.postal_code),
    country_code: address.country
  };
  const line2 = [...address.lines.slice(1), address.dependentLocality]
    .filter((part): part is string => Boolean(part))
    .join(', ');
  if (line2 !== '') {
    result.address_line_2 = cut(line2, LIMITS.address_line_2);
  }
  if (address.locality) {
    result.admin_area_2 = cut(address.locality, LIMITS.admin_area_2);
  }
  if (address.administrativeArea) {
    result.admin_area_1 = cut(
      address.administrativeArea.isoSuffix ?? address.administrativeArea.key,
      LIMITS.admin_area_1
    );
  }
  return {
    name: { full_name: address.recipient },
    type: 'SHIPPING',
    address: result
  };
}
