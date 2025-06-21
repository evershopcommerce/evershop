import { makeExecutableSchema } from '@graphql-tools/schema';
import { buildResolvers } from './buildResolvers.js';
import { buildTypeDefs } from './buildTypes.js';

const resolvers = await buildResolvers(false);
const schema = makeExecutableSchema({
  typeDefs: buildTypeDefs(),
  resolvers
});

export async function rebuildStoreFrontSchema() {
  const resolvers = await buildResolvers(false);
  const schema = makeExecutableSchema({
    typeDefs: buildTypeDefs(),
    resolvers: resolvers
  });
  return schema;
}

export default schema;
