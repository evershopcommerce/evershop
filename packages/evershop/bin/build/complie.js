import pkg from 'webpack';
import { createConfigClient } from '@evershop/evershop/src/lib/webpack/prod/createConfigClient.js';
import { createConfigServer } from '@evershop/evershop/src/lib/webpack/prod/createConfigServer.js';
import { error } from '@evershop/evershop/src/lib/log/logger.js';

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
