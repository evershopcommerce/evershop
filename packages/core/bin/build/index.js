const {
  readdirSync, existsSync, statSync, readFileSync
} = require('fs');
const { writeFile, mkdir, rmdir } = require('fs').promises;
const path = require('path');
const webpack = require('webpack');
const { inspect } = require('util');
const sass = require('node-sass');
const CleanCss = require('clean-css');
const { red, green } = require('kleur');
const ora = require('ora');
const boxen = require('boxen');
const { CONSTANTS } = require('../../src/lib/helpers');
const { addComponents } = require('../../src/lib/componee/addComponents');
const { getComponentsByRoute } = require('../../src/lib/componee/getComponentByRoute');
const { getRoutes } = require('../../src/lib/router/routes');
const { registerAdminRoute } = require('../../src/lib/router/registerAdminRoute');
const { registerSiteRoute } = require('../../src/lib/router/registerSiteRoute');

require('@babel/register')({
  presets: ['@babel/preset-react'],
  ignore: ['node_modules']
});

const spinner = ora({
  text: green('Start building ☕☕☕☕☕'),
  spinner: 'dots12'
}).start();
spinner.start();

/* Loading modules and initilize routes, components and services */
const modules = readdirSync(path.resolve(__dirname, '../../src/modules/'), { withFileTypes: true })
  .filter((dirent) => dirent.isDirectory())
  .map((dirent) => dirent.name);

// Load routes

/**
 * Scan for routes base on module path.
 */

