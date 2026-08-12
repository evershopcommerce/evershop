import { OmsUrn } from '@evershop/evershop/lib/urn';

export default {
  Order: {
    urn: (order: { uuid: string }) => OmsUrn.order(order.uuid)
  }
};
