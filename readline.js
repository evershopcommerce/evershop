var sass = require('node-sass');
var CleanCss = require('clean-css');

var result = sass.renderSync({
    file: './css.scss',
});
var output = new CleanCss({
    level: {
        2: {
            removeDuplicateRules: true // turns on removing duplicate rules
        }
    }
}).minify(result.css);

console.log(output)