const path = require('path');
const { inspect } = require('util');
const { CONSTANTS } = require('../helpers');
const { getRoutes } = require('../router/Router');
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

function renderDevelopment(request, response) {
  const devMiddleware = get(response, 'locals.webpack.devMiddleware');
  const contextValue = {
    graphqlResponse: get(response, 'locals.graphqlResponse', {}),
    propsMap: get(response, 'locals.propsMap', {}),
  };

  if (!devMiddleware) { // In testing mode, we do not have devMiddleware
    response.send(`
            <html>
              <head>
                <title>${contextValue.metaTitle}</title>
                <script>var eContext = ${inspect(contextValue, { depth: 10, maxArrayLength: null })}</script>
              </head>
              <body>
              </body>
            </html>
            `);
    return;
  }

  const stats = devMiddleware.stats;
  //let stat = jsonWebpackStats.find(st => st.compilation.name === route.id);
  const { assetsByChunkName, outputPath } = stats.toJson();
  const route = request.locals.webpackMatchedRoute;
  response.send(`
            <!doctype html><html>
                <head>
                  <script>var eContext = ${inspect(contextValue, { depth: 10, maxArrayLength: null })}</script>
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

function renderProduction(request, response) {
  const routes = getRoutes()
  const route = response.statusCode === 404 ? routes.find((route) => route.id === 'notFound') : request.currentRoute;
  const { renderHtml } = require(path.resolve(getRouteBuildPath(route), 'server', 'index.js'));
  const assets = require(path.resolve(getRouteBuildPath(route), 'client', 'index.json'));
  const source = renderHtml(assets.js, assets.css, response.context);
  response.send(source);
}

module.exports.render = function render(request, response) {
  if (isProductionMode()) {
    renderProduction(request, response);
  } else {
    renderDevelopment(request, response);
  }
}