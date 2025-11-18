import { makeExecutableSchema } from '@graphql-tools/schema';
import { buildResolvers } from './buildResolvers.js';
import { buildTypeDefs } from './buildTypes.js';

const resolvers = await buildResolvers(true);
const schema = makeExecutableSchema({
  typeDefs: buildTypeDefs(true),
  resolvers
});

export async function rebuildSchema() {
  const resolvers = await buildResolvers(true);
  const schema = makeExecutableSchema({
    typeDefs: buildTypeDefs(true),
    resolvers: resolvers
  });
  return schema;
}

export default schema;
