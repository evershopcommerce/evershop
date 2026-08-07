import { execute, parse, validateSchema } from 'graphql';
import { OK } from '../../../lib/util/httpStatus.js';
import { getContext } from './contextHelper.js';

export const graphqlMiddleware = (schema) =>
  async function graphqlMiddleware(request, response, next) {
    const { body } = request;
    const { query, variables } = body;
    try {
      if (!query) {
        response.status(OK).json({
          data: {}
        });
        return;
      }

      const document = parse(query);
      // Validate the query
      const validationErrors = validateSchema(schema, document);
      if (validationErrors.length > 0) {
        next(new Error(validationErrors[0].message));
      } else {
        const data = await execute({
          schema,
          contextValue: getContext(request),
          document,
          variableValues: variables
        });
        if (data.errors) {
          // Create an Error instance with message and stack trace
          next(data.errors[0]);
        } else {
          response.status(OK).json({
            data: data.data
          });
        }
      }
    } catch (error) {
      next(error);
    }
  };
