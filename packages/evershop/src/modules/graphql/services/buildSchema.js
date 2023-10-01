const { makeExecutableSchema } = require('@graphql-tools/schema');
const { buildTypeDefs } = require('./buildTypes');
const { buildResolvers } = require('./buildResolvers');

const schema = makeExecutableSchema({
  typeDefs: buildTypeDefs(true),
  resolvers: buildResolvers(true)
});

module.exports = schema;
