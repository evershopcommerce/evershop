import {
  execute,
  NoUnusedFragmentsRule,
  parse,
  specifiedRules,
  validateSchema
} from 'graphql';
import { debug } from '../../../../lib/log/logger.js';
import { isDevelopmentMode } from '../../../../lib/util/isDevelopmentMode.js';
import adminSchema, { rebuildSchema } from '../../services/buildSchema.js';
import storeFrontSchema, {
  rebuildStoreFrontSchema
} from '../../services/buildStoreFrontSchema.js';
import { getContext } from '../../services/contextHelper.js';
import { graphqlErrorMessageFormat } from '../../services/graphqlErrorMessageFormat.js';

export default async function graphql(request, response, next) {
  const { currentRoute } = request;
  let schema;
  if (isDevelopmentMode()) {
    schema =
      currentRoute && currentRoute.isAdmin
        ? await rebuildSchema()
        : await rebuildStoreFrontSchema();
  } else {
    schema =
      currentRoute && currentRoute.isAdmin ? adminSchema : storeFrontSchema;
  }
  // TODO: Should we wait for previous async middlewares?
  try {
    const { body } = request;
    const { graphqlQuery, graphqlVariables, propsMap } = body;
    if (!graphqlQuery) {
      next();
    } else {
      // Try remove all white space and line break
      const query = graphqlQuery.replace(/(\r\n|\n|\r|\s)/gm, '');
      if (query === 'queryQuery{}') {
        // TODO: oh no, so dirty. find a better way to check if the query is empty
        next();
      } else {
        const document = parse(graphqlQuery);
        // Validate the query
        const validationErrors = validateSchema(
          schema,
          document,
          specifiedRules.filter((rule) => rule !== NoUnusedFragmentsRule)
        );
        if (validationErrors.length > 0) {
          const formatedErrorMessage = graphqlErrorMessageFormat(
            graphqlQuery,
            validationErrors[0].locations[0].line,
            validationErrors[0].locations[0].column
          );
          debug(`GraphQL validation error: ${formatedErrorMessage}`);
          next(validationErrors[0]);
        } else {
          const context = getContext(request);
          // Add current user to context
          context.user = request.locals.user;
          // Add current customer to context
          context.customer = request.locals.customer;
          const data = await execute({
            schema,
            contextValue: context,
            document,
            variableValues: graphqlVariables
          });
          if (data.errors) {
            next(data.errors[0]);
          } else {
            response.locals = response.locals || {};
            response.locals.graphqlResponse = JSON.parse(
              JSON.stringify(data.data)
            );
            // Get id and props from the queryRaw object and assign to response.locals.propsMap
            response.locals.propsMap = propsMap;
            next();
          }
        }
      }
    }
  } catch (error) {
    next(error);
  }
}
