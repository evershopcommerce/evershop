import schema from '../../services/buildStoreFrontSchema.js';
import { graphqlMiddleware } from '../../services/graphqlMiddleware.js';

const middleware = graphqlMiddleware(schema);
export default middleware;
