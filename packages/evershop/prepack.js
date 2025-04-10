import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read the package tsconfig
const packageConfigPath = path.resolve(__dirname, 'tsconfig.json');
const packageConfig = JSON.parse(fs.readFileSync(packageConfigPath, 'utf8'));

// Remove the extends field
const { extends: _, ...configWithoutExtends } = packageConfig;

// Write the config back to tsconfig.json
fs.writeFileSync(
  packageConfigPath,
  JSON.stringify(configWithoutExtends, null, 2)
);

console.log('✅ tsconfig.json has been updated for packing');
