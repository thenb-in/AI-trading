import { Page, Locator } from '@playwright/test';
import { SignupTestLogger } from './logger';

/**
 * Helper function to find a user row and click the delete button
 */
async function findUserRowAndClickDelete(
  page: Page,
  logger: SignupTestLogger,
  usernameToDelete: string
): Promise<void> {
  // Wait for the table/content to load
  await page.waitForLoadState('domcontentloaded');
  // Wait for user table or list to be visible
  try {
    await page.waitForSelector('table, [class*="table"], tr, [class*="row"], [class*="user"]', {
      state: 'visible',
      timeout: 10000,
    });
  } catch {
    // Continue even if selector not found - might load differently
  }
  await page.waitForTimeout(1000);
  
  // Find the row with the username
  const usernameSelectors = [
    `text=${usernameToDelete}`,
    `td:has-text("${usernameToDelete}")`,
    `tr:has-text("${usernameToDelete}")`,
  ];
  
  let userRow: Locator | null = null;
  for (const selector of usernameSelectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        // Get the row element
        const rowLocator = element.locator('xpath=ancestor::tr').first();
        if ((await rowLocator.count()) > 0) {
          userRow = rowLocator;
          break;
        }
        // If not in a table, try to find parent container
        const parentLocator = element.locator('xpath=ancestor::*[contains(@class, "row") or contains(@class, "item")]').first();
        if ((await parentLocator.count()) > 0) {
          userRow = parentLocator;
          break;
        }
      }
    } catch {
      continue;
    }
  }
  
  if (!userRow || (await userRow.count()) === 0) {
    // Try to find by searching all rows
    const allRows = await page.locator('tr, [class*="row"], [class*="item"]').all();
    for (const row of allRows) {
      const text = await row.textContent();
      if (text && text.includes(usernameToDelete)) {
        userRow = row;
        break;
      }
    }
  }
  
  if (!userRow || (await userRow.count()) === 0) {
    throw new Error(`Could not find user row for ${usernameToDelete}`);
  }
  
  // Scroll the row into view to ensure it's visible
  await userRow.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  
  // Try to slide/scroll the row horizontally to reveal action buttons
  // This might involve hovering or swiping the row
  try {
    // Strategy 1: Hover over the row to reveal actions
    await userRow.hover();
    await page.waitForTimeout(500);
  } catch {
    // Continue even if hover fails
  }
  
  // Try to find and interact with the row to reveal actions
  // Some implementations require clicking or dragging the row
  try {
    // Get row bounding box and try to swipe/drag to the left
    const box = await userRow.boundingBox();
    if (box) {
      // Simulate a swipe/drag to the left to reveal actions
      await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + 50, box.y + box.height / 2, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(500);
    }
  } catch {
    // Continue even if swipe fails
  }
  
  // Find delete button in the actions column
  const deleteButtonSelectors = [
    'button:has-text("Delete"):visible',
    'button:has-text("delete"):visible',
    'button[aria-label*="delete" i]:visible',
    'button[title*="delete" i]:visible',
    '[data-testid*="delete" i]:visible',
    'svg[class*="trash" i]',
    '[class*="trash" i]',
  ];
  
  let deleteButtonFound = false;
  
  // First try to find within the user row
  for (const selector of deleteButtonSelectors) {
    try {
      const button = userRow.locator(selector).first();
      if (await button.isVisible({ timeout: 2000 })) {
        await button.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        
        // If it's an SVG or icon, try to find the parent button
        const tagName = await button.evaluate((el) => el.tagName.toLowerCase());
        if (tagName === 'svg' || tagName === 'path') {
          const parentButton = button.locator('xpath=ancestor::button').first();
          if (await parentButton.count() > 0) {
            await parentButton.click();
          } else {
            await button.click();
          }
        } else {
          await button.click();
        }
        deleteButtonFound = true;
        break;
      }
    } catch {
      continue;
    }
  }
  
  // If not found in row, try to find delete buttons near the username
  if (!deleteButtonFound) {
    // Try to find all visible delete buttons
    for (const selector of deleteButtonSelectors) {
      try {
        const buttons = await page.locator(selector).all();
        for (const button of buttons) {
          if (await button.isVisible({ timeout: 1000 })) {
            await button.scrollIntoViewIfNeeded();
            await page.waitForTimeout(500);
            
            // Check if button is near the username
            const buttonBox = await button.boundingBox();
            const rowBox = await userRow.boundingBox();
            if (buttonBox && rowBox) {
              // Check if button is within the row's vertical bounds (with some tolerance)
              if (Math.abs(buttonBox.y - rowBox.y) < 100) {
                // If it's an SVG or icon, try to find the parent button
                const tagName = await button.evaluate((el) => el.tagName.toLowerCase());
                if (tagName === 'svg' || tagName === 'path') {
                  const parentButton = button.locator('xpath=ancestor::button').first();
                  if (await parentButton.count() > 0) {
                    await parentButton.click();
                  } else {
                    await button.click();
                  }
                } else {
                  await button.click();
                }
                deleteButtonFound = true;
                break;
              }
            }
          }
        }
        if (deleteButtonFound) break;
      } catch {
        continue;
      }
    }
  }
  
  if (!deleteButtonFound) {
    throw new Error(`Could not find delete button for user ${usernameToDelete}`);
  }
  
  // Wait a bit after clicking before checking for modal
  await page.waitForTimeout(1000);
}

