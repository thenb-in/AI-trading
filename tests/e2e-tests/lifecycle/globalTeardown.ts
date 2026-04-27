import { safeCloseConnection } from "../helpers/dbUtils";
import { cleanupTestContext } from "../helpers/testContext";

export default async function globalTeardown() {
  console.log('\n🧹 Global teardown: cleaning up test resources...\n');
  
  // Clean up test context
  try {
    await cleanupTestContext();
  } catch (error: any) {
    console.error(`⚠️  Error cleaning up test context: ${error.message}`);
  }
  
  // Close database connections
  try {
    console.log('Closing DB pool...');
    await safeCloseConnection();
    console.log('✓ Database pool closed.');
  } catch (error: any) {
    console.error(`⚠️  Error closing DB pool: ${error.message}`);
  }
  
  console.log('\n✓ Global teardown completed.\n');
}
