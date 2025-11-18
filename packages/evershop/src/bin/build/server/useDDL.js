import { existsSync, rmdirSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { inspect } from 'util';
import boxen from 'boxen';
import { green, red } from 'kleur';
import ora from 'ora';
import pkg from 'webpack';
import { getComponentsByRoute } from '../../../src/lib/componee/getComponentByRoute.js';
import { CONSTANTS } from '../../../src/lib/helpers.js';
import { info } from '../../../src/lib/log/logger.js';
import { getRoutes } from '../../../src/lib/router/routes.js';
// Run building vendor first
import { createVendorConfig } from '../../../src/lib/webpack/configProvider.js';
import { loadModuleComponents } from '../../serve/loadModuleComponents.js';
import { loadModuleRoutes } from '../../serve/loadModuleRoutes.js';
import { loadModules } from '../../serve/loadModules.js';

const { webpack } = pkg;
const modules = loadModules(path.resolve(__dirname, '../../../src', 'modules'));

const spinner = ora({
  text: green('Starting server build'),
  spinner: 'dots12'
}).start();
spinner.start();

// Initilizing routes
modules.forEach((module) => {
  try {
    // Load routes
    loadModuleRoutes(module.path);
  } catch (e) {
    spinner.fail(`${red(e.stack)}\n`);
    process.exit(0);
  }
});

// Initializing components
modules.forEach((module) => {
  try {
    // Load components
    loadModuleComponents(module.path);
  } catch (e) {
    spinner.fail(`${red(e.stack)}\n`);
    process.exit(0);
  }
});

const routes = getRoutes();

// Collect all "controller" route
const controllers = routes.filter((r) => r.isApi === false);

const promises = [];
const total = controllers.length - 1;
let completed = 0;

spinner.text = `Start building ☕☕☕☕☕\n${Array(total).fill('▒').join('')}`;

if (existsSync(path.resolve(CONSTANTS.ROOTPATH, './.evershop/build'))) {
  rmdirSync(path.resolve(CONSTANTS.ROOTPATH, './.evershop/build'), {
    recursive: true
  });
}
const start = Date.now();

const vendorComplier = webpack(createVendorConfig(webpack));
const webpackVendorPromise = new Promise((resolve, reject) => {
  vendorComplier.run((err, stats) => {
    if (err) {
      reject(err);
    } else if (stats.hasErrors()) {
      reject(
        new Error(
          stats.toString({
            errorDetails: true,
            warnings: true
          })
        )
      );
    } else {
      resolve(stats);
    }
  });
});

webpackVendorPromise.then(async () => {
  controllers.forEach((route) => {
    const buildFunc = async function () {
      const components = getComponentsByRoute(route.id);

      if (!components) {
        return;
      }
      Object.keys(components).forEach((area) => {
        Object.keys(components[area]).forEach((id) => {
          components[area][
            id
          ].component = `---require("${components[area][id].source}")---`;
          delete components[area][id].source;
        });
      });

      const buildPath =
        route.isAdmin === true
          ? `./admin/${route.id}`
          : `./frontStore/${route.id}`;
      let content = `var components = module.exports = exports = ${inspect(
        components,
        { depth: 5 }
      )
        .replace(/'---/g, '')
        .replace(/---'/g, '')}`;
      content += '\r\n';
      await mkdir(
        path.resolve(CONSTANTS.ROOTPATH, './.evershop/build', buildPath),
        { recursive: true }
      );
      await writeFile(
        path.resolve(
          CONSTANTS.ROOTPATH,
          '.evershop/build',
          buildPath,
          'components.js'
        ),
        content
      );
      const name =
        route.isAdmin === true ? `admin/${route.id}` : `frontStore/${route.id}`;
      const entry = {};
      entry[name] = [
        path.resolve(
          CONSTANTS.ROOTPATH,
          '.evershop',
          'build',
          buildPath,
          'components.js'
        ),
        path.resolve(
          CONSTANTS.LIBPATH,
          '../components/common/react/server',
          'render.js'
        )
      ];
      const compiler = webpack({
        mode: 'production', // "production" | "development" | "none"
        module: {
          rules: [
            {
              test: /\/views|components|context\/(.*).js?$/,
              // test: /\.js?$/,
              exclude: /(bower_components)/,
              use: {
                loader: 'babel-loader?cacheDirectory',
                options: {
                  sourceType: 'unambiguous',
                  cacheDirectory: true,
                  presets: [
                    [
                      '@babel/preset-env',
                      {
                        exclude: [
                          '@babel/plugin-transform-regenerator',
                          '@babel/plugin-transform-async-to-generator'
                        ]
                      }
                    ],
                    '@babel/preset-react'
                  ]
                }
              }
            },
            {
              test: /getComponents\.js/,
              use: [
                {
                  loader: path.resolve(
                    CONSTANTS.LIBPATH,
                    'webpack/getComponentLoader.js'
                  ),
                  options: {
                    componentsPath: path.resolve(
                      CONSTANTS.ROOTPATH,
                      './.evershop/build',
                      buildPath,
                      'components.js'
                    )
                  }
                }
              ]
            }
          ]
        },
        // name: 'main',
        target: 'node12.18',
        entry,
        output: {
          path: path.resolve(
            CONSTANTS.ROOTPATH,
            './.evershop/build',
            buildPath,
            'server'
          ),
          libraryTarget: 'commonjs2',
          globalObject: 'this',
          filename: 'index.js'
        },
        resolve: {
          alias: {
            react: path.resolve(CONSTANTS.NODEMODULEPATH, 'react')
          }
        },
        plugins: [
          new webpack.DllReferencePlugin({
            manifest: path.resolve(
              CONSTANTS.ROOTPATH,
              './.evershop/build/vendor-manifest.json'
            )
          })
        ]
      });

      const webpackPromise = new Promise((resolve, reject) => {
        compiler.run((err, stats) => {
          if (err) {
            reject(err);
          } else if (stats.hasErrors()) {
            reject(
              new Error(
                stats.toString({
                  errorDetails: true,
                  warnings: true
                })
              )
            );
          } else {
            resolve(stats);
          }
        });
      });

      await webpackPromise;
      completed += 1;
      spinner.text = `Start building ☕☕☕☕☕\n${Array(completed)
        .fill(green('█'))
        .concat(total - completed > 0 ? Array(total - completed).fill('▒') : [])
        .join('')}`;
    };
    promises.push(buildFunc());
  });

  await Promise.all(promises)
    .then(() => {
      spinner.succeed(
        green('Building completed!!!\n') +
          boxen(green('Please run "npm run start" to start your website'), {
            title: 'EverShop',
            titleAlignment: 'center',
            padding: 1,
            margin: 1,
            borderColor: 'green'
          })
      );
      const end = Date.now();
      info(`Execution time: ${end - start} ms`);

      process.exit(0);
    })
    .catch((e) => {
      spinner.fail(`${red(e)}\n`);
      process.exit(0);
    });
});
