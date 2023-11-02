const {
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { getMulter } = require('../../services/getMulter');

const upload = getMulter();

module.exports = (request, response, delegate, next) => {
  const path = request.params[0] || '';
  // eslint-disable-next-line no-useless-escape
  if (path && !/^[a-z0-9\/]+$/i.test(path)) {
    response.status(INVALID_PAYLOAD).json({
      error: {
        status: INVALID_PAYLOAD,
        message: 'Invalid path'
      }
    });
  } else {
    upload.array('images', 20)(request, response, next);
  }
};
