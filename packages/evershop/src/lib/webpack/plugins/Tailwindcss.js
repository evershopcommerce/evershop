/* eslint-disable global-require */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-destructuring */
const postcss = require('postcss');
const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer');
const CleanCSS = require('clean-css');
const { Compilation, sources } = require('webpack');
const { getTailwindConfig } = require('../util/getTailwindConfig');
const { error } = require('../../log/logger');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

exports.Tailwindcss = class Tailwindcss {
  constructor(chunks, route) {
    this.chunks = chunks;
    this.route = route;
  }

  apply(compiler) {
    compiler.hooks.compilation.tap('Tailwindcss', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'Tailwindcss',
          stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS // see below for more stages
        },
        (assets) => {
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
              const mergedTailwindConfig = getTailwindConfig(this.route);
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
                return;
              }
              // Postcss await
              const tailWindCss = new CleanCSS().minify(
                postcss([
                  tailwindcss(mergedTailwindConfig),
                  autoprefixer
                ]).process(tailwind, {
                  from: undefined
                }).css
              );

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
            }
          } catch (e) {
            error(e);
          }
        }
      );
    });
  }
};
