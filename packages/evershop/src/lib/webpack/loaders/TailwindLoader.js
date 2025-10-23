import { join } from 'path';
import autoprefixer from 'autoprefixer';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
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
  return postcss([tailwindcss(), autoprefixer])
    .process(c, { from: undefined })
    .then((result) => result.css);
}
