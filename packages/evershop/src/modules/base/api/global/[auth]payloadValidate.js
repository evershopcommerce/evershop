const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const {
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');

module.exports = (request, response, delegate, next) => {
  // Get the current route
  const { currentRoute } = request;
  // Get the payload schema
  const { payloadSchema } = currentRoute;
  if (!payloadSchema) {
    next();
  } else {
    // Validate the payload
    const ajv = new Ajv({
      strict: false,
      useDefaults: true
    });
    addFormats(ajv);
    ajv.addFormat('digits', /^[0-9]*$/);
    const validate = ajv.compile(payloadSchema);
    const valid = validate(request.body);
    if (valid) {
      next();
    } else {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: `${
            validate.errors[0].instancePath === ''
              ? 'Request data'
              : validate.errors[0].instancePath
          } ${validate.errors[0].message}`
        }
      });
    }
  }
};
