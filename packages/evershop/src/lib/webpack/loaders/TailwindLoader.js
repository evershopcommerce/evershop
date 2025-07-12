import { join } from 'path';
import autoprefixer from 'autoprefixer';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import { getEnabledExtensions } from '../../../bin/extension/index.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { getEnabledTheme } from '../../../lib/util/getEnabledTheme.js';
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
  const enabledExtensions = getEnabledExtensions();
  mergedTailwindConfig.content = [
    // All file in packages/evershop/dist and name is capitalized
    join(CONSTANTS.ROOTPATH, 'packages', 'evershop', 'dist', '**', '[A-Z]*.js'),
    // All file in node_modules/@evershop/evershop/dist and name is capitalized
    join(
      CONSTANTS.ROOTPATH,
      'node_modules',
      '@evershop',
      'evershop',
      'dist',
      '**',
      '[A-Z]*.js'
    ),
    ...enabledExtensions.map((extension) =>
      join(extension.path, '**', '[A-Z]*.js')
    )
  ];
  const theme = getEnabledTheme();
  if (theme) {
    mergedTailwindConfig.content.push(
      join(theme.path, 'dist', '**', '[A-Z]*.js')
    );
  }

  return postcss([tailwindcss(mergedTailwindConfig), autoprefixer])
    .process(c, { from: undefined })
    .then((result) => result.css);
}
