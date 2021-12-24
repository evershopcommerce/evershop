const inspect = require("util").inspect;
const { writeFile, mkdir, rmdir } = require("fs/promises");
const { existsSync, statSync, readdirSync } = require('fs');
const webpack = require("webpack");
const path = require("path");
const { CONSTANTS } = require("../../../lib/helpers");
const { buildAdminUrl, buildSiteUrl } = require("../../../lib/routie");
const { getComponentsByRoute } = require('../../../lib/componee');
var sass = require('node-sass');
var CleanCss = require('clean-css');

module.exports = async function (request, response) {
    let route = request._route;

    /** Only create bundle file for GET and "text/html" route */
    //FIXME: This should be enhanced
    if ((route.method.length > 1 || route.method[0] != "GET") || (response.get("Content-Type") && !response.get("Content-Type").includes("text/html"))) {
        return;
    }

    if (['adminStaticAsset', 'staticAsset'].includes(route.id)) {
        return;
    }
    /** This middleware only required for development */
    if (process.env.NODE_ENV === 'production') {
        let _path = route.isAdmin == true ? "./admin/" + route.id : "./site/" + route.id;
        let hash;
        if (route.isAdmin === true) {
            const bundles = readdirSync(path.resolve(CONSTANTS.ROOTPATH, "./.nodejscart/build/admin", route.id), { withFileTypes: true })
                .filter(dirent => dirent.isFile())
                .map(dirent => dirent.name);
            bundles.forEach(b => {
                if (b.endsWith(".css")) {
                    hash = b.substring(0, b.indexOf(".css"));
                }
            })
            response.context.bundleJs = buildAdminUrl("adminStaticAsset", [`${_path}/${hash}.js`]);
            response.context.bundleCss = buildAdminUrl("adminStaticAsset", [`${_path}/${hash}.css`]);
        } else {
            const bundles = readdirSync(path.resolve(CONSTANTS.ROOTPATH, "./.nodejscart/build/site", route.id), { withFileTypes: true })
                .filter(dirent => dirent.isFile())
                .map(dirent => dirent.name);
            bundles.forEach(b => {
                if (b.endsWith(".css")) {
                    hash = b.substring(0, b.indexOf(".css"));
                }
            })
            response.context.bundleJs = buildSiteUrl("staticAsset", [`${_path}/${hash}.js`]);
            response.context.bundleCss = buildSiteUrl("staticAsset", [`${_path}/${hash}.css`]);
        }
        return;
    }

    let _p = route.isAdmin == true ? "./admin/" + route.id : "./site/" + route.id;
    if (route.__BUILDREQUIRED__ == false) {
        if (request.isAdmin === true) {
            response.context.bundleJs = buildAdminUrl("adminStaticAsset", [`${_p}/${route.__BUNDLEHASH__}.js`]);
            response.context.bundleCss = buildAdminUrl("adminStaticAsset", [`${_p}/${route.__BUNDLEHASH__}.css`]);
        } else {
            response.context.bundleJs = buildSiteUrl("staticAsset", [`${_p}/${route.__BUNDLEHASH__}.js`]);
            response.context.bundleCss = buildSiteUrl("staticAsset", [`${_p}/${route.__BUNDLEHASH__}.css`]);
        }
        return;
    }
    if (route.__BUILDING__ === true) {
        await new Promise((resolve, reject) => {
            var timer = 0;
            var check = setInterval(function () {
                // We only wait for 1 min maximum for the bundle
                if (timer > 60000) {
                    clearInterval(check);
                    resolve(0);
                }
                if (route.__BUNDLEHASH__) {
                    clearInterval(check);
                    if (request.isAdmin === true) {
                        response.context.bundleJs = buildAdminUrl("adminStaticAsset", [`${_p}/${route.__BUNDLEHASH__}.js`]);
                        response.context.bundleCss = buildAdminUrl("adminStaticAsset", [`${_p}/${route.__BUNDLEHASH__}.css`]);
                    } else {
                        response.context.bundleJs = buildSiteUrl("staticAsset", [`${_p}/${route.__BUNDLEHASH__}.js`]);
                        response.context.bundleCss = buildSiteUrl("staticAsset", [`${_p}/${route.__BUNDLEHASH__}.css`]);
                    }
                    resolve(1);
                }
                timer += 200;
            }, 200);
        });
        return;
    }
    route.__BUILDING__ = true;
    await rmdir(path.resolve(CONSTANTS.ROOTPATH, "./.nodejscart/build", _p), { recursive: true });

    let components = JSON.parse(JSON.stringify(getComponentsByRoute(route.id)));
    for (let area in components) {
        for (let id in components[area]) {
            components[area][id]["component"] = `---require("${components[area][id]["source"]}")---`;
            delete components[area][id]["source"];
        }
    }
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
        mode: "development", // "production" | "development" | "none"
        module: {
            rules: [
                {
                    test: /\.jsx?$/,
                    exclude: /(node_modules|bower_components)/,
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

    if (request.isAdmin === true) {
        response.context.bundleJs = buildAdminUrl("adminStaticAsset", [`${_p}/${hash}.js`]);
        response.context.bundleCss = buildAdminUrl("adminStaticAsset", [`${_p}/${hash}.css`]);
    } else {
        response.context.bundleJs = buildSiteUrl("staticAsset", [`${_p}/${hash}.js`]);
        response.context.bundleCss = buildSiteUrl("staticAsset", [`${_p}/${hash}.css`]);
    }

    route.__BUILDREQUIRED__ = false;
    route.__BUNDLEHASH__ = hash;
    route.__BUILDING__ = false;
};