import pkg from 'webpack';
import { createConfigServer } from '../../../src/lib/webpack/prod/createConfigServer.js';
import { error } from '../../../src/lib/log/logger';

const { webpack } = pkg;
export const buildServer = async function buildServer(routes) {
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
