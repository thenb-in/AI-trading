/**
 * Model imports checker
 * Checks for direct model imports in controllers (both simple and destructured)
 */

const { readFileSafely, logViolation, isModelImport } = require('../utils/index');

/**
 * Check for direct model imports using multiple regex patterns
 * @param {string[]} files - Array of file paths to check
 * @returns {Object} - { passed: boolean, count: number, violations: array }
 */
function checkModelImports(files) {
  const violations = [];

  files.forEach(file => {
    const content = readFileSafely(file);
    if (!content) {
      violations.push(`${file}:1 Error reading file`);
      return;
    }

    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Pattern 1: Simple imports - const User = require('../../models')
      const simpleMatch = line.match(/require\s*\(\s*['"`](.*models.*)['"`]\s*\)/);
      if (simpleMatch) {
        const importPath = simpleMatch[1];

        if (isModelImport(importPath)) {
          violations.push(`${file}:${index + 1} ${line.trim()}`);
        }
      }

      // Pattern 2: Destructured imports - const { User, Company } = require('../../models')
      const destructureMatch = line.match(/const\s*\{[^}]*\}\s*=\s*require\s*\(\s*['"`](.*models.*)['"`]\s*\)/);
      if (destructureMatch) {
        const importPath = destructureMatch[1];

        if (isModelImport(importPath)) {
          violations.push(`${file}:${index + 1} ${line.trim()}`);
        }
      }
    });
  });

  return { passed: violations.length === 0, count: violations.length, violations };
}

module.exports = {
  checkModelImports
};
