import { join } from 'path';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { CONSTANTS } from '../../helpers.js';
import { getTailwindConfig } from '../util/getTailwindConfig.js';

export default async function TailwindLoader(c) {
  this.cacheable(false);
  if (this.mode === 'production') {
    if (this.resourcePath.includes('tailwind.scss')) {
      return `/*beginTailwind*/${c}/*endTailwind*/`;
    } else {
      return c;
    }
  }
  const components = this.getOptions().getComponents();
  const { route } = this.getOptions();
  components.forEach((module) => {
    this.addDependency(module);
  });

  if (!this.resourcePath.includes('tailwind.scss')) {
    return c;
  }
  const mergedTailwindConfig = await getTailwindConfig(route);
  mergedTailwindConfig.content = [
    // All file in extensions folder and name is capitalized
    join(CONSTANTS.ROOTPATH, 'extensions', '**', '[A-Z]*.jsx'),
    // All file in packages/evershop/src and name is capitalized
    join(CONSTANTS.ROOTPATH, 'packages', 'evershop', 'src', '**', '[A-Z]*.jsx'),
    // All file in node_modules/@evershop/evershop/src and name is capitalized
    join(
      CONSTANTS.ROOTPATH,
      'node_modules',
      '@evershop',
      'evershop',
      'src',
      '**',
      '[A-Z]*.jsx'
    ),
    // All file in themes folder and name is capitalized
    join(CONSTANTS.ROOTPATH, 'themes', '**', '[A-Z]*.jsx')
  ];

  return postcss([tailwindcss(mergedTailwindConfig), autoprefixer])
    .process(c, { from: undefined })
    .then((result) => result.css);
}
