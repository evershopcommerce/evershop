import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../lib/postgres/connection.js';
import type { TaxRateRow } from '../../../types/db/index.js';

/** A rate row with its three address columns parsed into lists (`*` = any). */
export interface MatchedTaxRate
  extends Omit<TaxRateRow, 'country' | 'administrative_area' | 'postal_code'> {
  country: string[];
  administrative_area: string[];
  postal_code: string[];
}

function toList(value: unknown): string[] {
  const items =
    typeof value === 'string'
      ? value.split(',').filter((item) => item.trim() !== '')
      : [];
  return items.length === 0 ? ['*'] : items;
}

/**
 * The rates of a tax class that apply to an address (spec § 3.10). On a rate,
 * `country`, `administrative_area` (region keys such as `US-CA`) and
 * `postal_code` are comma-separated lists or `*`; an empty value means `*`.
 * The address value must be in the list, or the list must contain `*`; a
 * missing administrative area or postal code on the ADDRESS matches any rate.
 * Semantics are unchanged from the pre-rename `province`/`postcode` columns.
 */
export async function getTaxRates(
  taxClassId: number | string,
  country: string | null | undefined,
  administrativeArea: string | null | undefined,
  postalCode: string | null | undefined = null
): Promise<MatchedTaxRate[]> {
  if (!country) {
    return [];
  }
  const taxRatesQuery = select().from('tax_rate');
  taxRatesQuery.where('tax_class_id', '=', taxClassId);
  taxRatesQuery.orderBy('priority', 'ASC');
  const rows = (await taxRatesQuery.execute(pool)) as TaxRateRow[] | null;
  if (!rows) {
    return [];
  }
  const rates: MatchedTaxRate[] = rows.map((row) => ({
    ...row,
    country: toList(row.country),
    administrative_area: toList(row.administrative_area),
    postal_code: toList(row.postal_code)
  }));
  const area = administrativeArea ?? null;
  const postal = postalCode ?? null;
  return rates.filter(
    (rate) =>
      (rate.country.includes(country) || rate.country.includes('*')) &&
      (area === null ||
        rate.administrative_area.includes(area) ||
        rate.administrative_area.includes('*')) &&
      (postal === null ||
        rate.postal_code.includes(postal) ||
        rate.postal_code.includes('*'))
  );
}
