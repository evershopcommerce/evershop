import { makeExecutableSchema } from '@graphql-tools/schema';
import { buildTypeDefs } from './buildTypes.js';
import { buildResolvers } from './buildResolvers.js';

const schema = makeExecutableSchema({
  typeDefs: buildTypeDefs(true),
  resolvers: buildResolvers(true)
});

export default schema;
