import { contries } from '../../../../../lib/locale/countries.js';
import { provinces } from '../../../../../lib/locale/provinces.js';
import { pool } from '../../../../../lib/postgres/connection.js';
import { select } from '@evershop/postgres-query-builder';

export default {
  Query: {
    countries: (_, argument) => {
      const list = argument?.countries || [];
      if (list.length === 0) {
        return contries;
      } else {
        return contries.filter((c) => list.includes(c.code));
      }
    },
    allowedCountries: async () => {
      const allowedCountries = await select('country')
        .from('shipping_zone')
        .execute(pool);
      return contries.filter((c) =>
        allowedCountries.find((p) => p.country === c.code)
      );
    }
  },
  Country: {
    name: (country) => {
      if (country.name) {
        return country.name;
      } else {
        const c = contries.find((p) => p.code === country);
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
