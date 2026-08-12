import { translate } from '../../../../lib/locale/translate/translate.js';
import { INVALID_PAYLOAD } from '../../../../lib/util/httpStatus.js';

export default async (request, response, next) => {
  if (!request.body.coupon || !/^\S*$/.test(request.body.coupon)) {
    return response.status(INVALID_PAYLOAD).json({
      error: {
        message: translate('Invalid coupon'),
        status: INVALID_PAYLOAD
      }
    });
  } else {
    return next();
  }
};
