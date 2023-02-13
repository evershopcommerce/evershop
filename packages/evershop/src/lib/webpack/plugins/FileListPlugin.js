/* eslint-disable class-methods-use-this */
const fs = require('fs');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

exports.FileListPlugin = class FileListPlugin {
  apply(compiler) {
    compiler.hooks.emit.tapAsync('FileListPlugin', (compilation, callback) => {
      // eslint-disable-next-line no-underscore-dangle
      const list = compilation._modules;
      const modules = [];
      list.forEach((element) => {
        modules.push(element.resource);
      });
      // Create a header string for the generated file:
      let filelist = 'CSS:\n\n';
      // Loop through all compiled assets,
      // adding a new line item for each filename.

      modules.forEach((m) => {
        if (m) {
          const path = m.replace('.js', '.css');
          if (fs.existsSync(path))
            filelist += `${fs.readFileSync(path, 'utf-8')}\n`;
        }
      });

      // Insert this list into the webpack build as a new file asset:
      // eslint-disable-next-line no-param-reassign
      compilation.assets['filelist.md'] = {
        source() {
          return filelist;
        },
        size() {
          return filelist.length;
        }
      };

      callback();
    });
  }
};
