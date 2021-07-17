const inspect = require("util").inspect;
const { writeFile, mkdir, rmdir } = require("fs/promises");
const { existsSync, readFileSync } = require('fs');
const webpack = require("webpack");
const path = require("path");
const { CONSTANTS } = require("../../../lib/helpers");
const { buildAdminUrl, buildSiteUrl } = require("../../../lib/routie");
const { getComponentsByRoute } = require('../../../lib/componee');
const postcss = require("postcss");
const postcssPresetEnv = require('postcss-preset-env');

module.exports = async function (request, response) {
    /** This middleware only required for development */
    if (process.env.NODE_ENV === 'production') {
        return next();
    }

    /** Get list of components for current route */
    let route = request._route;
    /** Only create bundle file for GET and "text/html" route */
    //FIXME: This should be enhanced
    if ((route.method.length > 1 || route.method[0] != "GET") || (response.get("Content-Type") && !response.get("Content-Type").includes("text/html")))
        return false;

    let _p = route.isAdmin == true ? "./admin/" + route.id : "./site/" + route.id;
    await rmdir(path.resolve(CONSTANTS.CACHEPATH, _p), { recursive: true });

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
    await mkdir(path.resolve(CONSTANTS.ROOTPATH, "./.nodejscart/", _p), { recursive: true });
    await writeFile(path.resolve(CONSTANTS.ROOTPATH, ".nodejscart/", _p, "components.js"), content);
    let name = route.isAdmin === true ? `admin/${route.id}/bundle` : `site/${route.id}/bundle`;
    let entry = {};
    entry[name] = [
        path.resolve(CONSTANTS.ROOTPATH, "./.nodejscart/", _p, "components.js"),
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
            path: path.resolve(CONSTANTS.ROOTPATH, "./public/build"),
            filename: "[name].[fullhash].js",
        }
    });

    let postCssImportPromises = [];
    compiler.hooks.afterCompile.tap(
        'SourceMapDevToolModuleOptionsPlugin',
        (compilation) => {
            let list = compilation._modules;
            list.forEach(element => {
                if (element.resource) {
                    let path = element.resource.replace('.js', '.scss');
                    if (existsSync(path)) {
                        let css = readFileSync(path, "utf8");
                        postCssImportPromises.push(
                            postcss()
                                .use(postcssPresetEnv({ stage: 0 }))
                                .process(css, {
                                    from: path
                                })
                        );
                    }
                }
            });
        }
    );

    var hash;
    let webpackPromise = new Promise((resolve, reject) => {
        compiler.run((err, stats) => {
            if (err || stats.hasErrors()) {
                reject(err);
            } else {
                hash = stats.hash;
                resolve(stats)
            }
        });
    });

    let postCssProcess = async () => {
        let results = await Promise.all(postCssImportPromises);
        let css = "";
        results.forEach(result => {
            css += result.css + "\r\n";
        });
        await writeFile(path.resolve(CONSTANTS.ROOTPATH, "public/build", _p, `${hash}.css`), css);
    };


    await webpackPromise;
    await postCssProcess();
    if (request.isAdmin === true) {
        response.context.bundleJs = buildAdminUrl("adminStaticAsset", [`/build/${_p}/bundle.${hash}.js`]);
        response.context.bundleCss = buildAdminUrl("adminStaticAsset", [`/build/${_p}/${hash}.css`]);
    } else {
        response.context.bundleJs = buildSiteUrl("staticAsset", [`/build/${_p}/bundle.${hash}.js`]);
        response.context.bundleCss = buildSiteUrl("staticAsset", [`/build/${_p}/${hash}.css`]);
    }
};