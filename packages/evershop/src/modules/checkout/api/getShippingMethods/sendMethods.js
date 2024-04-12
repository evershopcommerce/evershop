const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const normalizePort = require('@evershop/evershop/bin/lib/normalizePort');
const {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { default: axios } = require('axios');
const { select } = require('@evershop/postgres-query-builder');
const { toPrice } = require('../../services/toPrice');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  const { cart_id } = request.params;
  const { country, province } = request.query;
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

    if (!country) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Shipping country is required'
        }
      });
      return;
    }

    const zoneQuery = select().from('shipping_zone');
    zoneQuery
      .leftJoin('shipping_zone_province')
      .on(
        'shipping_zone_province.zone_id',
        '=',
        'shipping_zone.shipping_zone_id'
      );
    if (province) {
      zoneQuery
        .where('shipping_zone_province.province', '=', province)
        .or('shipping_zone_province.province', 'IS NULL', null);
    } else {
      zoneQuery.where('shipping_zone_province.province', 'IS NULL', null);
    }

    zoneQuery.andWhere('shipping_zone.country', '=', country);

    const zone = await zoneQuery.load(pool);
    if (!zone) {
      response.status(200);
      response.json({
        data: {
          methods: []
        }
      });
      return;
    }

    const methodsQuery = select().from('shipping_method');
    methodsQuery
      .leftJoin('shipping_zone_method')
      .on(
        'shipping_zone_method.method_id',
        '=',
        'shipping_method.shipping_method_id'
      );
    methodsQuery
      .where('shipping_zone_method.zone_id', '=', zone.shipping_zone_id)
      .and('shipping_zone_method.is_enabled', '=', 't');
    let methods = await methodsQuery.execute(pool);

    methods = methods.filter((method) => {
      if (!method.condition_type) {
        return true;
      }
      if (method.condition_type === 'price') {
        return (
          toPrice(method.min) <= cart.sub_total &&
          cart.sub_total <= toPrice(method.max)
        );
      } else if (method.condition_type === 'weight') {
        return (
          toPrice(method.min) <= cart.total_weight &&
          cart.total_weight <= toPrice(method.max)
        );
      } else {
        return false;
      }
    });

    // Loop through the methods and calculate the cost
    methods = await Promise.all(
      methods.map(async (method) => {
        if (method.calculate_api) {
          // This API is internal. It must be public
          const port = normalizePort();
          let api = `http://localhost:${port}`;
          try {
            api += buildUrl(method.calculate_api, {
              cart_id,
              method_id: method.uuid
            });
          } catch (e) {
            throw new Error(
              `Your shipping calculate API ${method.calculate_api} is invalid`
            );
          }
          const jsonResponse = await axios.get(api);
          // Detect if the API returns an error base on the http status
          if (jsonResponse.status >= 400) {
            throw new Error(
              `Error calculating shipping cost for method ${method.name}`
            );
          }
          return {
            ...method,
            cost: toPrice(jsonResponse.data.data.cost, true)
          };
        } else if (method.weight_based_cost) {
          const totalWeight = cart.total_weight;
          const weightBasedCost = method.weight_based_cost
            .map(({ min_weight, cost }) => ({
              min_weight: parseFloat(min_weight),
              cost: toPrice(cost)
            }))
            .sort((a, b) => a.min_weight - b.min_weight);

          let cost = 0;
          for (let i = 0; i < weightBasedCost.length; i += 1) {
            if (totalWeight >= weightBasedCost[i].min_weight) {
              cost = weightBasedCost[i].cost;
            }
          }
          return {
            ...method,
            cost: toPrice(cost, true)
          };
        } else if (method.price_based_cost) {
          const subTotal = toPrice(cart.sub_total);
          const priceBasedCost = method.price_based_cost
            .map(({ min_price, cost }) => ({
              min_price: toPrice(min_price),
              cost: toPrice(cost)
            }))
            .sort((a, b) => a.min_price - b.min_price);
          let cost = 0;
          for (let i = 0; i < priceBasedCost.length; i += 1) {
            if (subTotal >= priceBasedCost[i].min_price) {
              cost = priceBasedCost[i].cost;
            }
          }
          return {
            ...method,
            cost: toPrice(cost, true)
          };
        } else {
          return {
            ...method,
            cost: toPrice(method.cost, true)
          };
        }
      })
    );

    response.status(OK);
    response.$body = {
      data: {
        methods: methods.map((method) => ({
          id: method.uuid,
          code: method.uuid,
          name: method.name,
          cost: method.cost
        }))
      }
    };
    next();
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
