module.exports = {
  parserOpts: { allowReturnOutsideFunction: true },
  presets: [
    '@babel/preset-react',
    [
      '@babel/preset-env',
      {
        exclude: [
          '@babel/plugin-transform-regenerator',
          '@babel/plugin-transform-async-to-generator'
        ]
      }
    ]
  ],
  ignore: ['node_modules']
};
