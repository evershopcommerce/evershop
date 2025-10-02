import CleanCSS from 'clean-css';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import webpack from 'webpack';
import { error } from '../../log/logger.js';
import { getRouteBuildPath } from '../getRouteBuildPath.js';
import { getTailwindConfig } from '../util/getTailwindConfig.js';

const { Compilation, sources } = webpack;

export class Tailwindcss {
  constructor(route) {
    this.route = route;
  }

  apply(compiler) {
    compiler.hooks.compilation.tap('Tailwindcss', (compilation) => {
      compilation.hooks.processAssets.tapAsync(
        {
          name: 'Tailwindcss',
          stage: compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE
        },
        async (assets, callback) => {
          try {
            await this.processRouteAssets(assets, compilation);
            callback();
          } catch (error) {
            callback(error);
          }
        }
      );
    });
  }

  async processRouteAssets(assets, compilation) {
    const processingPromises = [];
    const routeJSContent = this.getRouteJSContent(assets, this.route);
    const routeCSSAssets = this.getRouteCSSAssets(assets, this.route);
    for (const cssAsset of routeCSSAssets) {
      processingPromises.push(
        this.processCSSWithTailwind(
          cssAsset,
          routeJSContent,
          this.route,
          assets
        )
      );
    }

    await Promise.all(processingPromises);
  }

  getRouteJSContent(assets, route) {
    let combinedJSContent = '';
    const area = route.isAdmin ? 'admin' : 'frontStore';
    const jsFiles = Object.keys(assets).filter((name) => {
      return (
        (name.includes(route.id + '/') || /^\d/.test(name)) &&
        name.endsWith('.js')
      );
    });
    for (const jsFile of jsFiles) {
      combinedJSContent += assets[jsFile].source();
    }
    return combinedJSContent;
  }

  getRouteCSSAssets(assets, route) {
    return Object.keys(assets).filter(
      (name) =>
        (name.includes(route.id + '/') || /^\d/.test(name)) &&
        name.endsWith('.css')
    );
  }

  async processCSSWithTailwind(cssAssetName, jsContent, route, assets) {
    const originalCSS = assets[cssAssetName].source();

    const tailwindConfig = await getTailwindConfig(route.isAdmin);
    Object.assign(tailwindConfig, {
      content: [{ raw: jsContent, extension: 'js' }]
    });

    try {
      const result = await postcss([tailwindcss(tailwindConfig)]).process(
        originalCSS,
        { from: undefined }
      );
      const cleanCSS = new CleanCSS({
        level: 2, // Advanced optimizations
        returnPromise: true
      });

      const minified = await cleanCSS.minify(result.css);
      assets[cssAssetName] = {
        source: () => minified.styles,
        size: () => minified.styles.length
      };
    } catch (e) {
      error(e);
    }
  }
}
