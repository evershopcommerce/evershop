import webpack from 'webpack';
import middleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import { createConfigClient } from '../../lib/webpack/dev/createConfigClient.js';

type DevConfig = {
  admin: {
    compiler?: webpack.Compiler;
    devMiddleware?: ReturnType<typeof middleware>;
    hotMiddleware?: ReturnType<typeof webpackHotMiddleware>;
  };
  frontStore: {
    compiler?: webpack.Compiler | null;
    devMiddleware?: ReturnType<typeof middleware> | null;
    hotMiddleware?: ReturnType<typeof webpackHotMiddleware> | null;
  };
};

const webpackConfig = {
  admin: {},
  frontStore: {}
} as DevConfig;

function getWebpackCompiler(isAdmin: boolean) {
  const area = isAdmin ? 'admin' : 'frontStore';
  if (!webpackConfig[area].compiler) {
    webpackConfig[area].compiler = webpack(createConfigClient(isAdmin) as any);
  }
  return webpackConfig[area].compiler;
}

function getDevMiddleware(isAdmin: boolean) {
  const area = isAdmin ? 'admin' : 'frontStore';
  if (!webpackConfig[area].devMiddleware) {
    const compiler = getWebpackCompiler(isAdmin);
    const devMiddleware = middleware(compiler, {
      serverSideRender: true,
      publicPath: isAdmin ? '/backend/' : '/',
      stats: 'none'
    });
    devMiddleware.context.logger.info = () => {};
    webpackConfig[area].devMiddleware = devMiddleware;
  }
  return webpackConfig[area].devMiddleware;
}

function getHotMiddleware(isAdmin: boolean) {
  const area = isAdmin ? 'admin' : 'frontStore';
  if (!webpackConfig[area].hotMiddleware) {
    const compiler = getWebpackCompiler(isAdmin);
    const hotMiddleware = webpackHotMiddleware(compiler, {
      path: isAdmin ? `/__webpack_hmr_admin` : `/__webpack_hmr_frontstore`
    });
    webpackConfig[area].hotMiddleware = hotMiddleware;
  }
  return webpackConfig[area].hotMiddleware;
}

export { getWebpackCompiler, getDevMiddleware, getHotMiddleware };