function registerRoute(routePath, isAdmin, isApi) {
  const scanedRoutes = readdirSync(routePath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
  scanedRoutes.forEach((r) => {
    if (/^[A-Za-z.]+$/.test(r) === true) {
      if (existsSync(path.join(routePath, r, 'route'))) {
        let lines = readFileSync(path.join(routePath, r, 'route'), 'utf-8');
        lines = lines.split(/\r?\n/).map((p) => p.replace('\\\\', '\\'));
        let p = lines[1];
        if (isApi === true) {
          p = `/v1${p}`;
        }
        if (isAdmin === true) { registerAdminRoute(r, lines[0].split(',').map((e) => e.trim()).filter((e) => e !== ''), p); } else { registerSiteRoute(r, lines[0].split(',').map((e) => e.trim()).filter((e) => e !== ''), p); }
      }
    }
  });
}

modules.forEach((module) => {
  try {
    const src = path.resolve(__dirname, '../../dist');
    // Check for routes
    if (existsSync(path.join(src, 'modules', module, 'controllers', 'admin'))) {
      registerRoute(path.join(src, 'modules', module, 'controllers', 'admin'), true, false);
    }

    if (existsSync(path.join(src, 'modules', module, 'controllers', 'site'))) {
      registerRoute(path.join(src, 'modules', module, 'controllers', 'site'), false, false);
    }

    if (existsSync(path.join(src, 'modules', module, 'apiControllers', 'admin'))) {
      registerRoute(path.join(src, 'modules', module, 'apiControllers', 'admin'), true, true);
    }

    if (existsSync(path.join(src, 'modules', module, 'apiControllers', 'site'))) {
      registerRoute(path.join(src, 'modules', module, 'apiControllers', 'site'), false, true);
    }
  } catch (e) {
    spinner.fail(`${red(e)}\n`);
    process.exit(0);
  }
});

modules.forEach((element) => {
  try {
    if (existsSync(path.resolve(__dirname, '../../src/modules', element, 'views/site/components.js'))) {
      // eslint-disable-next-line global-require
      const components = require(path.resolve(__dirname, '../../src/modules', element, 'views/site/components.js'));
      if (typeof components === 'object' && components !== null) {
        addComponents('site', components);
      }
    }
    if (existsSync(path.resolve(__dirname, '../../src/modules', element, 'views/admin/components.js'))) {
      // eslint-disable-next-line global-require
      const components = require(path.resolve(__dirname, '../../src/modules', element, 'views/admin/components.js'));
      if (typeof components === 'object' && components !== null) {
        addComponents('admin', components);
      }
    }
  } catch (e) {
    spinner.fail(`${red(e)}\n`);
    process.exit(0);
  }
});

const routes = getRoutes();

// START BUILD Webpack

// Collect all "GET" only route
const getRoutesList = routes.filter((r) => (r.method.length === 1 && r.method[0].toUpperCase() === 'GET'));
const promises = [];
const total = getRoutesList.length - 1;
let completed = 0;

spinner.text = `Start building ☕☕☕☕☕\n${Array(total).fill('▒').join('')}`;

getRoutesList.forEach((route) => {
  const buildFunc = async function () {
    const components = getComponentsByRoute(route.id);

    if (!components) { return; }
    Object.keys(components).forEach((area) => {
      Object.keys(components[area]).forEach((id) => {
        components[area][id].component = `---require("${components[area][id].source}")---`;
        delete components[area][id].source;
      });
    });

    const buildPath = route.isAdmin === true ? `./admin/${route.id}` : `./site/${route.id}`;
    await rmdir(path.resolve(CONSTANTS.ROOTPATH, './.nodejscart/build', buildPath), { recursive: true });
    let content = `var components = module.exports = exports = ${inspect(components, { depth: 5 }).replace(/'---/g, '').replace(/---'/g, '')}`;
    content += '\r\n';
    content += "if (typeof window !== 'undefined')";
    content += '\r\n';
    content += ' window.appContext.components = components;';
    await mkdir(path.resolve(CONSTANTS.ROOTPATH, './.nodejscart/build', buildPath), { recursive: true });
    await writeFile(path.resolve(CONSTANTS.ROOTPATH, '.nodejscart/build', buildPath, 'components.js'), content);
    const name = route.isAdmin === true ? `admin/${route.id}` : `site/${route.id}`;
    const entry = {};
    entry[name] = [
      path.resolve(CONSTANTS.ROOTPATH, './.nodejscart/build', buildPath, 'components.js'),
      path.resolve(CONSTANTS.LIBPATH, 'components', 'Hydrate.js')
    ];
    const compiler = webpack({
      mode: 'production', // "production" | "development" | "none"
      module: {
        rules: [
          {
            test: /\.jsx?$/,
            exclude: /(bower_components)/,
            use: {
              loader: 'babel-loader',
              options: {
                sourceType: 'unambiguous',
                cacheDirectory: true,
                presets: [
                  '@babel/preset-env',
                  '@babel/preset-react'
                ],
                plugins: [
                  '@babel/plugin-transform-runtime'
                ]
              }
            }
          }
        ]
      },
      // name: 'main',
      target: 'web',
      plugins: [
        // new MiniCssExtractPlugin({
        //     filename: '[name].css',
        // })
      ],

      entry,
      output: {
        path: path.resolve(CONSTANTS.ROOTPATH, './.nodejscart/build', buildPath),
        filename: '[fullhash].js'
      },
      resolve: {
        alias: {
          react: path.resolve(CONSTANTS.NODEMODULEPATH, 'react')
        }
      }
    });

    let cssFiles = '';
    let mTime = new Date('1988-10-08T03:24:00');
    compiler.hooks.afterCompile.tap(
      'PostCssBundling',
      (compilation) => {
        // eslint-disable-next-line no-underscore-dangle
        const list = compilation._modules;
        list.forEach((element) => {
          if (element.resource && element.resource.endsWith('.js')) {
            let filePath = element.resource.replace('.js', '.scss');
            filePath = filePath.split(path.sep).join(path.posix.sep);
            if (existsSync(filePath)) {
              cssFiles += `@import '${filePath}';`;
              const stats = statSync(filePath);
              if (stats.mtime > mTime) { mTime = stats.mtime; }
            }
          }
        });
      }
    );
    let hash;
    const webpackPromise = new Promise((resolve, reject) => {
      compiler.run((err, stats) => {
        if (err) {
          reject(err);
        } else if (stats.hasErrors()) {
          reject(new Error(stats.toString({
            errorDetails: true,
            warnings: true
          })));
        } else {
          hash = stats.hash;
          resolve(stats);
        }
      });
    });

    await webpackPromise;

    const cssOutput = new CleanCss({
      level: {
        2: {
          removeDuplicateRules: true // turns on removing duplicate rules
        }
      }
    }).minify(sass.renderSync({
      data: cssFiles
    }).css);

    await writeFile(path.resolve(CONSTANTS.ROOTPATH, '.nodejscart/build', buildPath, `${hash}.css`), cssOutput.styles);
    completed += 1;
    spinner.text = `Start building ☕☕☕☕☕\n${Array(completed).fill(green('█')).concat(total - completed > 0 ? Array(total - completed).fill('▒') : []).join('')}`;
  };
  promises.push(buildFunc());
});

Promise.all(promises)
  .then(() => {
    spinner.succeed(green('Building completed!!!\n') + boxen(green('Please run "npm run start" to start your website'), {
      title: 'EverShop', titleAlignment: 'center', padding: 1, margin: 1, borderColor: 'green'
    }));
    process.exit(0);
  })
  .catch((e) => {
    spinner.fail(`${red(e)}\n`);
    process.exit(0);
  });
