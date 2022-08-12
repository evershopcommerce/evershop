const webpack = require('webpack');
const { createConfigClient } = require('../../../src/lib/webpack/prod/createConfigClient');

module.exports.buildClient = async function buildClient(routes) {
  const config = createConfigClient(routes);
  console.log('client', config);
  const compiler = webpack(config);

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err || stats.hasErrors()) {
        console.log(stats.toString({
          errorDetails: true,
          warnings: true
        }));
        reject(err);
      }
      resolve(stats);
    });
  }
  );
};
