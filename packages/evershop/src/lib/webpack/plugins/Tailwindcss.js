import autoprefixer from 'autoprefixer';
import CleanCSS from 'clean-css';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import webpack from 'webpack';
import { error } from '../../log/logger.js';
import { getTailwindConfig } from '../util/getTailwindConfig.js';

const { Compilation, sources } = webpack;

export class Tailwindcss {
  constructor(chunks, route) {
    this.chunks = chunks;
    this.route = route;
  }

  apply(compiler) {
    compiler.hooks.compilation.tap('Tailwindcss', (compilation) => {
      compilation.hooks.processAssets.tapAsync(
        {
          name: 'Tailwindcss',
          stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS
        },
        async (assets, callback) => {
          try {
            let cssAsset;
            let jsAsset;
            Object.entries(assets).forEach((asset) => {
              const [pathname] = asset;
              if (
                pathname.endsWith('.css') &&
                pathname.includes(`${this.chunks}/`)
              ) {
                cssAsset = asset;
              }
              if (
                pathname.endsWith('.js') &&
                pathname.includes(`${this.chunks}/`)
              ) {
                jsAsset = asset;
              }
            });
            if (cssAsset && jsAsset) {
              const mergedTailwindConfig = await getTailwindConfig(this.route);
              mergedTailwindConfig.content = [
                {
                  raw: jsAsset[1].source()
                }
              ];
              const css = cssAsset[1].source();
              let tailwind = css.match(
                /\/\*beginTailwind\*\/(.*)\/\*endTailwind\*\//s
              );
              if (tailwind) {
                tailwind = tailwind[1];
              } else {
                /** Tailwindcss is removed by theme */
                callback();
                return;
              }
              // Postcss await
              const tailWindCss = await postcss([
                tailwindcss(mergedTailwindConfig),
                autoprefixer
              ])
                .process(tailwind, { from: undefined })
                .then((result) => new CleanCSS().minify(result.css));
              // match any characters between /*beginTailwind*/
              // and /*endTailwind*/ including line breaks
              compilation.updateAsset(
                cssAsset[0],
                (source) =>
                  new sources.RawSource(
                    source
                      .source()
                      .replace(
                        /\/\*beginTailwind\*\/(.*?)\/\*endTailwind\*\//s,
                        tailWindCss.styles
                      )
                  )
              );
              callback();
            } else {
              callback();
            }
          } catch (e) {
            error(e);
            callback();
          }
        }
      );
    });
  }
}
