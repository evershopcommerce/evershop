import schema from '../../services/buildSchema.js';
import { graphqlMiddleware } from '../../services/graphqlMiddleware.js';

const middleware = graphqlMiddleware(schema);
export default middleware;
