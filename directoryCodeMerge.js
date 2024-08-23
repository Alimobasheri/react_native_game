const fs = require('fs');
const path = require('path');

// Get directory, output path, ignored directories, and ignored extensions from command-line arguments
const args = process.argv.slice(2);
const directoryPath = args[0];
const outputPath = args[1];
const ignoredDirs = args[2] ? args[2].split(',').filter((dir) => dir) : []; // filter out empty strings
const ignoredExtensions = args[3] ? args[3].split(',') : [];

if (!directoryPath || !outputPath) {
  console.error(
    'Usage: node script.js <directoryPath> <outputPath> [ignoredDirs] [ignoredExtensions]'
  );
  process.exit(1);
}

function concatenateFiles(directory, output) {
  let outputData = `Directory Folder Name contents:\n`;

  function processDirectory(directory, indent = '') {
    const files = fs.readdirSync(directory);

    files.forEach((file) => {
      const filePath = path.join(directory, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        // Check if the directory should be ignored
        if (ignoredDirs.includes(file)) {
          console.log(`Ignoring directory: ${filePath}`);
          return;
        }
        outputData += `${indent}// ${file} Files:\n`;
        processDirectory(filePath, indent + '  ');
      } else if (stats.isFile()) {
        const fileExtension = path.extname(file);
        // Check if the file extension should be ignored
        if (ignoredExtensions.includes(fileExtension)) {
          console.log(`Ignoring file: ${filePath}`);
          return;
        }
        const fileData = fs.readFileSync(filePath, 'utf8');
        outputData += `${indent}// ${filePath}:\n${fileData}\n`;
      }
    });
  }

  processDirectory(directory);

  fs.writeFileSync(output, outputData, 'utf8');
  console.log(`Output written to ${output}`);
}

concatenateFiles(directoryPath, outputPath);
