import { select } from '@evershop/postgres-query-builder';
import { countries } from '../../../../../lib/locale/countries.js';
import { provinces } from '../../../../../lib/locale/provinces.js';
import { pool } from '../../../../../lib/postgres/connection.js';

export default {
  Query: {
    countries: (_, argument) => {
      const list = argument?.countries || [];
      if (list.length === 0) {
        return countries;
      } else {
        return countries.filter((c) => list.includes(c.code));
      }
    },
    allowedCountries: async () => {
      // shipping_zone.country was dropped in the provider refactor (phase 8 /
      // Version-1.0.9). Countries that a zone serves now live in
      // shipping_zone_country (many-to-many) — see wiki/shipping-provider-design.md.
      const allowedCountries = await select('country')
        .from('shipping_zone_country')
        .execute(pool);
      return countries.filter((c) =>
        allowedCountries.find((p) => p.country === c.code)
      );
    }
  },
  Country: {
    name: (country) => {
      if (country.name) {
        return country.name;
      } else {
        const c = countries.find((p) => p.code === country);
        return c.name;
      }
    },
    code: (country) => {
      if (country.code) {
        return country.code;
      } else {
        return country;
      }
    },
    provinces: (country) =>
      provinces.filter((p) => p.countryCode === country.code)
  }
};
