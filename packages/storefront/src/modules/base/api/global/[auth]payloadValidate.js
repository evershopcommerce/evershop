import { INVALID_PAYLOAD } from '../../../../lib/util/httpStatus.js';
import { getAjv } from '../../services/getAjv.js';
import markSkipEscape from '../../services/markSkipEscape.js';

// Initialize the ajv instance
const ajv = getAjv();
// Define a custom keyword for html escape
ajv.addKeyword({
  keyword: 'skipEscape',
  modifying: true,
  compile(sch, parentSchema) {
    return (data, t) => {
      if (parentSchema.type === 'string' && sch === true) {
        // Mark the data as skip escape
        markSkipEscape(t.rootData, t.instancePath);
        return true;
      } else {
        return true;
      }
    };
  }
});

export default (request, response, next) => {
  // Get the current route
  const { currentRoute } = request;
  // Get the payload schema
  const { payloadSchema } = currentRoute;
  if (!payloadSchema) {
    next();
  } else {
    const validate = ajv.compile(payloadSchema);
    const valid = validate(request.body);
    if (valid) {
      next();
    } else {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: validate.errors[0].message
        }
      });
    }
  }
};
