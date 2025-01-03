const { error } = require('@evershop/evershop/src/lib/log/logger');
const throwIf = require('@evershop/evershop/src/lib/util/throwIf');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, deledate, next) => {
  const {
    cost,
    calculate_api,
    weight_based_cost,
    price_based_cost,
    calculation_type
  } = request.body;

  try {
    if (calculation_type === 'api') {
      throwIf(!calculate_api, 'API calculation type requires calculate_api');
    } else if (calculation_type === 'price_based_rate') {
      throwIf(
        !price_based_cost || price_based_cost.length === 0,
        'Require price based rates'
      );
    } else if (calculation_type === 'weight_based_rate') {
      throwIf(
        !weight_based_cost || weight_based_cost.length === 0,
        'Require weight based rates'
      );
    } else {
      throwIf(!cost, 'Flat rate calculation type requires cost');
    }
    return next();
  } catch (e) {
    error(e);
    return next(e);
  }
};
