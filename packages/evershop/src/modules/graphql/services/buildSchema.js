import { makeExecutableSchema } from '@graphql-tools/schema';
import { buildTypeDefs } from './buildTypes.js';
import { buildResolvers } from './buildResolvers.js';

const resolvers = await buildResolvers(true);
const schema = makeExecutableSchema({
  typeDefs: buildTypeDefs(true),
  resolvers
});

export default schema;
