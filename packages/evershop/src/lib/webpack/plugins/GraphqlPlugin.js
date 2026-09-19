import {
  getAllRouteComponents,
  getComponentsByRoute
} from '../../componee/getComponentsByRoute.js';
import { parseGraphql } from '../util/parseGraphql.js';

export const GraphqlPlugin = class GraphqlPlugin {
  constructor(isAdmin = false) {
    this.isAdmin = isAdmin;
    this.query = {};
    this.fragments = {};
    this.variables = [];
  }

  apply(compiler) {
    const { webpack } = compiler;
    const { RawSource } = webpack.sources;

    compiler.hooks.thisCompilation.tap('GraphqlPlugin', (compilation) => {
      // TODO: Can we get list of module without calling getComponentsByRoute again?
      const components = getAllRouteComponents(this.isAdmin);

      // Store one file per route instead of a single file
      Object.keys(components).forEach((routeId) => {
        const routeGraphqlQueries = parseGraphql(components[routeId]);
        const filename = `query-${routeId}.graphql`;

        compilation.emitAsset(
          filename,
          new RawSource(JSON.stringify(routeGraphqlQueries, null, 2))
        );
      });
    });
  }
};
