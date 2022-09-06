const { makeExecutableSchema } = require('@graphql-tools/schema');
const typeDefs = require('./buildTypes');
const resolvers = require('./buildResolvers');

const schema = makeExecutableSchema({
  typeDefs,
  resolvers
});

module.exports = schema;