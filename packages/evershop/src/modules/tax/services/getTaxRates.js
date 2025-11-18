import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../lib/postgres/connection.js';

export async function getTaxRates(
  taxClassId,
  country,
  province,
  postcode = null
) {
  if (!country) {
    return [];
  }
  const taxRatesQuery = select().from('tax_rate');
  taxRatesQuery.where('tax_class_id', '=', taxClassId);
  taxRatesQuery.orderBy('priority', 'ASC');
  let taxRates = await taxRatesQuery.execute(pool);

  if (!taxRates) {
    return [];
  } else {
    // Country, postcode, province is a text field, comma separated incase of multiple values.
    // We need to convert them to array for comparison.
    taxRates.forEach((taxRate) => {
      // Remove empty values (all whitespace)
      taxRate.country = taxRate.country
        ? taxRate.country.split(',').filter((item) => item.trim() !== '')
        : [];
      taxRate.province = taxRate.province
        ? taxRate.province.split(',').filter((item) => item.trim() !== '')
        : [];
      taxRate.postcode = taxRate.postcode
        ? taxRate.postcode.split(',').filter((item) => item.trim() !== '')
        : [];

      // If country, province, postcode is empty, we need to set it to * so that it can be compared with the request.
      if (taxRate.country.length === 0) {
        taxRate.country.push('*');
      }
      if (taxRate.province.length === 0) {
        taxRate.province.push('*');
      }
      if (taxRate.postcode.length === 0) {
        taxRate.postcode.push('*');
      }
    });

    // Filter and get the applicable tax rates based on the provided address.
    taxRates = taxRates.filter((taxRate) => {
      if (
        (taxRate.country.includes(country) || taxRate.country.includes('*')) &&
        (taxRate.province.includes(province) ||
          taxRate.province.includes('*') ||
          province === null) &&
        (taxRate.postcode.includes(postcode) ||
          taxRate.postcode.includes('*') ||
          postcode === null)
      ) {
        return true;
      }
      return false;
    });

    return taxRates;
  }
}
