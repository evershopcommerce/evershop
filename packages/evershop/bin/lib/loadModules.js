const path = require('path');
const { readdirSync } = require('fs');

module.exports = exports = {};

const coreModules = [
  {
    name: 'auth',
    resolve: path.resolve(__dirname, '../../src/modules/auth'),
    path: path.resolve(__dirname, '../../src/modules/auth')
  },
  {
    name: 'base',
    resolve: path.resolve(__dirname, '../../src/modules/base'),
    path: path.resolve(__dirname, '../../src/modules/base')
  },
  {
    name: 'catalog',
    resolve: path.resolve(__dirname, '../../src/modules/catalog'),
    path: path.resolve(__dirname, '../../src/modules/catalog')
  },
  {
    name: 'checkout',
    resolve: path.resolve(__dirname, '../../src/modules/checkout'),
    path: path.resolve(__dirname, '../../src/modules/checkout')
  },
  {
    name: 'cms',
    resolve: path.resolve(__dirname, '../../src/modules/cms'),
    path: path.resolve(__dirname, '../../src/modules/cms')
  },
  {
    name: 'cod',
    resolve: path.resolve(__dirname, '../../src/modules/cod'),
    path: path.resolve(__dirname, '../../src/modules/cod')
  },
  {
    name: 'customer',
    resolve: path.resolve(__dirname, '../../src/modules/customer'),
    path: path.resolve(__dirname, '../../src/modules/customer')
  },
  {
    name: 'graphql',
    resolve: path.resolve(__dirname, '../../src/modules/graphql'),
    path: path.resolve(__dirname, '../../src/modules/graphql')
  },
  {
    name: 'oms',
    resolve: path.resolve(__dirname, '../../src/modules/oms'),
    path: path.resolve(__dirname, '../../src/modules/oms')
  },
  {
    name: 'paypal',
    resolve: path.resolve(__dirname, '../../src/modules/paypal'),
    path: path.resolve(__dirname, '../../src/modules/paypal')
  },
  {
    name: 'promotion',
    resolve: path.resolve(__dirname, '../../src/modules/promotion'),
    path: path.resolve(__dirname, '../../src/modules/promotion')
  },
  {
    name: 'setting',
    resolve: path.resolve(__dirname, '../../src/modules/setting'),
    path: path.resolve(__dirname, '../../src/modules/setting')
  },
  {
    name: 'stripe',
    resolve: path.resolve(__dirname, '../../src/modules/stripe'),
    path: path.resolve(__dirname, '../../src/modules/stripe')
  },
  {
    name: 'tax',
    resolve: path.resolve(__dirname, '../../src/modules/tax'),
    path: path.resolve(__dirname, '../../src/modules/tax')
  }
];

exports.loadModules = function loadModule(path) {
  return readdirSync(path, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => ({
      name: dirent.name,
      path: path.resolve(path, dirent.name)
    }));
};

exports.getCoreModules = function getCoreModules() {
  return coreModules;
};
