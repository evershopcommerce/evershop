import webpack from 'webpack';
import { createConfigClient } from '../../../src/lib/webpack/prod/createConfigClient';
import { error } from '../../../src/lib/log/logger';

export async function buildClient(routes) {
  const config = createConfigClient(routes);
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
}
