const fs = require('fs');

module.exports = exports = {};

exports.Tailwindcss = class Tailwindcss {
  apply(compiler) {
    compiler.hooks.compilation.tap('Tailwindcss', compilation => {
      compilation.hooks.finishModules.tap('Tailwindcss', modules => {
        try {
          //console.log('modules', modules.map(m => m.resource));
          // modules is a Set of all modules
          let tailwindcss = undefined;
          modules.forEach((module) => {
            if (module.resource && module.resource.includes('tailwind.scss')) {
              tailwindcss = module;
            }
          });
          //console.log(tailwindcss)
          if (tailwindcss) {
            console.log('found tailwindcss');
            compilation._buildModule(tailwindcss, err => {
              if (err) {
                console.log('err', err);
              } else {
                console.log('done');
              }
            });
          }

        } catch (e) {
          console.log(e);
        }
      })
    })
  }
};
