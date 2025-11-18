import { readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const coreModules = [
  {
    name: 'auth',
    resolve: path.resolve(__dirname, '../../modules/auth'),
    path: path.resolve(__dirname, '../../modules/auth')
  },
  {
    name: 'base',
    resolve: path.resolve(__dirname, '../../modules/base'),
    path: path.resolve(__dirname, '../../modules/base')
  },
  {
    name: 'catalog',
    resolve: path.resolve(__dirname, '../../modules/catalog'),
    path: path.resolve(__dirname, '../../modules/catalog')
  },
  {
    name: 'checkout',
    resolve: path.resolve(__dirname, '../../modules/checkout'),
    path: path.resolve(__dirname, '../../modules/checkout')
  },
  {
    name: 'cms',
    resolve: path.resolve(__dirname, '../../modules/cms'),
    path: path.resolve(__dirname, '../../modules/cms')
  },
  {
    name: 'cod',
    resolve: path.resolve(__dirname, '../../modules/cod'),
    path: path.resolve(__dirname, '../../modules/cod')
  },
  {
    name: 'customer',
    resolve: path.resolve(__dirname, '../../modules/customer'),
    path: path.resolve(__dirname, '../../modules/customer')
  },
  {
    name: 'graphql',
    resolve: path.resolve(__dirname, '../../modules/graphql'),
    path: path.resolve(__dirname, '../../modules/graphql')
  },
  {
    name: 'oms',
    resolve: path.resolve(__dirname, '../../modules/oms'),
    path: path.resolve(__dirname, '../../modules/oms')
  },
  {
    name: 'paypal',
    resolve: path.resolve(__dirname, '../../modules/paypal'),
    path: path.resolve(__dirname, '../../modules/paypal')
  },
  {
    name: 'promotion',
    resolve: path.resolve(__dirname, '../../modules/promotion'),
    path: path.resolve(__dirname, '../../modules/promotion')
  },
  {
    name: 'setting',
    resolve: path.resolve(__dirname, '../../modules/setting'),
    path: path.resolve(__dirname, '../../modules/setting')
  },
  {
    name: 'stripe',
    resolve: path.resolve(__dirname, '../../modules/stripe'),
    path: path.resolve(__dirname, '../../modules/stripe')
  },
  {
    name: 'tax',
    resolve: path.resolve(__dirname, '../../modules/tax'),
    path: path.resolve(__dirname, '../../modules/tax')
  }
];

export function loadModule(path) {
  return readdirSync(path, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => ({
      name: dirent.name,
      path: path.resolve(path, dirent.name)
    }));
}

export function getCoreModules() {
  return coreModules;
}