/**
 * Helper function to handle the delete confirmation dialog
 */
async function handleDeleteConfirmationDialog(
  page: Page,
  logger: SignupTestLogger
): Promise<void> {
  // Wait for confirmation dialog to appear
  try {
    // Wait for dialog with "Delete User" title to appear
    await page.waitForSelector('text=/Delete User/i', { 
      state: 'visible', 
      timeout: 10000 
    });
    
    // Wait a bit for dialog to fully render
    await page.waitForTimeout(1000);
  } catch (error: any) {
    // Try alternative - wait for any modal/dialog
    try {
      await page.waitForSelector('[role="dialog"], .modal, [class*="modal" i]', {
        state: 'visible',
        timeout: 10000,
      });
      await page.waitForTimeout(1000);
    } catch {
      throw new Error('Delete confirmation dialog did not appear after clicking delete button');
    }
  }
  
  // Click the delete button in the confirmation dialog
  try {
    // Find the delete button - it should be red and visible
    // Strategy 1: Find button with red background class and "Delete" text
    let deleteButton: Locator | null = null;
    
    // First, try to find by class and text
    try {
      const redDeleteButton = page.locator('button.bg-red-600, button[class*="red-600"], button[class*="red" i]').filter({ hasText: /Delete/i });
      if (await redDeleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        deleteButton = redDeleteButton.first();
      }
    } catch {
      // Continue to next strategy
    }
    
    // Strategy 2: Find all buttons in dialog and get the one with "Delete" text that's not Cancel
    if (!deleteButton) {
      try {
        const dialogButtons = await page.locator('[role="dialog"] button, .modal button, [class*="modal" i] button').all();
        for (const button of dialogButtons) {
          const buttonText = await button.textContent();
          const isVisible = await button.isVisible({ timeout: 1000 }).catch(() => false);
          const isDisabled = await button.isDisabled().catch(() => false);
          
          if (isVisible && !isDisabled && buttonText && buttonText.trim().toLowerCase() === 'delete') {
            deleteButton = button;
            break;
          }
        }
      } catch {
        // Continue to next strategy
      }
    }
    
    // Strategy 3: Find button by text content directly
    if (!deleteButton) {
      try {
        const buttons = await page.locator('button:has-text("Delete"), button:has-text("delete")').all();
        for (const button of buttons) {
          const isVisible = await button.isVisible({ timeout: 1000 }).catch(() => false);
          const isDisabled = await button.isDisabled().catch(() => false);
          const buttonText = await button.textContent();
          
          // Make sure it's not the Cancel button and it's visible and enabled
          if (isVisible && !isDisabled && buttonText && 
              buttonText.trim().toLowerCase() === 'delete' &&
              !buttonText.toLowerCase().includes('cancel')) {
            deleteButton = button;
            break;
          }
        }
      } catch {
        // Continue
      }
    }
    
    // Strategy 4: Find the last button in the dialog (usually the confirm button)
    if (!deleteButton) {
      try {
        const lastButton = page.locator('[role="dialog"] button:last-child, .modal button:last-child').last();
        if (await lastButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          const buttonText = await lastButton.textContent();
          if (buttonText && buttonText.toLowerCase().includes('delete')) {
            deleteButton = lastButton;
          }
        }
      } catch {
        // Continue
      }
    }
    
    if (!deleteButton) {
      throw new Error('Could not find delete button in confirmation dialog');
    }
    
    // Ensure button is visible and enabled before clicking
    await deleteButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    
    // Check if button is enabled
    const isDisabled = await deleteButton.isDisabled().catch(() => false);
    if (isDisabled) {
      throw new Error('Delete button is disabled');
    }
    
    // Click the button and wait for it to complete
    await deleteButton.click({ timeout: 5000 });
    
    // Wait for dialog to disappear (more reliable than fixed timeout)
    try {
      await page.waitForSelector('[role="dialog"], .modal, [class*="modal" i]', {
        state: 'hidden',
        timeout: 5000,
      });
    } catch {
      // If dialog doesn't disappear, wait a bit and check if it's gone
      await page.waitForTimeout(1000);
      const dialogStillVisible = await page.locator('[role="dialog"], .modal').isVisible({ timeout: 1000 }).catch(() => false);
      if (dialogStillVisible) {
        // Try clicking again
        await deleteButton.click({ timeout: 5000 });
        await page.waitForTimeout(1000);
      }
    }
    
    // Wait a bit more for deletion to complete
    await page.waitForTimeout(1000);
    logger.logStep('Click delete button in confirmation dialog', 'completed');
  } catch (error: any) {
    const errorDetails = `Error: ${error.message}`;
    logger.logStep('Click delete button in confirmation dialog', 'error', errorDetails);
    throw error;
  }
}

