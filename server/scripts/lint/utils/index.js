/**
 * Simple linting utilities
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const logger = require('../../../logger');

/**
 * Find all JavaScript files in a directory
 */
function findJsFiles(dir) {
  const files = [];

  function traverse(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          if (!['node_modules', '.git'].includes(item)) {
            traverse(fullPath);
          }
        } else if (item.endsWith('.js')) {
          files.push(fullPath);
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  traverse(dir);
  return files;
}

/**
 * Read file content safely
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    logger.error(`Error reading file ${filePath}: ${error.message}`);
    return null;
  }
}


function getFolders(baseDir){
  // get folders and the folders inside them recursively
  const folders = new Set();
  const files = fs.readdirSync(baseDir);
  for (const file of files) {
    const fullPath = path.join(baseDir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      folders.add(fullPath);
      folders.add(...getFolders(fullPath));
    }
  }
  // convert to array
  return Array.from(folders);
}

/**
 * Get controller files
 */
function getControllerFiles() {
  const controllerPaths = getFolders(path.join(process.cwd(), 'src/controllers'));
  const files = [];

  controllerPaths.forEach(controllerPath => {
    const fullPath = controllerPath;
    if (fs.existsSync(fullPath)) {
      const controllerFiles = findJsFiles(fullPath);
      files.push(...controllerFiles);
    }
  });

  return files;
}

/**
 * Run ESLint on files
 */
function runESLint(files) {
  try {
    const command = `npx eslint ${files.join(' ')} --config eslint.config.js`;
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    return true;
  } catch (error) {
    logger.error(`ESLint failed: ${error.message}`);
    return false;
  }
}

/**
 * Check if import path is a direct model import
 */
function isModelImport(importPath) {
  return importPath.includes('models') && !importPath.includes('models/index.js');
}

/**
 * Log violation
 */
function logViolation(file, lineNumber, line, message) {
  logger.error(`${message} in ${file}:${lineNumber}`);
  logger.error(`  Line: ${line.trim()}`);
}

/**
 * Get script directory (server root)
 */
function getScriptDir() {
  return process.cwd();
}

/**
 * Get relative path from current working directory
 */
function getRelativePath(filePath) {
  return path.relative(process.cwd(), filePath);
}

/**
 * Read file safely (alias for readFile)
 */
function readFileSafely(filePath) {
  return readFile(filePath);
}

/**
 * Check if file should be skipped
 */
function shouldSkipFile(filePath, skipPatterns = []) {
  const fileName = path.basename(filePath);
  const skipFiles = ['logger.js', 'lint-checks', 'setup-hooks', ...skipPatterns];

  return skipFiles.some(pattern =>
    filePath.includes(pattern) || fileName.includes(pattern)
  );
}

module.exports = {
  findJsFiles,
  readFile,
  getControllerFiles,
  runESLint,
  isModelImport,
  logViolation,
  getScriptDir,
  getRelativePath,
  readFileSafely,
  shouldSkipFile
};
