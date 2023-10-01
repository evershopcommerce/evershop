const schema = require('../../services/buildStoreFrontSchema');
const { graphqlMiddleware } = require('../../services/graphqlMiddleware');

const middleware = graphqlMiddleware(schema);
module.exports = middleware;
