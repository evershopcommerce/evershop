import { isDevelopmentMode } from '../../../../lib/util/isDevelopmentMode.js';
import schema, {
  rebuildStoreFrontSchema
} from '../../services/buildStoreFrontSchema.js';
import { graphqlMiddleware } from '../../services/graphqlMiddleware.js';

let middleware;
if (isDevelopmentMode()) {
  const devSchema = await rebuildStoreFrontSchema();
  middleware = graphqlMiddleware(devSchema);
} else {
  middleware = graphqlMiddleware(schema);
}
export default middleware;
