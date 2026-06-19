// Inject Tailwind @source directives for Tailwind v4
const InjectTailwindSources = (sources) => {
  const uniqueSources = Array.from(new Set(sources));
  const plugin = () => ({
    postcssPlugin: 'inject-tailwind-sources',
    Once(root) {
      // Only inject if this CSS imports Tailwind
      const hasTailwindImport = root.nodes.some(
        (node) =>
          node.type === 'atrule' &&
          node.name === 'import' &&
          node.params.includes('tailwindcss')
      );

      if (!hasTailwindImport) return;

      // Prepend @source entries so Tailwind scans the intended files
      uniqueSources.forEach((src) => {
        root.prepend(`@source "${src}";`);
      });
    }
  });
  plugin.postcss = true;
  return plugin;
};

export { InjectTailwindSources };
