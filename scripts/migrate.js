#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Script to selectively replace files from input folder to current folder
 * Only replaces files that exist in BOTH folders, skips files only in input
 * Usage: node scripts/migrate.js <input-folder-path>
 */

function runCommand(command, options = {}) {
  try {
    const result = execSync(command, { 
      stdio: 'inherit', 
      cwd: process.cwd(),
      ...options 
    });
    return result;
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

function copyFileSync(source, destination) {
  try {
    // Ensure destination directory exists
    const destDir = path.dirname(destination);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    fs.copyFileSync(source, destination);
    return true;
  } catch (error) {
    console.error(`❌ Failed to copy ${source} to ${destination}: ${error.message}`);
    return false;
  }
}

function readGitignorePatterns(folderPath) {
  const gitignorePath = path.join(folderPath, '.gitignore');
  const patterns = [];
  
  if (fs.existsSync(gitignorePath)) {
    try {
      const content = fs.readFileSync(gitignorePath, 'utf8');
      const lines = content.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        // Skip empty lines and comments
        if (trimmed && !trimmed.startsWith('#')) {
          patterns.push(trimmed);
        }
      }
    } catch (error) {
      console.log(`⚠️  Could not read .gitignore: ${error.message}`);
    }
  }
  
  return patterns;
}

function shouldIgnoreFile(filePath, gitignorePatterns, basePath) {
  const relativePath = path.relative(basePath, filePath);
  const fileName = path.basename(filePath);
  
  // Always skip package.json files
  if (fileName === 'package.json') {
    return true;
  }
  
  // Check against gitignore patterns
  for (const pattern of gitignorePatterns) {
    // Simple pattern matching (can be enhanced for more complex patterns)
    if (pattern.includes('*')) {
      // Convert glob pattern to regex
      const regexPattern = pattern
        .replace(/\*\*/g, '.*')  // ** matches any path
        .replace(/\*/g, '[^/]*') // * matches any chars except /
        .replace(/\./g, '\\.');   // Escape dots
      
      const regex = new RegExp(`^${regexPattern}$`);
      if (regex.test(relativePath) || regex.test(fileName)) {
        return true;
      }
    } else {
      // Exact match or directory match
      if (relativePath === pattern || 
          relativePath.startsWith(pattern + '/') ||
          fileName === pattern) {
        return true;
      }
    }
  }
  
  return false;
}

function getRelativePath(fullPath, basePath) {
  return path.relative(basePath, fullPath);
}

function scanFolderFiles(folderPath, basePath, excludePatterns = []) {
  const files = new Set();
  
  function scanDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) return;
    
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const relativePath = getRelativePath(itemPath, basePath);
      
      // Check if item should be excluded
      const shouldExclude = excludePatterns.some(pattern => {
        if (typeof pattern === 'string') {
          return item === pattern || item.includes(pattern);
        }
        if (pattern instanceof RegExp) {
          return pattern.test(item);
        }
        return false;
      });
      
      if (shouldExclude) continue;
      
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        scanDirectory(itemPath);
      } else {
        files.add(relativePath);
      }
    }
  }
  
  scanDirectory(folderPath);
  return files;
}

