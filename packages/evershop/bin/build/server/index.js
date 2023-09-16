const webpack = require('webpack');
const {
  createConfigServer
} = require('@evershop/evershop/src/lib/webpack/prod/createConfigServer');
const { error } = require('@evershop/evershop/src/lib/log/debuger');

module.exports.buildServer = async function buildServer(routes) {
  const config = createConfigServer(routes);
  const compiler = webpack(config);

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err || stats.hasErrors()) {
        error(
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
