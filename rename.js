const fs = require('fs');
const path = require('path');

// Function to rename files with a given regex pattern
function renameFilesWithRegex(directoryPath, regex, newExtension) {
  // Get all files in the directory and its subdirectories
  const files = fs.readdirSync(directoryPath, { withFileTypes: true });

  files.forEach((file) => {
    const filePath = path.join(directoryPath, file.name);

    if (file.isDirectory()) {
      // Recursively call the function for subdirectories
      renameFilesWithRegex(filePath, regex, newExtension);
    } else if (file.isFile() && regex.test(file.name)) {
      // Rename the file if its name matches the regex pattern
      const newFilename = file.name.replace('.resolvers.jsx', `${newExtension}`);
      const newPath = path.join(directoryPath, newFilename);

      fs.renameSync(filePath, newPath);
      console.log(`File renamed: ${filePath} -> ${newPath}`);
    }
  });
}

// Define the directory path, regex pattern, and new extension
const directoryPath = './packages/evershop/src';
const regex = /^[A-Z].*\.resolvers.jsx$/;
const newExtension = '.resolvers.js';

// Call the function to rename files with the regex pattern
renameFilesWithRegex(directoryPath, regex, newExtension);