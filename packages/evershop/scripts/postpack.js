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
        '@evershop/evershop': `file:./evershop-evershop-${version}.tgz`
      },
      scripts: {
        setup: 'evershop install',
        start: 'evershop start',
        'start:debug': 'evershop start:debug',
        build: 'evershop build',
        dev: 'evershop dev',
        'user:create': 'evershop user:create'
      }
    },
    null,
    2
  )
);
