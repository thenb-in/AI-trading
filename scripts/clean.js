#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Recursively remove a directory
 * @param {string} dirPath - Path to directory to remove
 */
function removeDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return false;
  }

  try {
    const stats = fs.statSync(dirPath);
    
    if (stats.isDirectory()) {
      const files = fs.readdirSync(dirPath);
      
      files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const fileStats = fs.statSync(filePath);
        
        if (fileStats.isDirectory()) {
          removeDirectory(filePath);
        } else {
          fs.unlinkSync(filePath);
        }
      });
      
      fs.rmdirSync(dirPath);
      return true;
    } else {
      fs.unlinkSync(dirPath);
      return true;
    }
  } catch (error) {
    console.error(`Error removing ${dirPath}:`, error.message);
    return false;
  }
}

/**
 * Remove files matching a pattern in a directory
 * @param {string} dirPath - Directory path
 * @param {string} pattern - File pattern (e.g., '*.log')
 */
function removeFilesByPattern(dirPath, pattern) {
  if (!fs.existsSync(dirPath)) {
    return false;
  }

  try {
    const files = fs.readdirSync(dirPath);
    const regex = new RegExp(pattern.replace('*', '.*'));
    let removed = false;

    files.forEach(file => {
      if (regex.test(file)) {
        const filePath = path.join(dirPath, file);
        try {
          fs.unlinkSync(filePath);
          removed = true;
        } catch (error) {
          console.error(`Error removing ${filePath}:`, error.message);
        }
      }
    });

    return removed;
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error.message);
    return false;
  }
}

/**
 * Clean node_modules directories
 */
function cleanNodeModules() {
  console.log('Cleaning node_modules...');
  const rootDir = path.join(__dirname, '..');
  const dirs = [
    path.join(rootDir, 'node_modules'),
    path.join(rootDir, 'startup', 'client', 'node_modules'),
    path.join(rootDir, 'startup', 'server', 'node_modules')
  ];

  dirs.forEach(dir => {
    if (removeDirectory(dir)) {
      console.log(`✓ Removed ${path.relative(rootDir, dir)}`);
    }
  });
}

/**
 * Clean build directories
 */
function cleanBuild() {
  console.log('Cleaning build artifacts...');
  const rootDir = path.join(__dirname, '..');
  const dirs = [
    path.join(rootDir, 'startup', 'client', 'dist'),
    path.join(rootDir, 'startup', 'server', 'dist')
  ];

  dirs.forEach(dir => {
    if (removeDirectory(dir)) {
      console.log(`✓ Removed ${path.relative(rootDir, dir)}`);
    }
  });
}

/**
 * Clean log files
 */
function cleanLogs() {
  console.log('Cleaning log files...');
  const rootDir = path.join(__dirname, '..');
  const logsDir = path.join(rootDir, 'startup', 'server', 'logs');

  if (removeFilesByPattern(logsDir, '*.log')) {
    console.log(`✓ Removed log files from ${path.relative(rootDir, logsDir)}`);
  }
}

/**
 * Main function
 */
function main() {
  const command = process.argv[2];
  const rootDir = path.join(__dirname, '..');

  process.chdir(rootDir);

  switch (command) {
    case 'node_modules':
      cleanNodeModules();
      break;
      
    case 'build':
      cleanBuild();
      break;
      
    case 'logs':
      cleanLogs();
      break;
      
    case 'all':
    default:
      cleanNodeModules();
      cleanBuild();
      cleanLogs();
      console.log('\n✓ Cleanup completed!');
      break;
  }
}

if (require.main === module) {
  main();
}

