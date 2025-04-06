import { graphqlMiddleware } from '../../services/graphqlMiddleware.js';
import schema from '../../services/buildStoreFrontSchema.js';

const middleware = graphqlMiddleware(schema);
export default middleware;
