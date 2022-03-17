/* eslint-disable no-underscore-dangle */
const { inspect } = require('util');
const { writeFile, mkdir, rmdir } = require('fs/promises');
const { existsSync, statSync, readdirSync } = require('fs');
const webpack = require('webpack');
const path = require('path');
const sass = require('node-sass');
const CleanCss = require('clean-css');
const { CONSTANTS } = require('./helpers');
const { buildUrl } = require('./router/buildUrl');
const { getComponentsByRoute } = require('./componee/getComponentByRoute');

module.exports = async (request, response, route) => {
  /** Only create bundle file for GET and "text/html" route */
  // FIXME: This should be enhanced
  if ((route.method.length > 1 || route.method[0] !== 'GET') || (response.get('Content-Type') && !response.get('Content-Type').includes('text/html'))) {
    return;
  }

  if (['adminStaticAsset', 'staticAsset'].includes(route.id)) {
    return;
  }

  const scopePath = route.isAdmin === true ? `./admin/${route.id}` : `./site/${route.id}`;
  /** This middleware only required for development */
  if (process.env.NODE_ENV === 'production') {
    let hash;
    if (route.isAdmin === true) {
      const bundles = readdirSync(path.resolve(CONSTANTS.ROOTPATH, './.nodejscart/build/admin', route.id), { withFileTypes: true })
        .filter((dirent) => dirent.isFile())
        .map((dirent) => dirent.name);
      bundles.forEach((b) => {
        if (b.endsWith('.css')) {
          hash = b.substring(0, b.indexOf('.css'));
        }
      });
      response.context.bundleJs = buildUrl('adminStaticAsset', [`${scopePath}/${hash}.js`]);
      response.context.bundleCss = buildUrl('adminStaticAsset', [`${scopePath}/${hash}.css`]);
    } else {
      const bundles = readdirSync(path.resolve(CONSTANTS.ROOTPATH, './.nodejscart/build/site', route.id), { withFileTypes: true })
        .filter((dirent) => dirent.isFile())
        .map((dirent) => dirent.name);
      bundles.forEach((b) => {
        if (b.endsWith('.css')) {
          hash = b.substring(0, b.indexOf('.css'));
        }
      });
      response.context.bundleJs = buildUrl('staticAsset', [`${scopePath}/${hash}.js`]);
      response.context.bundleCss = buildUrl('staticAsset', [`${scopePath}/${hash}.css`]);
    }
    return;
  }

  if (route.__BUILDREQUIRED__ === false) {
    if (request.isAdmin === true) {
      response.context.bundleJs = buildUrl('adminStaticAsset', [`${scopePath}/${route.__BUNDLEHASH__}.js`]);
      response.context.bundleCss = buildUrl('adminStaticAsset', [`${scopePath}/${route.__BUNDLEHASH__}.css`]);
    } else {
      response.context.bundleJs = buildUrl('staticAsset', [`${scopePath}/${route.__BUNDLEHASH__}.js`]);
      response.context.bundleCss = buildUrl('staticAsset', [`${scopePath}/${route.__BUNDLEHASH__}.css`]);
    }
    return;
  }
  if (route.__BUILDING__ === true) {
    await new Promise((resolve, reject) => {
      let timer = 0;
      // eslint-disable-next-line no-var
      var check = setInterval(() => {
        // We only wait for 1 min maximum for the bundle
        if (timer > 60000) {
          clearInterval(check);
          reject(new Error('Something wrong with bundling'));
        }
        if (route.__BUNDLEHASH__) {
          clearInterval(check);
          if (request.isAdmin === true) {
            response.context.bundleJs = buildUrl('adminStaticAsset', [`${scopePath}/${route.__BUNDLEHASH__}.js`]);
            response.context.bundleCss = buildUrl('adminStaticAsset', [`${scopePath}/${route.__BUNDLEHASH__}.css`]);
          } else {
            response.context.bundleJs = buildUrl('staticAsset', [`${scopePath}/${route.__BUNDLEHASH__}.js`]);
            response.context.bundleCss = buildUrl('staticAsset', [`${scopePath}/${route.__BUNDLEHASH__}.css`]);
          }
          resolve(1);
        }
        timer += 200;
      }, 200);
    });
    return;
  }
  // eslint-disable-next-line no-param-reassign
  route.__BUILDING__ = true;
  await rmdir(path.resolve(CONSTANTS.ROOTPATH, './.nodejscart/build', scopePath), { recursive: true });

  const components = JSON.parse(JSON.stringify(getComponentsByRoute(route.id)));
  Object.keys(components).forEach((area) => {
    Object.keys(components[area]).forEach((id) => {
      components[area][id].component = `---require("${components[area][id].source}")---`;
      delete components[area][id].source;
    });
  });
  const content = `var components = module.exports = exports = ${inspect(components, { depth: 5 }).replace(/'---/g, '').replace(/---'/g, '')}`;
  await mkdir(path.resolve(CONSTANTS.ROOTPATH, './.nodejscart/build', scopePath), { recursive: true });
  await writeFile(path.resolve(CONSTANTS.ROOTPATH, '.nodejscart/build', scopePath, 'components.js'), content);
  const name = route.isAdmin === true ? `admin/${route.id}` : `site/${route.id}`;
  const entry = {};
  entry[name] = [
    path.resolve(CONSTANTS.ROOTPATH, './.nodejscart/build', scopePath, 'components.js'),
    path.resolve(CONSTANTS.LIBPATH, 'components', 'Hydrate.js'),
    path.resolve(CONSTANTS.LIBPATH, 'webpack/pageData.json')
  ];
  const compiler = webpack({
    mode: 'development', // "production" | "development" | "none"
    module: {
      rules: [
        {
          test: /\.jsx?$/,
          exclude: /(node_modules|bower_components)/,
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
        },
        {
          test: /getComponents\.js/,
          use: [
            {
              loader: path.resolve(CONSTANTS.LIBPATH, 'loader.js'),
              options: {
                componentsPath: path.resolve(CONSTANTS.ROOTPATH, './.nodejscart/build', scopePath, 'components.js')
              }
            }
          ]
        },
        {
          test: /getPageData\.js/,
          use: [
            {
              loader: path.resolve(CONSTANTS.LIBPATH, 'dataLoader.js')
            }
          ]
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
      path: path.resolve(CONSTANTS.ROOTPATH, './.nodejscart/build', scopePath),
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
      const list = compilation._modules;
      list.forEach((element) => {
        if (element.resource) {
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

  await writeFile(path.resolve(CONSTANTS.ROOTPATH, '.nodejscart/build', scopePath, `${hash}.css`), cssOutput.styles);

  if (request.isAdmin === true) {
    response.context.bundleJs = buildUrl('adminStaticAsset', [`${scopePath}/${hash}.js`]);
    response.context.bundleCss = buildUrl('adminStaticAsset', [`${scopePath}/${hash}.css`]);
  } else {
    response.context.bundleJs = buildUrl('staticAsset', [`${scopePath}/${hash}.js`]);
    response.context.bundleCss = buildUrl('staticAsset', [`${scopePath}/${hash}.css`]);
  }

  // eslint-disable-next-line no-param-reassign
  route.__BUILDREQUIRED__ = false;
  // eslint-disable-next-line no-param-reassign
  route.__BUNDLEHASH__ = hash;
  // eslint-disable-next-line no-param-reassign
  route.__BUILDING__ = false;
};
