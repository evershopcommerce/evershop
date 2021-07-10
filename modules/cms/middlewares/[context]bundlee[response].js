const inspect = require("util").inspect;
const { existsSync, writeFileSync, mkdirSync, rmdirSync } = require("fs");
const webpack = require("webpack");
const path = require("path");
const SpeedMeasurePlugin = require("speed-measure-webpack-plugin");
const { CONSTANTS } = require("../../../lib/helpers");
const { buildAdminUrl, buildSiteUrl } = require("../../../lib/routie");
import { getComponentsByRoute } from '../../../lib/componee';
import { FileListPlugin } from '../../../lib/webpack/FileListPlugin'

module.exports = function (request, response) {
    /** This middleware only required for development */
    if (process.env.NODE_ENV !== 'development')
        return;
    /** Get list of components for current route */
    let route = request._route;
    let components = getComponentsByRoute(route.id);
    /** Only create bundle file for GET and "text/html" route */
    //FIXME: This should be enhanced
    if ((route.method.length > 1 || route.method[0] != "GET") || (response.get("Content-Type") && !response.get("Content-Type").includes("text/html")))
        return false;

    let _p = route.isAdmin == true ? "./admin/" + route.id : "./site/" + route.id;
    rmdirSync(path.resolve(CONSTANTS.CACHEPATH, _p), { recursive: true });
    let content = `var components = module.exports = exports = ${inspect(components, { depth: 5 }).replace(/'---/g, "").replace(/---'/g, "")}`;
    content += "\r\n";
    content += "if (typeof window !== 'undefined')";
    content += "\r\n";
    content += " window.appContext.components = components;";
    mkdirSync(path.resolve(CONSTANTS.ROOTPATH, "./.nodejscart/", _p), { recursive: true });
    writeFileSync(path.resolve(CONSTANTS.ROOTPATH, ".nodejscart/", _p, "components.js"), content);
    let name = route.isAdmin === true ? `admin/${route.id}/bundle` : `site/${route.id}/bundle`;
    let entry = {};
    entry[name] = [
        path.resolve(CONSTANTS.ROOTPATH, "./.nodejscart/", _p, "components.js"),
        path.resolve(CONSTANTS.LIBPATH, "components", "hydrate.js")
    ]

    class AccessDependenciesPlugin {
        apply(compiler) {
            compiler.hooks.compilation.tap('AccessDependenciesPlugin', compilation => {
                compilation.hooks.finishModules.tap('AccessDependenciesPlugin', modules => {
                    console.log(modules)
                })
            })
        }
    }

    const smp = new SpeedMeasurePlugin();
    const compiler = webpack(smp.wrap({
        mode: "production", // "production" | "development" | "none"
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
            //new FileListPlugin()
        ],

        entry: entry,
        output: {
            path: path.resolve(CONSTANTS.ROOTPATH, "./.nodejscart/"),
            filename: "[name].js",
        }
    }));


    // compiler.hooks.beforeRun.tap('MyPlugin', (compilation) => {
    //     // return true to emit the output, otherwise false
    //     console.log('aaaa')
    //     console.log(compilation.getStats());

    //     // var end = new Date() - start;
    //     // console.log("Call to doSomething took " + (end) + " milliseconds.")

    //     // return false;
    // });
    // compiler.hooks.buildModule.tap(
    //     'SourceMapDevToolModuleOptionsPlugin',
    //     (module) => {
    //         console.log(module);
    //     }
    // );
    compiler.run((err, stats) => {
        if (err || stats.hasErrors()) {
            console.log(err);
            console.log(stats);
        } else {
            //console.log(stats);
        }
    });

    return true;
};