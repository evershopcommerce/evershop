const fs = require('fs');
const { join } = require('path');
const postcss = require('postcss');
const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer');
const CleanCSS = require('clean-css');
const { CONSTANTS } = require('../../helpers');
const { Compilation, sources } = require('webpack');

module.exports = exports = {};

exports.Tailwindcss = class Tailwindcss {
  constructor(chunks, route) {
    this.chunks = chunks;
    this.route = route;
  }

  apply(compiler) {
    compiler.hooks.compilation.tap('Tailwindcss', compilation => {
      compilation.hooks.processAssets.tap({
        name: 'Tailwindcss',
        stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS, // see below for more stages
      }, assets => {
        try {
          let cssAsset;
          let jsAsset;
          Object.entries(assets).forEach((asset) => {
            const [pathname, source] = asset;
            if (pathname.endsWith('.css') && pathname.includes(this.chunks + '/')) {
              cssAsset = asset;
            }
            if (pathname.endsWith('.js') && pathname.includes(this.chunks + '/')) {
              jsAsset = asset;
            }
          });
          if (cssAsset && jsAsset) {
            // Use PostCss to parse tailwind.css with tailwind config
            const defaultTailwindConfig = this.route.isAdmin ?
              require('@evershop/evershop/src/modules/cms/services/tailwind.admin.config.js') :
              require('@evershop/evershop/src/modules/cms/services/tailwind.frontStore.config.js');

            let tailwindConfig = {};
            if (this.route.isAdmin) {
              if (fs.existsSync(join(CONSTANTS.ROOTPATH, 'tailwind.admin.config.js'))) {
                tailwindConfig = require(join(CONSTANTS.ROOTPATH, 'tailwind.admin.config.js'));
              }
            } else {
              if (fs.existsSync(join(CONSTANTS.ROOTPATH, 'tailwind.frontStore.config.js'))) {
                tailwindConfig = require(join(CONSTANTS.ROOTPATH, 'tailwind.frontStore.config.js'));
              }
            }
            // Merge defaultTailwindConfig with tailwindConfigJs
            const mergedTailwindConfig = Object.assign(defaultTailwindConfig, tailwindConfig);
            // get list of modules that are used in the webpack build

            mergedTailwindConfig.content = [{
              raw: jsAsset[1].source(),
            }];
            const css = cssAsset[1].source();
            let tailwind = css.match(/\/\*beginTailwind\*\/(.*)\/\*endTailwind\*\//s);
            if (tailwind) {
              tailwind = tailwind[1];
            }
            // Postcss await
            const tailWindCss = new CleanCSS().minify(postcss([
              tailwindcss(mergedTailwindConfig),
              autoprefixer
            ]).process(tailwind, {
              from: undefined,
            }).css);

            compilation.updateAsset(cssAsset[0], source => {
              // match any characters between /*beginTailwind*/ and /*endTailwind*/ including line breaks
              return new sources.RawSource(
                source.source().replace(/\/\*beginTailwind\*\/(.*?)\/\*endTailwind\*\//s, tailWindCss.styles)
              );
            });
          }
        } catch (e) {
          console.log(e);
        }
      })
    })
  }
};
