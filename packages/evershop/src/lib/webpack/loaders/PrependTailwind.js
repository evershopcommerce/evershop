export default function PrependTailwindDirectives(source) {
  // Use regex to check for @layer or @apply directives.
  // The 'g' flag finds all occurrences, and the test() method returns a boolean.
  const hasTailwindDirectives = /@(layer|apply)/.test(source);

  // If the file does not contain @layer or @apply, return the source as is.
  if (!hasTailwindDirectives) {
    return source;
  }

  // If it does, and doesn't already have the @tailwind directives, prepend them.
  const hasGlobalDirectives = /@tailwind\s+(base|components|utilities)/.test(
    source
  );
  if (hasGlobalDirectives) {
    return source;
  }

  const contentWithDirectives = `
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
  
    ${source}
  `;

  return contentWithDirectives;
}
