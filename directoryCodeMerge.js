const fs = require("fs");
const path = require("path");

// Get directory and output path from command-line arguments
const args = process.argv.slice(2);
const directoryPath = args[0];
const outputPath = args[1];

if (!directoryPath || !outputPath) {
  console.error("Usage: node script.js <directoryPath> <outputPath>");
  process.exit(1);
}

function concatenateFiles(directory, output) {
  let outputData = `Directory Folder Name contents:\n`;

  function processDirectory(directory, indent = "") {
    const files = fs.readdirSync(directory);

    files.forEach((file) => {
      const filePath = path.join(directory, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        outputData += `${indent}// ${file} Files:\n`;
        processDirectory(filePath, indent + "  ");
      } else if (stats.isFile()) {
        const fileData = fs.readFileSync(filePath, "utf8");
        outputData += `${indent}// ${filePath}:\n${fileData}\n`;
      }
    });
  }

  processDirectory(directory);

  fs.writeFileSync(output, outputData, "utf8");
  console.log(`Output written to ${output}`);
}

concatenateFiles(directoryPath, outputPath);
