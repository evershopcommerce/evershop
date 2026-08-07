import fs from 'fs';
import path from 'path';
import packageJson from '../package.json' with { type: 'json' };
// Get the current version of the package from the nearest package.json file
const { version } = packageJson;
// Get the --pack-destination from the command line arguments
// Create a package.json file in the packDestination directory with dependencies is the package itself
fs.writeFileSync(
  path.resolve(process.env.npm_config_pack_destination, 'package.json'),
  JSON.stringify(
    {
      name: packageJson.name,
      version,
      dependencies: {
        '@storefront/core': `file:./storefront-storefront-${version}.tgz`
      },
      scripts: {
        setup: 'storefront install',
        start: 'storefront start',
        'start:debug': 'storefront start:debug',
        build: 'storefront build',
        dev: 'storefront dev',
        'user:create': 'storefront user:create'
      }
    },
    null,
    2
  )
);
