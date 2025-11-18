import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { TaxClassCollection } from '../../../services/TaxClassCollection.js';

export default {
  Query: {
    taxClasses: async (_, { filters }) => {
      const query = select().from('tax_class');
      const root = new TaxClassCollection(query);
      await root.init({}, { filters });
      return root;
    },
    taxClass: async (_, { id }) => {
      const taxClass = await select()
        .from('tax_class')
        .where('uuid', '=', id)
        .load(pool);
      return camelCase(taxClass);
    }
  },
  TaxClass: {
    rates: async (parent) => {
      const query = select().from('tax_rate');
      query.where('tax_class_id', '=', parent.taxClassId);
      const rates = await query.execute(pool);
      return rates.map((row) => camelCase(row));
    },
    addRateApi: async ({ uuid }) =>
      buildUrl('createTaxRate', { class_id: uuid })
  },
  TaxRate: {
    updateApi: async ({ uuid }) => buildUrl('updateTaxRate', { id: uuid }),
    deleteApi: async ({ uuid }) => buildUrl('deleteTaxRate', { id: uuid })
  }
};
