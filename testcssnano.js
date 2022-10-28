const postcss = require('postcss');
const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');

async function buildCss() {
  const config = require('@evershop/core/src/modules/cms/services/tailwind.frontStore.config.js');
  config.content = [
    './packages/core/src/**/*.js'
  ];
  const tailwind = `@tailwind base;
@tailwind components;
@tailwind utilities;
`;
  // Postcss await
  const tailWindCss = await postcss([
    tailwindcss(config),
    cssnano(),
  ]).process(tailwind, {
    from: undefined,
  });

  console.log(tailWindCss);
}

buildCss();