function migrateFiles() {
  const inputFolder = process.argv[2];
  
  if (!inputFolder) {
    console.error('❌ Please provide the input folder path as an argument');
    console.error('Usage: node scripts/migrate.js <input-folder-path>');
    console.error('Example: node scripts/migrate.js ./migration-files');
    console.error('Example: node scripts/migrate.js /path/to/migration-files');
    process.exit(1);
  }

  // Resolve absolute path for input folder
  const inputFolderPath = path.resolve(inputFolder);
  const currentFolderPath = process.cwd();

  console.log('🔄 Starting selective file replacement process...');
  console.log(`📁 Input folder: ${inputFolderPath}`);
  console.log(`📍 Current folder: ${currentFolderPath}`);
  console.log('');

  // Validate input folder exists
  if (!fs.existsSync(inputFolderPath)) {
    console.error(`❌ Input folder does not exist: ${inputFolderPath}`);
    process.exit(1);
  }

  if (!fs.statSync(inputFolderPath).isDirectory()) {
    console.error(`❌ Input path is not a directory: ${inputFolderPath}`);
    process.exit(1);
  }

  try {
    // Check if we're in a git repository
    try {
      runCommand('git status', { stdio: 'pipe' });
    } catch (error) {
      console.error('❌ This directory is not a git repository');
      console.error('Please run this script from a git repository');
      process.exit(1);
    }

    // Read .gitignore patterns from both source and destination
    console.log('📋 Reading .gitignore patterns...');
    const sourceGitignorePatterns = readGitignorePatterns(inputFolderPath);
    const destGitignorePatterns = readGitignorePatterns(currentFolderPath);
    const allGitignorePatterns = [...new Set([...sourceGitignorePatterns, ...destGitignorePatterns])];
    
    if (allGitignorePatterns.length > 0) {
      console.log('🔍 Found .gitignore patterns:', allGitignorePatterns.join(', '));
    } else {
      console.log('ℹ️  No .gitignore patterns found');
    }
    
    // Default exclude patterns (always applied)
    const defaultExcludePatterns = [
      'node_modules',
      '.git',
      '.DS_Store',
      'Thumbs.db',
      '*.log',
      'dist',
      'build',
      '.env',
      '.env.local',
      '.env.development.local',
      '.env.test.local',
      '.env.production.local',
      'package.json',      // Explicitly exclude package.json files
      'package-lock.json'  // Explicitly exclude package-lock.json files
    ];
    
    console.log('🚫 Default exclusions:', defaultExcludePatterns.join(', '));
    console.log('');

    // Create backup before migration
    console.log('💾 Creating backup of current state...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupBranch = `backup-before-migration-${timestamp}`;
    
    try {
      runCommand(`git checkout -b ${backupBranch}`, { stdio: 'pipe' });
      runCommand('git checkout main', { stdio: 'pipe' });
      console.log(`✅ Backup created on branch: ${backupBranch}`);
    } catch (error) {
      console.log('⚠️  Could not create backup branch, continuing with migration...');
    }

    // Scan files in both folders
    console.log('🔍 Scanning files in both folders...');
    const currentFiles = scanFolderFiles(currentFolderPath, currentFolderPath, defaultExcludePatterns);
    const inputFiles = scanFolderFiles(inputFolderPath, inputFolderPath, defaultExcludePatterns);
    
    // Find files that exist in both folders
    const commonFiles = new Set([...currentFiles].filter(file => inputFiles.has(file)));
    const onlyInCurrent = new Set([...currentFiles].filter(file => !inputFiles.has(file)));
    const onlyInInput = new Set([...inputFiles].filter(file => !currentFiles.has(file)));
    
    console.log(`📊 File Analysis:`);
    console.log(`   Files in current folder: ${currentFiles.size}`);
    console.log(`   Files in input folder: ${inputFiles.size}`);
    console.log(`   Files in both folders: ${commonFiles.size}`);
    console.log(`   Files only in current: ${onlyInCurrent.size}`);
    console.log(`   Files only in input: ${onlyInInput.size}`);
    console.log('');

    // Warn about files only in current folder
    if (onlyInCurrent.size > 0) {
      console.log('⚠️  Files present in current folder but NOT in input folder:');
      [...onlyInCurrent].slice(0, 10).forEach(file => {
        console.log(`   - ${file}`);
      });
      if (onlyInCurrent.size > 10) {
        console.log(`   ... and ${onlyInCurrent.size - 10} more files`);
      }
      console.log('');
    }

    // Skip files only in input folder
    if (onlyInInput.size > 0) {
      console.log('⏭️  Files present in input folder but NOT in current folder (skipping):');
      [...onlyInInput].slice(0, 10).forEach(file => {
        console.log(`   - ${file}`);
      });
      if (onlyInInput.size > 10) {
        console.log(`   ... and ${onlyInInput.size - 10} more files`);
      }
      console.log('');
    }

    // Start selective migration
    console.log('🔄 Starting selective file replacement...');
    
    let filesProcessed = 0;
    let filesSkipped = 0;
    let filesFailed = 0;
    let packageJsonSkipped = 0;
    let packageLockSkipped = 0;

    // Process only common files
    for (const relativeFile of commonFiles) {
      const sourcePath = path.join(inputFolderPath, relativeFile);
      const destPath = path.join(currentFolderPath, relativeFile);
      
      // Double-check exclusions
      const fileName = path.basename(relativeFile);
      const shouldExcludeDefault = defaultExcludePatterns.some(pattern => {
        if (typeof pattern === 'string') {
          return fileName === pattern || fileName.includes(pattern);
        }
        if (pattern instanceof RegExp) {
          return pattern.test(fileName);
        }
        return false;
      });
      
      if (shouldExcludeDefault) {
        if (fileName === 'package.json') {
          console.log(`📦 Skipping package.json: ${relativeFile}`);
          packageJsonSkipped++;
        } else if (fileName === 'package-lock.json') {
          console.log(`🔒 Skipping package-lock.json: ${relativeFile}`);
          packageLockSkipped++;
        } else {
          console.log(`⏭️  Skipping excluded file: ${relativeFile}`);
        }
        filesSkipped++;
        continue;
      }

      // Check gitignore patterns
      if (shouldIgnoreFile(sourcePath, allGitignorePatterns, inputFolderPath)) {
        console.log(`🚫 Skipping gitignored file: ${relativeFile}`);
        filesSkipped++;
        continue;
      }

      console.log(`📄 Replacing file: ${relativeFile}`);
      if (copyFileSync(sourcePath, destPath)) {
        filesProcessed++;
      } else {
        filesFailed++;
      }
    }

    console.log('');
    console.log('📊 Migration Summary:');
    console.log(`✅ Files replaced: ${filesProcessed}`);
    console.log(`📦 Package.json files skipped: ${packageJsonSkipped}`);
    console.log(`🔒 Package-lock.json files skipped: ${packageLockSkipped}`);
    console.log(`⏭️  Files skipped (excluded/gitignored): ${filesSkipped}`);
    console.log(`❌ Files failed: ${filesFailed}`);
    console.log(`⚠️  Files only in current (not replaced): ${onlyInCurrent.size}`);
    console.log(`⏭️  Files only in input (not added): ${onlyInInput.size}`);
    console.log('');

    if (filesFailed > 0) {
      console.log('⚠️  Some files failed to migrate. Please check the errors above.');
    }

    if (packageJsonSkipped > 0 || packageLockSkipped > 0) {
      console.log('📦 Note: package.json and package-lock.json files were skipped to preserve your project configuration.');
    }

    if (onlyInCurrent.size > 0) {
      console.log('⚠️  Note: Some files in your current folder were not found in the input folder and were left unchanged.');
    }

    if (onlyInInput.size > 0) {
      console.log('ℹ️  Note: Some files in the input folder were not found in your current folder and were not added.');
    }

    // Show git status
    console.log('📋 Current git status:');
    try {
      runCommand('git status --porcelain');
    } catch (error) {
      console.log('Could not get git status');
    }

    console.log('');
    console.log('🎉 Migration completed!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Review the migrated files');
    console.log('2. Update package.json dependencies if needed');
    console.log('3. Test your application');
    console.log('4. Commit the changes: git add . && git commit -m "feat: migrate files from input folder"');
    console.log('5. Push changes: git push');
    console.log('');
    console.log('💡 To revert if needed:');
    console.log(`   git checkout ${backupBranch}  # View backup`);
    console.log('   git reset --hard HEAD~1      # Undo last commit');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('   1. Ensure input folder exists and is accessible');
    console.error('   2. Check file permissions');
    console.error('   3. Ensure you have write access to current directory');
    console.error('   4. Check available disk space');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  migrateFiles();
}

module.exports = { migrateFiles };