/**
 * Helper function to delete a user (login as admin, navigate to users, find and delete user)
 */
export async function deleteUser(
  page: Page,
  logger: SignupTestLogger,
  adminUsername: string,
  adminPassword: string,
  usernameToDelete: string = 'automated-mahaveer'
): Promise<void> {
  // ========== STEP 1: Login as admin ==========
  try {
    // Check current URL - if already logged in as admin, skip login
    const currentUrl = page.url();
    if (currentUrl.includes('/admin')) {
      logger.logStep('Login as admin (for user deletion)', 'completed', 'Already logged in as admin');
    } else {
      // Check if we're already on login page (after logout)
      const isOnLoginPage = currentUrl === `${process.env.FRONTEND_URL}/` || 
                            currentUrl.includes('/login') || 
                            !currentUrl.includes('/admin');
      
      if (!isOnLoginPage) {
        // Navigate to login page - use commit for faster navigation
        await page.goto('/', {
          waitUntil: 'commit',
          timeout: 10000,
        });
      }
      
      // Wait for login form to be visible (with shorter timeout)
      await page.waitForSelector('input[name="username"], input[id="username"], input[type="text"]', {
        state: 'visible',
        timeout: 5000,
      });
      
      // Clear any existing values and fill credentials
      await page.fill('input[name="username"], input[id="username"]', adminUsername);
      await page.fill('input[name="password"], input[id="password"]', adminPassword);
      
      // Click submit immediately - no need to wait
      await page.click('button[type="submit"]');
      
      // Wait for navigation to admin page - use URL wait (more efficient than timeout)
      await page.waitForURL('**/admin**', { timeout: 10000 });
      
      // Wait for page to be ready (minimal wait)
      await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
      
      logger.logStep('Login as admin (for user deletion)', 'completed');
    }
  } catch (error: any) {
    const errorDetails = `Error: ${error.message}`;
    logger.logStep('Login as admin (for user deletion)', 'error', errorDetails);
    throw error;
  }
  
  // ========== STEP 2: Navigate to admin/users page ==========
  try {
    // Check if we're already on the users page
    const currentUrl = page.url();
    if (currentUrl.includes('/admin/users')) {
      logger.logStep('Navigate to admin/users page (for user deletion)', 'completed', 'Already on admin/users page');
      await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
    } else {
      // Try navigation with shorter timeout
      try {
        await page.goto('/admin/users', {
          waitUntil: 'commit',
          timeout: 10000,
        });
        // Wait for URL to change
        await page.waitForURL('**/admin/users**', { timeout: 5000 });
      } catch {
        // If goto fails, try JavaScript navigation (faster)
        await page.evaluate(() => {
          window.location.href = '/admin/users';
        });
        await page.waitForURL('**/admin/users**', { timeout: 5000 });
      }
      
      // Wait for page to be ready (minimal wait)
      await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
      
      // Wait for page content (with shorter timeout)
      try {
        await page.waitForSelector('table, [class*="table"], [class*="user"], tr, [class*="row"]', {
          state: 'visible',
          timeout: 5000,
        });
      } catch {
        // Continue even if selector not found - page might load differently
      }
      
      logger.logStep('Navigate to admin/users page (for user deletion)', 'completed');
    }
  } catch (error: any) {
    const errorDetails = `Error: ${error.message}`;
    logger.logStep('Navigate to admin/users page (for user deletion)', 'error', errorDetails);
    throw error;
  }
  
  // ========== STEP 3: Find user row and click delete button ==========
  try {
    await findUserRowAndClickDelete(page, logger, usernameToDelete);
    logger.logStep(`Find and click delete button for user "${usernameToDelete}"`, 'completed');
  } catch (error: any) {
    const errorDetails = `Error: ${error.message}`;
    logger.logStep(`Find and click delete button for user "${usernameToDelete}"`, 'error', errorDetails);
    throw error;
  }
  
  // ========== STEP 4: Handle delete confirmation dialog ==========
  try {
    await handleDeleteConfirmationDialog(page, logger);
    logger.logStep(`Delete user "${usernameToDelete}"`, 'completed');
  } catch (error: any) {
    const errorDetails = `Error: ${error.message}`;
    logger.logStep('Handle delete confirmation dialog', 'error', errorDetails);
    throw error;
  }
}
