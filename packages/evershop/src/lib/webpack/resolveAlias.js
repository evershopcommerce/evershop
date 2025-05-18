import fs from 'fs';
import path from 'path';

function getAllFilesInFolder(folderPath) {
  if (!fs.existsSync(folderPath)) {
    return {};
  }

  let results = {};

  // Get the contents of the folder
  const contents = fs.readdirSync(folderPath);

  // Loop through each item in the folder

  for (const item of contents) {
    const itemPath = path.join(folderPath, item);

    // Check if the item is a directory
    if (fs.lstatSync(itemPath).isDirectory()) {
      // Recursively call the function to get the files in the subdirectory
      const subResults = getAllFilesInFolder(itemPath);
      results = { ...results, ...subResults };
    } else if (
      (/.js$/.test(item) && /^[A-Z]/.test(item[0])) ||
      /\.(css|scss)$/i.test(item)
    ) {
      const pathParts = itemPath.split(path.sep);

      // Find the index of the "components" directory
      const componentsIndex = pathParts.indexOf('components');

      // Return the part of the path after the "components" directory
      const alias = path
        .join('@components', ...pathParts.slice(componentsIndex + 1))
        .replace('.js', '')
        .replace('.scss', '')
        .replace('.css', '');
      results[alias] = itemPath;
    }
  }

  return results;
}

export function resolveAlias(extensions = [], themePath = null) {
  let resolves = {};

  if (themePath) {
    resolves = getAllFilesInFolder(path.resolve(themePath, 'components'));
  }

  // loop through the extensions and get the files
  extensions.forEach((extension) => {
    const extensionFiles = getAllFilesInFolder(
      path.resolve(extension.path, 'components')
    );

    resolves = { ...extensionFiles, ...resolves };
  });

  return resolves;
}

export const alias = {};
