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
    
    this.logFile = path.join(logDir, `signup-test-${timestamp}.txt`);
    this.writeHeader();
  }

  private writeHeader() {
    const header = `========================================
Signup Test Log
Started: ${this.getISTDateTimeString()}
========================================\n\n`;
    fs.appendFileSync(this.logFile, header);
  }

  logStep(step: string, status: 'completed' | 'error', errorDetails?: string) {
    if (status === 'completed') {
      const logLine = `Step ${this.stepNumber}: ${step} ✓\n`;
      fs.appendFileSync(this.logFile, logLine);
      this.stepNumber++;
    } else if (status === 'error') {
      const logLine = `Step ${this.stepNumber}: ${step} ✗ ERROR\n`;
      fs.appendFileSync(this.logFile, logLine);
      if (errorDetails) {
        fs.appendFileSync(this.logFile, `  ${errorDetails}\n`);
      }
      this.stepNumber++;
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

// Backwards-compatible alias used across e2e helpers/tests.
export { TestLogger as SignupTestLogger };
