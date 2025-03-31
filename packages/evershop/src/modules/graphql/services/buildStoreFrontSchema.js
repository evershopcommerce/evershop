import { makeExecutableSchema } from '@graphql-tools/schema';
import { buildTypeDefs } from './buildTypes.js';
import { buildResolvers } from './buildResolvers.js';

const schema = makeExecutableSchema({
  typeDefs: buildTypeDefs(),
  resolvers: buildResolvers()
});

export default schema;
