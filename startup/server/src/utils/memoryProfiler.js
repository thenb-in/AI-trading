const logger = require('../../logger');
const os = require('os');

const memoryTag = 'MemoryProfiler';
class MemoryProfiler {
  constructor() {
    this.checkpoints = new Map();
    this.startTime = Date.now();
  }

  /**
     * Log current memory usage with a label
     * @param {string} label - Label for this memory checkpoint
     */
  logMemoryUsage(label) {
    const used = process.memoryUsage();
    const timestamp = Date.now() - this.startTime;

    logger.debug(`[MEMORY] ${label} (${timestamp}ms):`);
    logger.debug(`  RSS: ${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`);
    logger.debug(`  Heap Used: ${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`);
    logger.debug(`  Heap Total: ${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`);
    logger.debug(`  External: ${Math.round(used.external / 1024 / 1024 * 100) / 100} MB`);
    logger.info(`  Free Memory: ${Math.round(os.freemem() / 1024 / 1024 * 100) / 100} MB`);

    // Store checkpoint for comparison
    this.checkpoints.set(label, {
      timestamp,
      memory: used,
      heapUsedMB: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100
    });
  }

  /**
     * Get the size of a variable in KB
     * @param {any} obj - Object to measure
     * @param {string} label - Label for the object
     * @returns {number} Size in KB
     */
  getVariableSize(obj, label = 'Object') {
    try {
      const size = JSON.stringify(obj).length;
      const sizeKB = Math.round(size / 1024 * 100) / 100;
      logger.debug(`[SIZE] ${label}: ${sizeKB} KB`);
      return sizeKB;
    } catch (error) {
      logger.warn(`[SIZE] Could not measure size of ${label}: ${error.message}`);
      return 0;
    }
  }

  /**
     * Compare memory usage between two checkpoints
     * @param {string} checkpoint1 - First checkpoint label
     * @param {string} checkpoint2 - Second checkpoint label
     */
  compareMemoryUsage(checkpoint1, checkpoint2) {
    const cp1 = this.checkpoints.get(checkpoint1);
    const cp2 = this.checkpoints.get(checkpoint2);

    if (!cp1 || !cp2) {
      logger.warn(`[MEMORY] Checkpoints not found: ${checkpoint1}, ${checkpoint2}`);
      return;
    }

    const heapDiff = cp2.heapUsedMB - cp1.heapUsedMB;
    const timeDiff = cp2.timestamp - cp1.timestamp;

    logger.debug(`[MEMORY] Comparison ${checkpoint1} -> ${checkpoint2}:`);
    logger.debug(`  Heap Used Change: ${heapDiff > 0 ? '+' : ''}${heapDiff} MB`);
    logger.debug(`  Time Elapsed: ${timeDiff}ms`);

    if (heapDiff > 50) {
      logger.warn(`[MEMORY] Large memory increase detected: ${heapDiff} MB`);
    }
  }

  /**
     * Monitor memory usage during a function execution
     * @param {Function} fn - Function to monitor
     * @param {string} label - Label for this monitoring session
     * @returns {any} Result of the function
     */
  async monitorFunction(fn, label) {
    this.logMemoryUsage(`BEFORE - ${label}`);
    const startTime = Date.now();

    try {
      const result = await fn();
      const endTime = Date.now();

      this.logMemoryUsage(`AFTER - ${label}`);
      logger.debug(`[PERFORMANCE] ${label} took ${endTime - startTime}ms`);

      return result;
    } catch (error) {
      this.logMemoryUsage(`ERROR - ${label}`);
      throw error;
    }
  }

  /**
     * Get memory usage summary
     */
  getMemorySummary() {
    const current = process.memoryUsage();
    logger.debug(`${memoryTag} Current Summary:`);
    logger.debug(`  RSS: ${Math.round(current.rss / 1024 / 1024 * 100) / 100} MB`);
    logger.debug(`  Heap Used: ${Math.round(current.heapUsed / 1024 / 1024 * 100) / 100} MB`);
    logger.debug(`  Heap Total: ${Math.round(current.heapTotal / 1024 / 1024 * 100) / 100} MB`);
    logger.debug(`  External: ${Math.round(current.external / 1024 / 1024 * 100) / 100} MB`);
    logger.info(`  Free Memory: ${Math.round(os.freemem() / 1024 / 1024 * 100) / 100} MB`);

    // Show all checkpoints
    logger.debug(`${memoryTag} Checkpoints:`);
    for (const [label, checkpoint] of this.checkpoints) {
      logger.debug(`  ${label}: ${checkpoint.heapUsedMB} MB (${checkpoint.timestamp}ms)`);
    }
  }

  /**
     * Force garbage collection (if available)
     */
  forceGC() {
    if (global.gc) {
      logger.info(`${memoryTag} Forcing garbage collection...`);
      global.gc();
      this.logMemoryUsage('AFTER - Garbage Collection');
    } else {
      logger.warn(`${memoryTag} Garbage collection not available. Run with --expose-gc flag.`);
    }
  }

  /**
     * Analyze object properties for memory usage
     * @param {object} obj - Object to analyze
     * @param {string} label - Label for the object
     */
  analyzeObject(obj, label = 'Object') {
    if (typeof obj !== 'object' || obj === null) {
      logger.debug(`[ANALYZE] ${label}: Not an object`);
      return;
    }

    const analysis = {
      type: Array.isArray(obj) ? 'Array' : 'Object',
      length: Array.isArray(obj) ? obj.length : Object.keys(obj).length,
      size: this.getVariableSize(obj, label),
      properties: {}
    };

    // Analyze top-level properties
    const keys = Object.keys(obj).slice(0, 10); // Limit to first 10 properties
    for (const key of keys) {
      const value = obj[key];
      if (typeof value === 'object' && value !== null) {
        analysis.properties[key] = {
          type: Array.isArray(value) ? 'Array' : 'Object',
          length: Array.isArray(value) ? value.length : Object.keys(value).length,
          size: this.getVariableSize(value, `${label}.${key}`)
        };
      }
    }

    // logger.debug(`[ANALYZE] ${label}:`, analysis);
    return analysis;
  }
}

// Create a singleton instance
const memoryProfiler = new MemoryProfiler();

module.exports = {
  MemoryProfiler,
  memoryProfiler,
  // Convenience functions
  logMemoryUsage: (label) => memoryProfiler.logMemoryUsage(label),
  getVariableSize: (obj, label) => memoryProfiler.getVariableSize(obj, label),
  monitorFunction: (fn, label) => memoryProfiler.monitorFunction(fn, label),
  compareMemoryUsage: (cp1, cp2) => memoryProfiler.compareMemoryUsage(cp1, cp2),
  getMemorySummary: () => memoryProfiler.getMemorySummary(),
  forceGC: () => memoryProfiler.forceGC(),
  analyzeObject: (obj, label) => memoryProfiler.analyzeObject(obj, label)
};
