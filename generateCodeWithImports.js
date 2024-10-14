const fs = require('fs');
const path = require('path');

// Get the root directory of the project from command-line arguments
const rootDir = process.argv[2]; // Root directory of the project

// Get the output file path from command-line arguments
const outputFile = process.argv[3]; // Output file path

// Get the target files paths from command-line arguments
const targetFiles = process.argv.slice(4); // Target files paths

// Set to keep track of visited files to avoid duplicate processing
const visitedFiles = new Set();

// Get optional prefixes for absolute paths from command-line arguments
const allowedAbsolutePrefixes = process.argv.slice(5); // Optional prefixes for absolute paths

// Function to determine if an import path is from node_modules or internal Node.js modules
function isNodeModuleOrInternalLib(importPath) {
  return (
    importPath.startsWith('node:') || // Check if the import is an internal Node.js module
    importPath.startsWith('.') === false || // Check if the import is non-relative (likely from node_modules)
    (path.isAbsolute(importPath) && !isAllowedAbsolutePath(importPath)) // Check if it's an absolute path that isn't allowed by the prefixes
  );
}

// Function to determine if an absolute path is allowed based on provided prefixes
function isAllowedAbsolutePath(importPath) {
  return allowedAbsolutePrefixes.some((prefix) =>
    importPath.startsWith(prefix)
  );
}

// Function to extract imports and code from a file, recursively processing imports
function extractImportsAndCode(filePath) {
  if (visitedFiles.has(filePath)) {
    return ''; // Avoid re-processing files that have already been visited
  }

  // Mark the file as visited
  visitedFiles.add(filePath);

  // Resolve the absolute path of the file
  const absolutePath = path.resolve(rootDir, filePath);

  // Check if the file exists, throw an error if not
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  // Read the file content
  const fileContent = fs.readFileSync(absolutePath, 'utf-8');

  // Start output with a comment indicating the file path
  let output = `// ${filePath}\n`;

  // Regular expression to match import statements
  const importRegex = /import\s.*?from\s+['"](.*?)['"]/g;
  let match;

  // Recursively process each import in the file
  while ((match = importRegex.exec(fileContent)) !== null) {
    const importPath = match[1];

    // If the import is not from node_modules or internal libraries, process it
    if (!isNodeModuleOrInternalLib(importPath)) {
      const importFilePath = path.resolve(path.dirname(filePath), importPath);
      let resolvedImportPath;

      // Try to resolve the import with different possible extensions
      if (fs.existsSync(importFilePath)) {
        resolvedImportPath = importFilePath;
      } else if (fs.existsSync(importFilePath + '.js')) {
        resolvedImportPath = importFilePath + '.js';
      } else if (fs.existsSync(importFilePath + '.ts')) {
        resolvedImportPath = importFilePath + '.ts';
      } else if (fs.existsSync(importFilePath + '.jsx')) {
        resolvedImportPath = importFilePath + '.jsx';
      } else if (fs.existsSync(importFilePath + '.tsx')) {
        resolvedImportPath = importFilePath + '.tsx';
      }

      // If a valid import path is found, recursively extract its content
      if (resolvedImportPath) {
        output +=
          extractImportsAndCode(path.relative(rootDir, resolvedImportPath)) +
          '\n';
      }
    }
  }

  // Add the file's own content after processing imports
  output += fileContent + '\n';
  return output;
}

// Function to generate the merged output from multiple target files
function generateMergedOutput(rootDir, targetFiles, outputFile) {
  try {
    let mergedContent = '';

    // Process each target file and append its content to the merged output
    targetFiles.forEach((targetFile) => {
      mergedContent += extractImportsAndCode(targetFile) + '\n';
    });

    // Write the merged content to the output file
    fs.writeFileSync(outputFile, mergedContent, 'utf-8');
    console.log(`Merged code written to: ${outputFile}`);
  } catch (error) {
    console.error('Error during processing:', error.message);
  }
}

// Run the script with the provided arguments
generateMergedOutput(rootDir, targetFiles, outputFile);
