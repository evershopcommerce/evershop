import fs from 'fs';
import path from 'path';

function getFileRecursive(dir, files) {
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getFileRecursive(filePath, files);
    } else {
      files.push(filePath);
    }
  });
}

const files = [];

getFileRecursive(path.resolve(__dirname, './bin/serve'), files);

files.forEach((file) => {
  const source = fs.readFileSync(file, { encoding: 'utf8', flag: 'r' });
  const result = source.replace(/\.\.\/dist/g, '../src');
  fs.writeFileSync(file, result, 'utf8');
});
