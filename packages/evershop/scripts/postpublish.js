import fs from 'fs';
import path from 'path';

/**
 * Recursively retrieves all files from a given directory.
 * @param {string} dir - The directory to search.
 * @param {string[]} fileList - Array to store file paths.
 */
const getAllFiles = (dir, fileList = []) => {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  }

  return fileList;
};

const baseDir = path.resolve(__dirname, './bin/serve');
const allFiles = getAllFiles(baseDir);

for (const file of allFiles) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const updatedContent = content.replace(/\.\.\/dist/g, '../src');
    fs.writeFileSync(file, updatedContent, 'utf8');
  } catch (error) {
    console.error(`Error processing file ${file}:`, error.message);
  }
}

console.log(`✅ Updated ${allFiles.length} files successfully.`);
