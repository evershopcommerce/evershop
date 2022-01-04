const { readdirSync, existsSync, statSync } = require('fs');
const { writeFile, mkdir, rmdir } = require("fs").promises;
const path = require("path");
const resolve = path.resolve;
const router = require("../../src/lib/routie");
const { addComponents, getComponentsByRoute } = require('../../src/lib/componee');
const webpack = require("webpack");
const { CONSTANTS } = require('../../src/lib/helpers');
const { inspect } = require('util');
const sass = require('node-sass');
const CleanCss = require('clean-css');
const colors = require('colors');
const ora = require('ora');
const boxen = require('boxen');

require('@babel/register')({
    presets: ['@babel/preset-react'],
    ignore: ['node_modules']
});

const spinner = ora({
    text: colors.green("Start building ☕☕☕☕☕"),
    spinner: "dots12"
}).start();
spinner.start();

/* Loading modules and initilize routes, components and services */
const modules = readdirSync(path.resolve(__dirname, "../../src/modules/"), { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

modules.forEach(element => {
    try {
        if (existsSync(resolve(__dirname, "../../src/modules", element, "routes.js")))
            require(resolve(__dirname, "../../src/modules", element, "routes.js"))(router); // routes.js must return a function
    } catch (e) {
        spinner.fail(colors.red(e) + "\n");
        process.exit(0);
    }
});

modules.forEach(element => {
    try {
        if (existsSync(resolve(__dirname, "../../src/modules", element, "components/site/components.js"))) {
            let components = require(resolve(__dirname, "../../src/modules", element, "components/site/components.js"));
            if (typeof components === 'object' && components !== null) {
                addComponents("site", components);
            }
        }
        if (existsSync(resolve(__dirname, "../../src/modules", element, "components/admin/components.js"))) {
            let components = require(resolve(__dirname, "../../src/modules", element, "components/admin/components.js"));
            if (typeof components === 'object' && components !== null) {
                addComponents("admin", components);
            }
        }
    } catch (e) {
        spinner.fail(colors.red(e) + "\n");
        process.exit(0);
    }
});

let routes = router.getRoutes();

// START BUILD Webpack

// Collect all "GET" only route
let getRoutes = routes.filter(r => (r.method.length === 1 && r.method[0].toUpperCase() === "GET"));
let promises = [];
let total = getRoutes.length - 1;
let completed = 0;

spinner.text = "Start building ☕☕☕☕☕\n" + Array(total).fill("▒").join("");
for (const route of getRoutes) {
    const buildFunc = async function () {
        let components = getComponentsByRoute(route.id);

        if (!components)
            return;
        for (let area in components) {
            for (let id in components[area]) {
                components[area][id]["component"] = `---require("${components[area][id]["source"]}")---`;
                delete components[area][id]["source"];
            }
        }
        let _p = route.isAdmin == true ? "./admin/" + route.id : "./site/" + route.id;
        await rmdir(path.resolve(CONSTANTS.ROOTPATH, "./.nodejscart/build", _p), { recursive: true });
        let content = `var components = module.exports = exports = ${inspect(components, { depth: 5 }).replace(/'---/g, "").replace(/---'/g, "")}`;
        content += "\r\n";
        content += "if (typeof window !== 'undefined')";
        content += "\r\n";
        content += " window.appContext.components = components;";
        await mkdir(path.resolve(CONSTANTS.ROOTPATH, "./.nodejscart/build", _p), { recursive: true });
        await writeFile(path.resolve(CONSTANTS.ROOTPATH, ".nodejscart/build", _p, "components.js"), content);
        let name = route.isAdmin === true ? `admin/${route.id}` : `site/${route.id}`;
        let entry = {};
        entry[name] = [
            path.resolve(CONSTANTS.ROOTPATH, "./.nodejscart/build", _p, "components.js"),
            path.resolve(CONSTANTS.LIBPATH, "components", "Hydrate.js"),
        ]
        const compiler = webpack({
            mode: "production", // "production" | "development" | "none"
            module: {
                rules: [
                    {
                        test: /\.jsx?$/,
                        exclude: /(bower_components)/,
                        use: {
                            loader: "babel-loader",
                            options: {
                                sourceType: "unambiguous",
                                cacheDirectory: true,
                                presets: [
                                    "@babel/preset-env",
                                    "@babel/preset-react"
                                ],
                                plugins: [
                                    "@babel/plugin-transform-runtime",
                                ]
                            }
                        }
                    }
                ]
            },
            // name: 'main',
            target: "web",
            plugins: [
                // new MiniCssExtractPlugin({
                //     filename: '[name].css',
                // })
            ],

            entry: entry,
            output: {
                path: path.resolve(CONSTANTS.ROOTPATH, "./.nodejscart/build", _p),
                filename: "[fullhash].js",
            },
            resolve: {
                alias: {
                    react: path.resolve(CONSTANTS.NODEMODULEPATH, 'react'),
                }
            }
        });

        let cssFiles = "";
        let mTime = new Date('1988-10-08T03:24:00');;
        compiler.hooks.afterCompile.tap(
            'PostCssBundling',
            (compilation) => {
                let list = compilation._modules;
                list.forEach(element => {
                    if (element.resource) {
                        let _path = element.resource.replace('.js', '.scss');
                        _path = _path.split(path.sep).join(path.posix.sep)
                        if (existsSync(_path)) {
                            cssFiles = cssFiles += `@import '${_path}';`;
                            const stats = statSync(_path);
                            if (stats.mtime > mTime)
                                mTime = stats.mtime;
                        }
                    }
                });
            }
        );
        var hash;
        let webpackPromise = new Promise((resolve, reject) => {
            compiler.run((err, stats) => {
                if (err) {
                    reject(err);
                } else if (stats.hasErrors()) {
                    reject(new Error(stats.toString({
                        errorDetails: true,
                        warnings: true
                    })));
                } else {
                    hash = stats.hash;
                    resolve(stats)
                }
            });
        });

        await webpackPromise;

        let cssOutput = new CleanCss({
            level: {
                2: {
                    removeDuplicateRules: true // turns on removing duplicate rules
                }
            }
        }).minify(sass.renderSync({
            data: cssFiles,
        }).css);

        await writeFile(path.resolve(CONSTANTS.ROOTPATH, ".nodejscart/build", _p, `${hash}.css`), cssOutput.styles);
        completed++;
        spinner.text = "Start building ☕☕☕☕☕\n" + Array(completed).fill(colors.green("█")).concat(total - completed > 0 ? Array(total - completed).fill("▒") : []).join("");
    }
    promises.push(buildFunc());
}
Promise.all(promises)
    .then(() => {
        spinner.succeed(colors.green("Building completed!!!\n") + boxen(colors.green('Please run "npm run start" to start your website'), { title: 'NodeJsCart', titleAlignment: 'center', padding: 1, margin: 1, borderColor: 'green' }))
        process.exit(0);
    })
    .catch((e) => {
        spinner.fail(colors.red(e) + "\n");
        process.exit(0);
    });