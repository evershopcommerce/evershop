const {
  OK,
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { getSetting } = require('@evershop/evershop/src/modules/setting/services/setting');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  const { age } = request.body;
  try {
    response.status(OK);
    const minAge = await getSetting('minAge');
    if (age && age >= minAge) {
      // Set the age verified cookie
      response.cookie('age-verified', 1, {
        maxAge: 1000 * 60 * 60 * 24  * 10
      });
      response.json({
        data: {
          age,
          passed: true
        }
      });
    } else {
      response.json({
        data: {
          age,
          passed: false
        }
      });
    }
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
