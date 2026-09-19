import { select } from '@evershop/postgres-query-builder';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';

export default {
  Query: {
    currentCustomer: async (root, args, { customer }) =>
      customer ? camelCase(customer) : null
  },
  Customer: {
    addresses: async (customer, args, { pool }) => {
      const addresses = await select()
        .from('customer_address')
        .where('customer_id', '=', customer.customerId)
        .execute(pool);

      // Self-service address endpoints (`/customers/me/addresses`). They derive
      // the customer from the authenticated session/JWT and verify ownership, so
      // no customer id is placed in the URL. The admin-only
      // create/update/deleteCustomerAddress routes are not used here.
      return addresses.map((address) => ({
        ...camelCase(address),
        updateApi: buildUrl('updateMyAddress', {
          address_id: address.uuid
        }),
        deleteApi: buildUrl('deleteMyAddress', {
          address_id: address.uuid
        })
      }));
    },
    addAddressApi: () => buildUrl('createMyAddress'),
    // Self-service profile update. The endpoint derives the customer from the
    // authenticated session/JWT, so no id is needed in the URL.
    updateProfileApi: () => buildUrl('updateCustomerProfile')
  }
};
