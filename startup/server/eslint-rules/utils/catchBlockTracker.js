/**
 * Catch block tracking utilities for ESLint rules
 * Provides functionality to track catch blocks and validate error variables
 * Handles both try-catch blocks and Promise .catch() callbacks
 */

/**
 * Create a catch block tracker
 * @returns {Object} Tracker object with methods to manage catch block stack
 */
function createCatchBlockTracker() {
  const catchBlockStack = [];

  /**
   * Get error variable names from a catch clause parameter or Promise catch callback
   * @param {ASTNode} catchParam - The catch clause parameter or Promise catch callback parameter
   * @returns {string[]} - Array of error variable names
   */
  function getCatchErrorNames(catchParam) {
    if (!catchParam) {
      return [];
    }

    if (catchParam.type === 'Identifier') {
      return [catchParam.name];
    }

    // Handle destructured catch parameters (e.g., catch ({ error }))
    if (catchParam.type === 'ObjectPattern') {
      return catchParam.properties
        .filter(prop => prop.type === 'Property' && prop.value.type === 'Identifier')
        .map(prop => prop.value.name);
    }

    return [];
  }

  /**
   * Push a catch block onto the stack
   * @param {ASTNode} catchParam - The catch clause parameter or Promise catch callback parameter
   */
  function pushCatchBlock(catchParam) {
    catchBlockStack.push(getCatchErrorNames(catchParam));
  }

  /**
   * Pop a catch block from the stack
   */
  function popCatchBlock() {
    catchBlockStack.pop();
  }

  /**
   * Check if currently inside a catch block
   * @returns {boolean} - True if inside a catch block
   */
  function isInsideCatchBlock() {
    return catchBlockStack.length > 0;
  }

  /**
   * Check if an identifier is an error variable from a catch block
   * @param {ASTNode} identifier - The identifier node to check
   * @returns {boolean} - True if it's from a catch block
   */
  function isErrorFromCatch(identifier) {
    if (identifier.type !== 'Identifier') {
      return false;
    }
    return catchBlockStack.some(catchErrorNames => catchErrorNames.includes(identifier.name));
  }

  return {
    pushCatchBlock,
    popCatchBlock,
    isInsideCatchBlock,
    isErrorFromCatch
  };
}

module.exports = {
  createCatchBlockTracker
};

