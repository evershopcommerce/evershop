import CleanCSS from 'clean-css';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import webpack from 'webpack';
import { Route } from '../../../types/route.js';
import { error } from '../../log/logger.js';
import { getTailwindConfig } from '../util/getTailwindConfig.js';

const { Compilation, sources } = webpack;

type WebpackCompiler = webpack.Compiler;
type WebpackCompilation = webpack.Compilation;
type WebpackAssets = webpack.Compilation['assets'];

export class Tailwindcss {
  private route: Route;

  constructor(route: Route) {
    this.route = route;
  }

  apply(compiler: WebpackCompiler): void {
    compiler.hooks.compilation.tap(
      'Tailwindcss',
      (compilation: WebpackCompilation) => {
        compilation.hooks.processAssets.tapAsync(
          {
            name: 'Tailwindcss',
            stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE
          },
          async (assets, callback) => {
            try {
              await this.processRouteAssets(assets);
              callback();
            } catch (err) {
              callback(err as Error);
            }
          }
        );
      }
    );
  }

  async processRouteAssets(assets: WebpackAssets): Promise<void> {
    const processingPromises: Promise<void>[] = [];
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

  getRouteJSContent(assets: WebpackAssets, route: Route): string {
    let combinedJSContent = '';
    const jsFiles = Object.keys(assets).filter((name) => {
      // Normalize path separators for cross-platform compatibility
      const normalizedName = name.replace(/\\/g, '/');
      return (
        (normalizedName.includes(route.id + '/') ||
          /^\d/.test(normalizedName)) &&
        normalizedName.endsWith('.js')
      );
    });
    for (const jsFile of jsFiles) {
      const source = assets[jsFile].source();
      combinedJSContent +=
        typeof source === 'string' ? source : source.toString();
    }
    return combinedJSContent;
  }

  getRouteCSSAssets(assets: WebpackAssets, route: Route): string[] {
    const results = Object.keys(assets).filter((name) => {
      // Normalize path separators for cross-platform compatibility
      const normalizedName = name.replace(/\\/g, '/');
      return (
        (normalizedName.includes(route.id + '/') ||
          /^\d/.test(normalizedName)) &&
        normalizedName.endsWith('.css')
      );
    });

    return results;
  }

  async processCSSWithTailwind(
    cssAssetName: string,
    jsContent: string,
    route: Route,
    assets: WebpackAssets
  ): Promise<void> {
    const originalCSSSource = assets[cssAssetName].source();
    const originalCSS =
      typeof originalCSSSource === 'string'
        ? originalCSSSource
        : originalCSSSource.toString();

    const tailwindDirectives = `
@tailwind base;
@tailwind components;
@tailwind utilities;

`;
    const cssWithDirectives = tailwindDirectives + originalCSS;
    const tailwindConfig = await getTailwindConfig(route.isAdmin);
    Object.assign(tailwindConfig, {
      content: [{ raw: jsContent, extension: 'js' }]
    });

    try {
      const result = await postcss([tailwindcss(tailwindConfig)]).process(
        cssAssetName.includes(route.id) ? cssWithDirectives : originalCSS,
        { from: undefined }
      );
      const cleanCSS = new CleanCSS({
        level: 2, // Advanced optimizations
        returnPromise: true
      });

      const minified = await cleanCSS.minify(result.css);
      assets[cssAssetName] = new sources.RawSource(minified.styles);
    } catch (e) {
      error(e);
    }
  }
}
