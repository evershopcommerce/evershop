import { error } from '../../../../lib/log/logger.js';

export default async (request, response, next) => {
  const {
    cost,
    calculate_api,
    weight_based_cost,
    price_based_cost,
    calculation_type
  } = request.body;

  try {
    if (calculation_type === 'api') {
      if (!calculate_api) {
        throw new Error('API calculation type requires calculate_api');
      }
    } else if (calculation_type === 'price_based_rate') {
      if (!price_based_cost || price_based_cost.length === 0) {
        throw new Error('Require price based rates');
      }
    } else if (calculation_type === 'weight_based_rate') {
      if (!weight_based_cost || weight_based_cost.length === 0) {
        throw new Error('Require weight based rates');
      }
    } else if (!cost) {
      throw new Error('Flat rate calculation type requires cost');
    }
    return next();
  } catch (e) {
    error(e);
    return next(e);
  }
};
