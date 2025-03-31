import { buildUrl } from '@evershop/evershop/src/lib/router/buildUrl.js';
import { camelCase } from '@evershop/evershop/src/lib/util/camelCase.js';
import { getCustomersBaseQuery } from '../../../services/getCustomersBaseQuery.js';
import { CustomerCollection } from '../../../services/CustomerCollection.js';

export default {
  Query: {
    customer: async (root, { id }, { pool }) => {
      const query = getCustomersBaseQuery();
      query.where('uuid', '=', id);
      const customer = await query.load(pool);
      return customer ? camelCase(customer) : null;
    },
    customers: async (_, { filters = [] }) => {
      const query = getCustomersBaseQuery();
      const root = new CustomerCollection(query);
      await root.init(filters);
      return root;
    }
  },
  Customer: {
    editUrl: ({ uuid }) => buildUrl('customerEdit', { id: uuid }),
    updateApi: (customer) => buildUrl('updateCustomer', { id: customer.uuid }),
    deleteApi: (customer) => buildUrl('deleteCustomer', { id: customer.uuid })
  }
};
