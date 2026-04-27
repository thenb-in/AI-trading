import { FullConfig } from '@playwright/test';
import { initializeTestContext } from '../helpers/testContext';

/**
 * Global setup runs once before all tests
 * Initializes the test context with admin credentials and generates test user credentials
 */
async function globalSetup(config: FullConfig) {
  console.log('\n🚀 Initializing E2E Test Context...\n');
  
  try {
    const context = initializeTestContext();
    console.log(`✓ Test context initialized with Run ID: ${context.metadata.runId}`);
    console.log(`✓ Admin user: ${context.admin.username}`);
    console.log(`✓ Test user will be: ${context.testUser.username}`);
    console.log(`✓ Company: ${context.company.name}\n`);
    
    return context;
  } catch (error: any) {
    console.error(`\n❌ Failed to initialize test context: ${error.message}\n`);
    throw error;
  }
}

export default globalSetup;
