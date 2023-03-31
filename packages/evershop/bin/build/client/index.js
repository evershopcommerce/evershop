const webpack = require('webpack');
const {
  createConfigClient
} = require('@evershop/evershop/src/lib/webpack/prod/createConfigClient');

module.exports.buildClient = async function buildClient(routes) {
  const config = createConfigClient(routes);
  const compiler = webpack(config);

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err || stats.hasErrors()) {
        console.log(
          stats.toString({
            errorDetails: true,
            warnings: true
          })
        );
        reject(err);
      }
      resolve(stats);
    });
  });
};
