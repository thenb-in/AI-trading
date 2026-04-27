import * as fs from 'fs';
import * as path from 'path';
import { User } from '../interface/auth';

/**
 * Global test context that manages all test users and resources
 * This context is initialized at test start and cleaned up at test end
 */
export interface TestContext {
  // Admin user (from env or created)
  admin: {
    username: string;
    password: string;
    exists: boolean;
    needsPasswordReset?: boolean;
  };
  
  // Generated test user (created during signup)
  testUser: User;
  
  // Company info
  company: {
    id?: string;
    name: string;
    signupUrl?: string;
  };
  
  // Metadata
  metadata: {
    runId: string;
    startTime: string;
    contextFile: string;
  };
}

const CONTEXT_FILE = path.join(__dirname, '..', '.test-context.json');
const CONTEXT_LOG_FILE = path.join(__dirname, '..', '..', 'test-results', 'test-context.log');

/**
 * Generate unique test user credentials
 */
function generateTestUserCredentials(companyId: string): User {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const runId = process.env.E2E_RUN_ID || `run-${timestamp}`;
  
  // Generate unique but readable username
  const username = `test-user-${runId}-${random}`;
  
  // Generate secure password (meets typical password requirements)
  const password = `Test@${timestamp}${random}`;
  
  // Generate name
  const name = `Test User ${random}`;
  
  // Generate phone (10 digits, starting with valid area code)
  const phone = `555${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;
  
  return { username, password, name, phone, companyId };
}

/**
 * Initialize test context at the start of test run
 */
export function initializeTestContext(): TestContext {
  const runId = `test-run-${Date.now()}`;
  const startTime = new Date().toISOString();
  
  // Get sadmin (super-admin) credentials from env
  const adminUsername = process.env.TEST_SADMIN_USERNAME;
  const adminPassword = process.env.TEST_SADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    throw new Error(
      'Sadmin credentials not found in environment variables. ' +
      'Please set TEST_SADMIN_USERNAME and TEST_SADMIN_PASSWORD'
    );
  }
  
  // Generate test user credentials
  const companyId = process.env.TEST_COMPANY_ID || '';  // load company id from context or state
  const testUser = generateTestUserCredentials(companyId);
  
  // Get company name from env or use default
  const companyName = String(process.env.TEST_COMPANY_NAME);
  
  const context: TestContext = {
    admin: {
      username: adminUsername,
      password: adminPassword,
      exists: false, // Will be determined during test run
      needsPasswordReset: false,
    },
    testUser,
    company: {
      name: companyName,
    },
    metadata: {
      runId,
      startTime,
      contextFile: CONTEXT_FILE,
    },
  };
  
  // Save context to file
  saveContext(context);
  
  // Log context initialization
  logContext(context, 'INITIALIZED');
  
  return context;
}

/**
 * Load test context from file
 */
export function loadContext(): TestContext | null {
  if (!fs.existsSync(CONTEXT_FILE)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(CONTEXT_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error: any) {
    console.error(`Failed to load test context: ${error.message}`);
    return null;
  }
}

/**
 * Save test context to file
 */
export function saveContext(context: Partial<TestContext>): void {
  const existing = loadContext();
  const merged = existing ? { ...existing, ...context } : context;
  
  // Ensure directory exists
  const dir = path.dirname(CONTEXT_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(CONTEXT_FILE, JSON.stringify(merged, null, 2));
}

/**
 * Update specific context fields
 */
export function updateContext(updates: Partial<TestContext>): void {
  const existing = loadContext();
  if (!existing) {
    throw new Error('Test context not initialized. Call initializeTestContext() first.');
  }
  
  // Deep merge for nested objects
  const merged: TestContext = {
    ...existing,
    admin: { ...existing.admin, ...(updates.admin || {}) },
    testUser: { ...existing.testUser, ...(updates.testUser || {}) },
    company: { ...existing.company, ...(updates.company || {}) },
    metadata: { ...existing.metadata, ...(updates.metadata || {}) },
  };
  
  saveContext(merged);
  logContext(merged, 'UPDATED');
}

/**
 * Get current test context (loads from file if not provided)
 */
export function getContext(): TestContext {
  const context = loadContext();
  if (!context) {
    throw new Error('Test context not initialized. Call initializeTestContext() first.');
  }
  return context;
}

/**
 * Log context to file for debugging
 */
function logContext(context: TestContext, action: string): void {
  // Ensure log directory exists
  const logDir = path.dirname(CONTEXT_LOG_FILE);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString();
  const logEntry = `
========================================
Test Context ${action} - ${timestamp}
========================================
Run ID: ${context.metadata.runId}
Start Time: ${context.metadata.startTime}

Admin User:
  Username: ${context.admin.username}
  Password: ${context.admin.password ? '***' : 'NOT SET'}
  Exists: ${context.admin.exists}
  Needs Password Reset: ${context.admin.needsPasswordReset || false}

Test User:
  Username: ${context.testUser.username}
  Password: ${context.testUser.password ? '***' : 'NOT SET'}
  Name: ${context.testUser.name}
  Phone: ${context.testUser.phone}
  User Name: ${context.testUser.name || context.testUser.username}
  Company ID: ${context.testUser.companyId || 'NOT SET'}

Company:
  ID: ${context.company.id || 'NOT SET'}
  Name: ${context.company.name}
  Signup URL: ${context.company.signupUrl || 'NOT SET'}

========================================
`;

  fs.appendFileSync(CONTEXT_LOG_FILE, logEntry);
  
  // Also log to console (without passwords)
  console.log(`\n📋 Test Context ${action}:`);
  console.log(`   Run ID: ${context.metadata.runId}`);
  console.log(`   Admin: ${context.admin.username}`);
  console.log(`   Test User: ${context.testUser.username} (${context.testUser.name})`);
  if (context.company.id) {
    console.log(`   Company: ${context.company.name} (${context.company.id})`);
  }
}

/**
 * Clean up test context (called at end of test run)
 */
export async function cleanupTestContext(): Promise<void> {
  const context = loadContext();
  if (!context) {
    console.log('No test context to clean up');
    return;
  }
  
  const endTime = new Date().toISOString();
  const duration = new Date(endTime).getTime() - new Date(context.metadata.startTime).getTime();
  
  const cleanupLog = `
========================================
Test Context CLEANUP - ${endTime}
========================================
Run ID: ${context.metadata.runId}
Duration: ${(duration / 1000).toFixed(2)}s

Test Resources Created:
  - Test User: ${context.testUser.username}
  - Company: ${context.company.name} (${context.company.id || 'N/A'})

Note: Test users and resources should be cleaned up by cleanup tests.
If cleanup tests fail, manual cleanup may be required.

========================================
`;

  // Append cleanup log
  fs.appendFileSync(CONTEXT_LOG_FILE, cleanupLog);
  
  // Optionally delete context file (or keep for debugging)
  const keepContext = process.env.E2E_KEEP_CONTEXT === 'true';
  if (!keepContext) {
    if (fs.existsSync(CONTEXT_FILE)) {
      fs.unlinkSync(CONTEXT_FILE);
      console.log('✓ Test context file cleaned up');
    }
  } else {
    console.log('ℹ Test context file kept (E2E_KEEP_CONTEXT=true)');
  }
  
  console.log(`\n📋 Test Context Summary:`);
  console.log(`   Run ID: ${context.metadata.runId}`);
  console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
  console.log(`   Context Log: ${CONTEXT_LOG_FILE}`);
  if (keepContext) {
    console.log(`   Context File: ${CONTEXT_FILE}`);
  }
}

/**
 * Get test user credentials (for use in tests)
 */
export function getTestUserCredentials(): User {
  const context = getContext();
  return context.testUser;
}

/**
 * Get admin credentials (for use in tests)
 */
export function getAdminCredentials() {
  const context = getContext();
  return {
    username: context.admin.username,
    password: context.admin.password,
  };
}
