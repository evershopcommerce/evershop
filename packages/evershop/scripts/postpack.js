import fs from 'fs';
import path from 'path';
import packageJson from '../package.json' with { type: 'json' };

try {
  // Extract package details
  const { name, version } = packageJson;

  // Get the pack destination directory from environment variables
  const packDestination = process.env.npm_config_pack_destination;

  if (!packDestination) {
    throw new Error('❌ Missing environment variable: npm_config_pack_destination');
  }

  // Define the new package.json structure
  const newPackageJson = {
    name,
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
  };

  // Write the new package.json file
  const outputPath = path.resolve(packDestination, 'package.json');
  fs.writeFileSync(outputPath, JSON.stringify(newPackageJson, null, 2));

  console.log(`✅ package.json successfully created at: ${outputPath}`);
} catch (error) {
  console.error('Error generating package.json:', error.message);
  process.exit(1);
}
