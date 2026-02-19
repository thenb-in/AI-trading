import * as fs from 'fs';
import * as path from 'path';

export class TestLogger {
  private logFile: string;
  private stepNumber: number = 1;

  private getISTTime(): string {
    const now = new Date();
    // IST is UTC+5:30
    const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
    const istTime = new Date(now.getTime() + istOffset);
    // Format: YYYY-MM-DD_HH-MM-SS
    const year = istTime.getUTCFullYear();
    const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(istTime.getUTCDate()).padStart(2, '0');
    const hours = String(istTime.getUTCHours()).padStart(2, '0');
    const minutes = String(istTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(istTime.getUTCSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
  }

  constructor() {
    const timestamp = this.getISTTime();
    const logDir = path.join(__dirname, '../logs');
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    this.logFile = path.join(logDir, `integration-test-${timestamp}.txt`);
    this.writeHeader();
  }

  private writeHeader() {
    const header = `========================================
Integration Test Log
Started: ${this.getISTDateTimeString()}
========================================\n\n`;
    fs.appendFileSync(this.logFile, header);
  }

  logTestStart(testName: string) {
    const timestamp = this.getISTDateTimeString();
    const logLine = `\n[TEST START] ${testName}\nStarted at: ${timestamp}\n${'='.repeat(50)}\n`;
    fs.appendFileSync(this.logFile, logLine);
    // Also log to console
    console.log(`\n[TEST START] ${testName}`);
    console.log(`Started at: ${timestamp}`);
    console.log('='.repeat(50));
  }

  logStep(step: string, status: 'completed' | 'error', errorDetails?: string) {
    const timestamp = new Date().toISOString();
    if (status === 'completed') {
      const logLine = `Step ${this.stepNumber}: ${step} ✓\n`;
      fs.appendFileSync(this.logFile, logLine);
      // Also log to console
      console.log(`  ✓ ${step}`);
      this.stepNumber++;
    } else if (status === 'error') {
      const logLine = `Step ${this.stepNumber}: ${step} ✗ ERROR\n`;
      fs.appendFileSync(this.logFile, logLine);
      // Also log to console
      console.error(`  ✗ ${step}`);
      if (errorDetails) {
        fs.appendFileSync(this.logFile, `  ${errorDetails}\n`);
        console.error(`    ${errorDetails}`);
      }
      this.stepNumber++;
    }
  }

  /**
   * Log a sub-step (status check) without incrementing step number.
   * Use for individual checks within a step. Logs to file and console.
   * When status is 'error', pass errorDetails to log why the check failed (shown in console).
   */
  logSubStep(step: string, status: 'completed' | 'error', errorDetails?: string) {
    const indent = '    ';
    if (status === 'completed') {
      const logLine = `${indent}→ ${step} ✓\n`;
      fs.appendFileSync(this.logFile, logLine);
      console.log(`${indent}→ ${step}`);
    } else {
      const logLine = `${indent}→ ${step} ✗\n`;
      fs.appendFileSync(this.logFile, logLine);
      console.error(`${indent}→ ${step}`);
      if (errorDetails) {
        fs.appendFileSync(this.logFile, `${indent}  ${errorDetails}\n`);
        console.error(`${indent}  ${errorDetails}`);
      }
    }
  }

  getLogFilePath(): string {
    return this.logFile;
  }

  getISTDateTimeString(): string {
    const now = new Date();
    // IST is UTC+5:30
    const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
    const istTime = new Date(now.getTime() + istOffset);
    const year = istTime.getUTCFullYear();
    const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(istTime.getUTCDate()).padStart(2, '0');
    const hours = String(istTime.getUTCHours()).padStart(2, '0');
    const minutes = String(istTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(istTime.getUTCSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} IST`;
  }
}
