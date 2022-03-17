const fs = require('fs');

module.exports = exports = {};

exports.FileListPlugin = class FileListPlugin {
  apply(compiler) {
    // emit is asynchronous hook, tapping into it using tapAsync, you can use tapPromise/tap(synchronous) as well
    compiler.hooks.emit.tapAsync('FileListPlugin', (compilation, callback) => {
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
          if (fs.existsSync(path)) filelist += `${fs.readFileSync(path, 'utf-8')}\n`;
        }
      });

      // Insert this list into the webpack build as a new file asset:
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
