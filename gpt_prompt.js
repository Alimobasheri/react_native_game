const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get directory, output path, ignored directories, and ignored extensions from command-line arguments
const args = process.argv.slice(2);
const prompt = args[0];
const directoryPath = './src/containers/ReactNativeSkiaGameEngine';
const outputPath = `output.txt`;
const ignoredDirs = ['.git'];
const ignoredExtensions = ['.ico'];

if (!directoryPath || !outputPath) {
  console.error(
    'Usage: node script.js <directoryPath> <outputPath> [ignoredDirs] [ignoredExtensions]'
  );
  process.exit(1);
}

function concatenateFiles(directory) {
  let outputData = `React Native, expo 49, Game Engine project. Given the following full code of /src directory and its structure:\n`;

  outputData += prompt;

  outputData += `Directory Folder Name contents:\n`;
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

  // Copy to clipboard depending on the OS
  const platform = process.platform;
  try {
    if (platform === 'win32') {
      execSync('clip', { input: outputData });
    } else if (platform === 'darwin') {
      execSync('pbcopy', { input: outputData });
    } else if (platform === 'linux') {
      execSync('xclip -selection clipboard', { input: outputData });
    } else {
      throw new Error('Unsupported platform: ' + platform);
    }
    console.log('Data copied to clipboard.');
  } catch (error) {
    console.error('Failed to copy data to clipboard:', error.message);
  }
}

concatenateFiles(directoryPath);
