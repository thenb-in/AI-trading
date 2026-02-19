import * as fs from 'fs';
import * as path from 'path';

// State file is stored at the signup test root level
const STATE_FILE = path.join(__dirname, '..', '.test-state.json');

export interface TestState {
  companyId?: string;
  adminUsername?: string;
  adminPassword?: string;
  adminExists?: boolean;
  needsPasswordReset?: boolean;
  wasCompanyCreationSkipped?: boolean;
  signupUrl?: string;
  newUserUsername?: string;
  newUserPassword?: string;
}

/**
 * Save test state to a JSON file
 */
export function saveState(state: Partial<TestState>): void {
  let existingState: TestState = {};
  
  // Read existing state if file exists
  if (fs.existsSync(STATE_FILE)) {
    try {
      const content = fs.readFileSync(STATE_FILE, 'utf-8');
      existingState = JSON.parse(content);
    } catch {
      // If file is corrupted, start fresh
      existingState = {};
    }
  }
  
  // Merge with new state
  const mergedState = { ...existingState, ...state };
  
  // Write to file
  fs.writeFileSync(STATE_FILE, JSON.stringify(mergedState, null, 2));
}

/**
 * Load test state from JSON file
 */
export function loadState(): TestState {
  if (!fs.existsSync(STATE_FILE)) {
    return {};
  }
  
  try {
    const content = fs.readFileSync(STATE_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

/**
 * Clear test state
 */
export function clearState(): void {
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE);
  }
}
