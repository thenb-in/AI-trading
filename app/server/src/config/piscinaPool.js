const Piscina = require('piscina');
const path = require('path');
const logger = require('@startup/logger');
const env = require('@startup/src/config/env');

/**
 * PiscinaPoolManager - Singleton worker pool manager
 *
 * This class manages a single Piscina worker pool instance that can be used
 * throughout the application for CPU-intensive tasks. The pool is initialized
 * once and reused everywhere.
 *
 * Usage:
 *   const { piscinaPool } = require('./config/piscinaPool');
 *   const result = await piscinaPool.run({ data: 'some data' }, 'path/to/worker.js');
 */
class PiscinaPoolManager {
  constructor() {
    this.pool = null;
    this.isInitialized = false;

    this.config = {
      maxThreads: env.PISCINA_MAX_THREADS,
      minThreads: env.PISCINA_MIN_THREADS,
      maxQueue: env.PISCINA_MAX_QUEUE,
      idleTimeout: env.PISCINA_IDLE_TIMEOUT,
      workerDir: env.PISCINA_WORKER_DIR
    };
  }

  /**
   * Initialize the Piscina pool
   * This should be called once during application startup
   */
  initialize() {
    const poolTag = '[PiscinaPool]';
    if (this.isInitialized) {
      logger.warn(`${poolTag} Pool already initialized`);
      return;
    }

    // maxThreads=0 means "disabled" — skip pool creation so isReady() returns false
    // and every caller transparently falls back to the main thread.
    if (!this.config.maxThreads) {
      logger.info(`${poolTag} Disabled (PISCINA_MAX_THREADS=0); all tasks will run on the main thread`);
      return;
    }

    try {
      this.pool = new Piscina({
        filename: null, // Will be set per-task
        maxThreads: this.config.maxThreads,
        minThreads: this.config.minThreads || undefined,
        maxQueue: this.config.maxQueue,
        idleTimeout: this.config.idleTimeout
      });

      // Event handlers for monitoring
      this.pool.on('error', (error) => {
        const errorMsg = error.message;
        logger.error(`${poolTag} Worker pool error: ${errorMsg}`);
      });

      this.pool.on('drain', () => {
        logger.debug(`${poolTag} All tasks completed, pool drained`);
      });

      this.isInitialized = true;
      const maxThreads = this.config.maxThreads;
      const minThreads = this.config.minThreads;
      logger.info(`${poolTag} Initialized with ${maxThreads} max threads, ${minThreads} min threads`);
    } catch (error) {
      logger.error(`${poolTag} Failed to initialize pool: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Run a task in the worker pool
   * @param {any} data - Data to pass to the worker
   * @param {string} workerFile - Path to the worker file (relative to workerDir or absolute)
   * @param {object} options - Additional options (name, transferList, etc.)
   * @returns {Promise<any>} Result from the worker
   */
  async run(data, workerFile, options = {}) {
    const poolTag = '[PiscinaPool]';
    if (!this.isInitialized) {
      logger.warn(`${poolTag} Pool not initialized, initializing now...`);
      this.initialize();
    }

    if (!this.pool) {
      throw new Error(`${poolTag} Pool is not available`);
    }

    // Resolve worker file path
    let workerPath = workerFile;
    if (!path.isAbsolute(workerFile)) {
      workerPath = path.resolve(this.config.workerDir, workerFile);
    }

    try {
      const startTime = Date.now();
      const result = await this.pool.run(data, {
        filename: workerPath,
        ...options
      });
      const duration = Date.now() - startTime;
      logger.debug(`${poolTag} Task completed in ${duration}ms (worker: ${workerFile})`);
      return result;
    } catch (error) {
      logger.error(`${poolTag} Task failed (worker: ${workerFile}): ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Run multiple tasks in parallel
   * @param {Array<{data: any, workerFile: string, options?: object}>} tasks - Array of tasks
   * @returns {Promise<Array<any>>} Array of results
   */
  async runMultiple(tasks) {
    if (!this.isInitialized) {
      this.initialize();
    }

    const promises = tasks.map(task =>
      this.run(task.data, task.workerFile, task.options || {})
    );

    return Promise.all(promises);
  }

  /**
   * Run tasks with a concurrency limit (max `concurrency` running at once).
   * Use when you have many tasks and want to cap parallel workers (same cap as streaming buffer).
   * @param {Array<{data: any, workerFile: string, options?: object}>} tasks - Array of tasks
   * @param {number} concurrency - Max tasks to run in parallel
   * @returns {Promise<Array<any>>} Array of results (same order as tasks)
   */
  async runWithConcurrency(tasks, concurrency) {
    if (!this.isInitialized) {
      this.initialize();
    }

    const results = [];
    for (let i = 0; i < tasks.length; i += concurrency) {
      const batch = tasks.slice(i, i + concurrency);
      const batchResults = await this.runMultiple(batch);
      results.push(...batchResults);
    }
    return results;
  }

  /**
   * Get pool statistics
   * @returns {object} Pool statistics
   */
  getStats() {
    if (!this.pool) {
      return { initialized: false };
    }

    return {
      initialized: this.isInitialized,
      queueSize: this.pool.queueSize,
      threads: {
        total: this.pool.threads.length,
        idle: this.pool.threads.filter(t => t.usage === 0).length,
        busy: this.pool.threads.filter(t => t.usage > 0).length
      },
      config: this.config
    };
  }

  /**
   * Gracefully shutdown the pool
   * @returns {Promise<void>}
   */
  async shutdown() {
    const poolTag = '[PiscinaPool]';
    if (!this.pool || !this.isInitialized) {
      logger.info(`${poolTag} Pool not initialized, nothing to shutdown`);
      return;
    }

    try {
      logger.info(`${poolTag} Shutting down worker pool...`);
      await this.pool.destroy();
      this.isInitialized = false;
      this.pool = null;
      logger.info(`${poolTag} Worker pool shutdown complete`);
    } catch (error) {
      logger.error(`${poolTag} Error during shutdown: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Check if pool is ready
   * @returns {boolean}
   */
  isReady() {
    return this.isInitialized && this.pool !== null;
  }
}

// Create singleton instance
const piscinaPool = new PiscinaPoolManager();

module.exports = {
  PiscinaPoolManager,
  piscinaPool,
  // Convenience functions
  run: (data, workerFile, options) => piscinaPool.run(data, workerFile, options),
  runMultiple: (tasks) => piscinaPool.runMultiple(tasks),
  runWithConcurrency: (tasks, concurrency) => piscinaPool.runWithConcurrency(tasks, concurrency),
  getStats: () => piscinaPool.getStats(),
  shutdown: () => piscinaPool.shutdown(),
  initialize: () => piscinaPool.initialize(),
  isReady: () => piscinaPool.isReady()
};

