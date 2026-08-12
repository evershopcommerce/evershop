import { CustomerUrn } from '@evershop/evershop/lib/urn';

export default {
  Customer: {
    urn: (customer: { uuid: string }) => CustomerUrn.customer(customer.uuid)
  }
};
