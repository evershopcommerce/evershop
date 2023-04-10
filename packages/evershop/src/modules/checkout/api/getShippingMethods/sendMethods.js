const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { select } = require('packages/postgres-query-builder');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  const { cart_id } = request.params;
  try {
    const cart = await select()
      .from('cart')
      .where('uuid', '=', cart_id)
      .and('status', '=', 't')
      .load(pool);
    if (!cart) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Cart not found'
        }
      });
      return;
    }

    // Load the shipping address to get country and province
    const address = await select()
      .from('cart_address')
      .where('cart_address_id', '=', cart.shipping_address_id)
      .load(pool);
    if (!address) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Shipping address not provided'
        }
      });
      return;
    }

    if (!address.country || !address.province) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Shipping country and province are required'
        }
      });
      return;
    }

    const zoneQuery = select().from('shipping_zone');
    zoneQuery
      .innerJoin('shipping_zone_province')
      .on(
        'shipping_zone_province.zone_id',
        '=',
        'shipping_zone.shipping_zone_id'
      )
      .and('shipping_zone_province.province', '=', address.province);
    zoneQuery.where('shipping_zone.country', '=', address.country);

    const zone = await zoneQuery.load(pool);
    if (!zone) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: `No shipping zone available for ${address.country} - ${address.province}`
        }
      });
      return;
    }
    const methods = await select()
      .from('shipping_zone_method')
      .where('zone_id', '=', zone.shipping_zone_id)
      .and('status', '=', 't')
      .execute(pool);
    response.status(OK);
    response.json({
      data: {
        methods: [{ code: 'free', name: 'Free shipping' }] // TODO: this will be handled by each method
      }
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};
