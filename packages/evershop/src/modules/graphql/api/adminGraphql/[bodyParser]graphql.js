const schema = require('../../services/buildSchema');
const { graphqlMiddleware } = require('../../services/graphqlMiddleware');

const middleware = graphqlMiddleware(schema);
module.exports = middleware;
