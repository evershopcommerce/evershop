const inspect = require("util").inspect;
const { writeFile, mkdir, rmdir } = require("fs/promises");
const { existsSync, readFileSync, writeFileSync, statSync, renameSync } = require('fs');
const webpack = require("webpack");
const path = require("path");
const { CONSTANTS } = require("../../../lib/helpers");
const { buildAdminUrl, buildSiteUrl } = require("../../../lib/routie");
const { getComponentsByRoute } = require('../../../lib/componee');
const postcss = require("postcss");
const postcssPresetEnv = require('postcss-preset-env');
const atImport = require("postcss-import");
var sass = require('node-sass');
var CleanCss = require('clean-css');
module.exports = async function (request, response) {
    let route = request._route;
    /** This middleware only required for development */
    if (process.env.NODE_ENV === 'production' || ['adminStaticAsset', 'siteStaticAsset'].includes(route.id)) {
        return;
    }

    /** Only create bundle file for GET and "text/html" route */
    //FIXME: This should be enhanced
    if ((route.method.length > 1 || route.method[0] != "GET") || (response.get("Content-Type") && !response.get("Content-Type").includes("text/html")))
        return false;

    let _p = route.isAdmin == true ? "./admin/" + route.id : "./site/" + route.id;
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
        path.resolve(CONSTANTS.LIBPATH, "components", "hydrate.js"),
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
                        // let cssss = readFileSync(path, "utf8");
                        // let css = sass.renderSync({ file: path });
                        // postCssImportPromises.push(
                        //     postcss()
                        //         .use(postcssPresetEnv({ stage: 0 }))
                        //         .process(css.css, {
                        //             from: path
                        //         })
                        // );
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

    // let postCssProcess = async () => {
    //     let results = await Promise.all(postCssImportPromises);
    //     let css = "";
    //     results.forEach(result => {
    //         css += result.css + "\r\n";
    //     });
    //     await writeFile(path.resolve(CONSTANTS.ROOTPATH, ".nodejscart/build", _p, `${hash}.css`), css);
    // };


    await webpackPromise;
    /** Start bundling css */
    /** Check if Css file was modified from the last build */
    // if (request.session.cssLastMofified === undefined || mTime > new Date(request.session.cssLastMofified)) {
    //     console.log(mTime);
    //     let cssOutput = new CleanCss({
    //         level: {
    //             2: {
    //                 removeDuplicateRules: true // turns on removing duplicate rules
    //             }
    //         }
    //     }).minify(sass.renderSync({
    //         data: cssFiles,
    //     }).css);

    //     await writeFile(path.resolve(CONSTANTS.ROOTPATH, ".nodejscart/build", _p, `${hash}.css`), cssOutput.styles);
    //     request.session.cssLastMofified = mTime;
    // } else {

    // }

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
};