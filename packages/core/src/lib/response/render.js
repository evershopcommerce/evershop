const path = require('path');
const { inspect } = require('util');
const { CONSTANTS } = require('../helpers');
const { get } = require('../util/get');
const isProductionMode = require('../util/isProductionMode');
const { getRouteBuildPath } = require('../webpack/getRouteBuildPath');

function normalizeAssets(assets) {
  if (typeof assets === 'object' &&
    !Array.isArray(assets) &&
    assets !== null
  ) {
    return Object.values(assets);
  }

  return Array.isArray(assets) ? assets : [assets];
}

function renderDevelopment(response, route) {
  const devMiddleware = get(response, 'locals.webpack.devMiddleware');
  if (!devMiddleware) { // In testing mode, we do not have devMiddleware
    response.send(`
            <html>
              <head>
                <title>${response.context.metaTitle}</title>
                <script>var eContext = ${inspect(response.context, { depth: 10, maxArrayLength: null })}</script>
              </head>
              <body>
              </body>
            </html>
            `);
    return;
  }

  const jsonWebpackStats = devMiddleware.stats.stats;
  let stat = jsonWebpackStats.find(st => st.compilation.name === route.id);
  const { assetsByChunkName, outputPath } = stat.toJson();
  response.send(`
            <!doctype html><html>
                <head>
                  <script>var eContext = ${inspect(response.context, { depth: 10, maxArrayLength: null })}</script>
                </head>
                <body>
                <div id="app"></div>
                 ${normalizeAssets(assetsByChunkName[route.id])
      .filter((path) => path.endsWith(".js"))
      .map((path) => `<script defer src="/${response.statusCode === 404 ? 'notFound.js' : path}"></script>`)
      .join("\n")}
                </body>
            </html>
            `)
}

function renderProduction(response, route) {
  const { renderHtml } = require(path.resolve(getRouteBuildPath(route), 'server', 'index.js'));
  const bundleJs = require(CONSTANTS.BUILDPATH, 'index.json')
    .filter(
      (item) => item.includes('vendors') || item.includes(route.id)
    );
  const source = renderHtml(bundleJs, response.context);
  response.send(source);
}

module.exports.render = function render(response, route) {
  if (isProductionMode()) {
    renderProduction(response, route);
  } else {
    renderDevelopment(response, route);
  }
}