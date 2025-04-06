import { makeExecutableSchema } from '@graphql-tools/schema';
import { buildTypeDefs } from './buildTypes.js';
import { buildResolvers } from './buildResolvers.js';

const resolvers = await buildResolvers(false);
const schema = makeExecutableSchema({
  typeDefs: buildTypeDefs(),
  resolvers
});
export default schema;
