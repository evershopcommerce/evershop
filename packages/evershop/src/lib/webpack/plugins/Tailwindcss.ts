import fs from 'fs';
import path from 'path';
import tailwindcss from '@tailwindcss/postcss';
import CleanCSS from 'clean-css';
import postcss from 'postcss';
import webpack from 'webpack';
import { Route } from '../../../types/route.js';
import { error } from '../../log/logger.js';

type WebpackCompiler = webpack.Compiler;
type WebpackCompilation = webpack.Compilation;
type WebpackAssets = webpack.Compilation['assets'];

export class Tailwindcss {
  private route: Route;

  constructor(route: Route) {
    this.route = route;
  }

  apply(compiler: WebpackCompiler): void {
    compiler.hooks.afterEmit.tapAsync(
      'Tailwindcss',
      async (compilation: WebpackCompilation, callback) => {
        try {
          await this.processRouteAssetsAfterEmit(compilation);
          callback();
        } catch (err) {
          callback(err as Error);
        }
      }
    );
  }

  async processRouteAssetsAfterEmit(
    compilation: WebpackCompilation
  ): Promise<void> {
    const outputPath = compilation.outputOptions.path;
    if (!outputPath) {
      return;
    }

    const processingPromises: Promise<void>[] = [];
    const routeCSSAssets = this.getRouteCSSAssets(
      compilation.assets,
      this.route
    );

    for (const cssAsset of routeCSSAssets) {
      processingPromises.push(
        this.processCSSWithTailwindFromDisk(cssAsset, outputPath)
      );
    }

    await Promise.all(processingPromises);
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

  async processCSSWithTailwindFromDisk(
    cssAssetName: string,
    outputPath: string
  ): Promise<void> {
    const cssFilePath = path.resolve(outputPath, cssAssetName);

    // Read the CSS file from disk
    if (!fs.existsSync(cssFilePath)) {
      error(`CSS file not found: ${cssFilePath}`);
      return;
    }

    const originalCSS = fs.readFileSync(cssFilePath, 'utf-8');

    // Process CSS with Tailwind
    let processedCSS = originalCSS;

    if (cssAssetName.includes(this.route.id)) {
      // Get the directory where the CSS file is located
      const cssDir = path.dirname(cssFilePath);

      // Find all JS files in the same directory (already on disk)
      const jsFiles = fs
        .readdirSync(cssDir)
        .filter((file) => file.endsWith('.js'));

      if (jsFiles.length === 0) {
        error(`No JS files found in ${cssDir}`);
        return;
      }

      // Reference the JS files for Tailwind scanning
      const sourceDirectives = jsFiles
        .map((file) => `@source "./${file}";`)
        .join('\n');

      processedCSS = `${sourceDirectives}
${originalCSS}`;
    }

    try {
      // Process with Tailwind
      const result = await postcss([tailwindcss()]).process(processedCSS, {
        from: cssFilePath
      });

      // Minify the result
      const cleanCSS = new CleanCSS({
        level: 2,
        returnPromise: true
      });

      const minified = await cleanCSS.minify(result.css);

      // Write the processed CSS back to disk
      fs.writeFileSync(cssFilePath, minified.styles, 'utf-8');
    } catch (e) {
      error(e);
    }
  }
}
