const { readdirSync, existsSync, statSync, readFileSync } = require('fs');
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
const { red, green } = require('kleur');
const ora = require('ora');
const boxen = require('boxen');

require('@babel/register')({
    presets: ['@babel/preset-react'],
    ignore: ['node_modules']
});

const spinner = ora({
    text: green("Start building ☕☕☕☕☕"),
    spinner: "dots12"
}).start();
spinner.start();

/* Loading modules and initilize routes, components and services */
const modules = readdirSync(path.resolve(__dirname, "../../src/modules/"), { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

// Load routes

modules.forEach(module => {
    try {
        let src = path.resolve(__dirname, "../../dist");
        // Check for routes
        if (existsSync(path.join(src, "modules", module, "controllers", "admin"))) {
            registerRoute(path.join(src, "modules", module, "controllers", "admin"), true, false);
        }

        if (existsSync(path.join(src, "modules", module, "controllers", "site"))) {
            registerRoute(path.join(src, "modules", module, "controllers", "site"), false, false);
        }

        if (existsSync(path.join(src, "modules", module, "apiControllers", "admin"))) {
            registerRoute(path.join(src, "modules", module, "apiControllers", "admin"), true, true);
        }

        if (existsSync(path.join(src, "modules", module, "apiControllers", "site"))) {
            registerRoute(path.join(src, "modules", module, "apiControllers", "site"), false, true);
        }
    } catch (e) {
        spinner.fail(red(e) + "\n");
        process.exit(0);
    }
});

modules.forEach(element => {
    try {
        if (existsSync(resolve(__dirname, "../../src/modules", element, "views/site/components.js"))) {
            let components = require(resolve(__dirname, "../../src/modules", element, "views/site/components.js"));
            if (typeof components === 'object' && components !== null) {
                addComponents("site", components);
            }
        }
        if (existsSync(resolve(__dirname, "../../src/modules", element, "views/admin/components.js"))) {
            let components = require(resolve(__dirname, "../../src/modules", element, "views/admin/components.js"));
            if (typeof components === 'object' && components !== null) {
                addComponents("admin", components);
            }
        }
    } catch (e) {
        spinner.fail(red(e) + "\n");
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
        spinner.text = "Start building ☕☕☕☕☕\n" + Array(completed).fill(green("█")).concat(total - completed > 0 ? Array(total - completed).fill("▒") : []).join("");
    }
    promises.push(buildFunc());
}
Promise.all(promises)
    .then(() => {
        spinner.succeed(green("Building completed!!!\n") + boxen(green('Please run "npm run start" to start your website'), { title: 'NodeJsCart', titleAlignment: 'center', padding: 1, margin: 1, borderColor: 'green' }))
        process.exit(0);
    })
    .catch((e) => {
        spinner.fail(red(e) + "\n");
        process.exit(0);
    });

/**
 * Scan for routes base on module path.
 */

function registerRoute(_path, isAdmin, isApi) {
    const routes = readdirSync(_path, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    routes.forEach(r => {
        if (/^[A-Za-z.]+$/.test(r) === true) {
            if (existsSync(path.join(_path, r, "route"))) {
                let lines = readFileSync(path.join(_path, r, "route"), 'utf-8');
                lines = lines.split(/\r?\n/).map(p => p.replace("\\\\", "\\"));
                let p = lines[1];
                if (isApi === true) {
                    p = "/v1" + p;
                }
                if (isAdmin === true)
                    router.registerAdminRoute(r, lines[0].split(',').map(e => e.trim()).filter(e => e !== ''), p);
                else
                    router.registerSiteRoute(r, lines[0].split(',').map(e => e.trim()).filter(e => e !== ''), p);
            }
        }
    });
}