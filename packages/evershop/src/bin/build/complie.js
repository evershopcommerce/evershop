import pkg from 'webpack';
import { error } from '../../lib/log/logger.js';
import { createConfigClient } from '../../lib/webpack/prod/createConfigClient.js';
import { createConfigServer } from '../../lib/webpack/prod/createConfigServer.js';

const { webpack } = pkg;
export async function compile(routes) {
  const config = [createConfigClient(routes), createConfigServer(routes)];
  const compiler = webpack(config);
  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err || stats.hasErrors()) {
        if (err) {
          error(err);
        }
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
}
