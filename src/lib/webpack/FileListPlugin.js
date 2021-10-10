const fs = require('fs');

module.exports = exports = {};

exports.FileListPlugin = class FileListPlugin {
    apply(compiler) {
        // emit is asynchronous hook, tapping into it using tapAsync, you can use tapPromise/tap(synchronous) as well
        compiler.hooks.emit.tapAsync('FileListPlugin', (compilation, callback) => {
            let list = compilation._modules;
            let modules = [];
            list.forEach(element => {
                modules.push(element.resource);
            });
            // Create a header string for the generated file:
            var filelist = 'CSS:\n\n';
            // Loop through all compiled assets,
            // adding a new line item for each filename.

            modules.forEach(m => {
                if (m) {
                    let path = m.replace('.js', '.css')
                    if (fs.existsSync(path))
                        filelist += fs.readFileSync(path, "utf-8") + '\n';
                }
            });

            // Insert this list into the webpack build as a new file asset:
            compilation.assets['filelist.md'] = {
                source: function () {
                    return filelist;
                },
                size: function () {
                    return filelist.length;
                }
            };

            callback();
        });
    }
}