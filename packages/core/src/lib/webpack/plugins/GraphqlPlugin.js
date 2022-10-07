const { getComponentsByRoute } = require('../../componee/getComponentsByRoute');
const { parseGraphql } = require('../util/parseGraphql');

module.exports = exports = {};

exports.GraphqlPlugin = class GraphqlPlugin {
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
      const components = getComponentsByRoute(this.route); // TODO: Can we get list of module without calling getComponentsByRoute again?
      compilation.emitAsset(this.outputFile, new RawSource(JSON.stringify(parseGraphql(components))));
    })
  }
};
