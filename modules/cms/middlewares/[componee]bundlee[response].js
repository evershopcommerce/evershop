const inspect = require("util").inspect;
const { existsSync, writeFileSync, mkdirSync, rmdirSync } = require("fs");
const webpack = require("webpack");
const path = require("path");
const SpeedMeasurePlugin = require("speed-measure-webpack-plugin");
const { CONSTANTS } = require("../../../lib/helpers");
const { buildAdminUrl, buildSiteUrl } = require("../../../lib/routie");
const { Crawler } = require("es6-crawler-detect");
import { FileListPlugin } from '../../../lib/webpack/FileListPlugin'

module.exports = function (request, response) {
    // This middleware only required for development
    if (process.env.NODE_ENV !== 'development')
        return;

    // Only create bundle file for GET and "text/html" route
    if ((request._route.method.length > 1 || request._route.method[0] != "GET") || (response.get("Content-Type") && !response.get("Content-Type").includes("text/html")))
        return false;

    let _p = request.isAdmin == true ? "./admin/" + request._route.id : "./site/" + request._route.id;
    rmdirSync(path.resolve(CONSTANTS.ROOTPATH, "./.nodejscart/", _p), { recursive: true });
    if (request.isAdmin == true && existsSync(path.resolve(CONSTANTS.ROOTPATH, "./.nodejscart/", _p))) {
        response.context.bundle = buildAdminUrl("admin.bundle", [request._route.id]);
        return true;
    } else
        // pageId is a unique number. Ex: product id
        // If this number is not existed in request, we consider the route is fixed and does not have params
        if (request.pageId == undefined) {
            // Set the bundle url to response context
            if (request.isAdmin == true)
                response.context.bundle = buildAdminUrl("adminBundle", [request._route.id]);
            else
                response.context.bundle = buildSiteUrl("siteBundle", [request._route.id]);

            if (existsSync(path.resolve(CONSTANTS.ROOTPATH, "./.nodejscart/", _p)))
                return true;
        } else {
            // Set the bundle url to response context
            if (request.isAdmin == true)
                response.context.bundle = buildAdminUrl("adminBundle", [request._route.id + "/" + request.pageId]);
            else
                response.context.bundle = buildSiteUrl("siteBundle", [request._route.id + "/" + request.pageId]);

            if (!existsSync(path.resolve(CONSTANTS.ROOTPATH, "./.nodejscart/", _p)))
                mkdirSync(path.resolve(CONSTANTS.ROOTPATH, "./.nodejscart/", _p));

            _p = _p + "/" + request.pageId;

            if (existsSync(path.resolve(CONSTANTS.ROOTPATH, "./.nodejscart/", _p, request.pageId)))
                return true;
        }


    // Start building the bundle if it is not availble yet.
    let widgets = response.getBWidgets();
    mkdirSync(path.resolve(CONSTANTS.CACHEPATH, _p), { recursive: true });
    let content = `var widgets = module.exports = exports = ${inspect(widgets, { depth: 5 }).replace(/'---/g, "").replace(/---'/g, "")}`;
    content += "\r\n";
    content += "if (typeof window !== 'undefined')";
    content += "\r\n";
    content += " window.appContext.widgets = widgets;";
    writeFileSync(path.resolve(CONSTANTS.ROOTPATH, ".nodejscart/", _p, "components.js"), content);


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
        mode: "development", // "production" | "development" | "none"
        module: {
            rules: [
                {
                    test: /\.jsx?$/,
                    exclude: /(node_modules|bower_components)/,
                    use: {
                        loader: "babel-loader",
                        options: {
                            cacheDirectory: true,
                            presets: [
                                "@babel/preset-env",
                                "@babel/preset-react"
                            ],
                            plugins: [
                                "@babel/plugin-transform-runtime"
                            ]
                        }
                    }
                }
            ]
        },
        // name: 'main',
        target: "web",
        plugins: [
            new FileListPlugin()
        ],

        entry: [
            path.resolve(CONSTANTS.ROOTPATH, "./.nodejscart/", _p, "components.js"),
            path.resolve(CONSTANTS.LIBPATH, "components", "hydrate.js")
        ],
        output: {
            path: path.resolve(CONSTANTS.ROOTPATH, "./.nodejscart/", _p),
            filename: "bundle.js",
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

    // If current request is from crawler, remove bundle js from response to obtimize the speed
    var CrawlerDetector = new Crawler(request);
    if (CrawlerDetector.isCrawler())
        delete response.context.bundle;

    return true;
};