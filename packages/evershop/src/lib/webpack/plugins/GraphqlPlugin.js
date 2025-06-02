import { getComponentsByRoute } from '../../componee/getComponentsByRoute.js';
import { parseGraphql } from '../util/parseGraphql.js';

export const GraphqlPlugin = class GraphqlPlugin {
  constructor(route, outputFile = undefined) {
    this.route = route;
    this.outputFile = outputFile || 'query.graphql';
    this.query = {};
    this.fragments = {};
    this.variables = [];
  }

  apply(compiler) {
    const { webpack } = compiler;
    const { RawSource } = webpack.sources;

    compiler.hooks.thisCompilation.tap('GraphqlPlugin', (compilation) => {
      // TODO: Can we get list of module without calling getComponentsByRoute again?
      const components = getComponentsByRoute(this.route);
      compilation.emitAsset(
        this.outputFile,
        new RawSource(JSON.stringify(parseGraphql(components)))
      );
    });
  }
};
