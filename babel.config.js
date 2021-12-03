module.exports = {
    babelrcRoots: [__dirname],
    parserOpts: { allowReturnOutsideFunction: true },
    presets: [
        "@babel/preset-env",
        "@babel/preset-react"
    ]
};