import { Page, Locator } from '@playwright/test';
import { TestLogger } from '../../helpers/logger';
import { getAdminCredentials, getTestUserCredentials } from '../../helpers/testContext';
import { loginWithCredentials } from './user';
import { navigateTo } from '../../helpers/navigator';

/**
 * Helper function to expand the "new users (never signed in)" tab if not already expanded
 */
async function expandNewUsersTab(
  page: Page,
  logger: TestLogger,
  usernameToApprove: string
): Promise<void> {
  try {
    // Try multiple selectors for the "new users" tab
    const tabSelectors = [
      'button:has-text("New Users")',
      'button:has-text("new users")',
      'button:has-text("Never Signed In")',
      'button:has-text("never signed in")',
      '[role="tab"]:has-text("New Users")',
      '[role="tab"]:has-text("new users")',
      '[role="tab"]:has-text("Never Signed In")',
      '[role="tab"]:has-text("never signed in")',
      'button[aria-label*="new users" i]',
      'button[aria-label*="never signed in" i]',
    ];
    
    let tabFound = false;
    for (const selector of tabSelectors) {
      try {
        const tab = page.locator(selector).first();
        if (await tab.isVisible({ timeout: 2000 })) {
          // Check if tab is already selected/expanded by multiple methods
          const isSelected = await tab.evaluate((el) => {
            return el.getAttribute('aria-selected') === 'true' ||
                   el.classList.contains('active') ||
                   el.classList.contains('selected') ||
                   el.classList.contains('Mui-selected') ||
                   el.getAttribute('data-selected') === 'true' ||
                   el.getAttribute('aria-expanded') === 'true';
          }).catch(() => false);
          
          // Also check if the tab panel/content is visible (more reliable indicator)
          const tabPanelVisible = await page.evaluate(() => {
            // Look for tab panel or content area that might be associated with "new users"
            const panels = document.querySelectorAll('[role="tabpanel"], [class*="tabpanel"], [class*="tab-content"]');
            for (const panel of panels) {
              const text = panel.textContent || '';
              if (text.toLowerCase().includes('new') || text.toLowerCase().includes('never')) {
                const style = window.getComputedStyle(panel);
                return style.display !== 'none' && style.visibility !== 'hidden';
              }
            }
            return false;
          }).catch(() => false);
          
          // Check if we can already see approve buttons or user table (indicates tab is expanded)
          const approveButtonsVisible = await page.locator('button:has-text("Approve"), button:has-text("approve")').count().catch(() => 0);
          const userTableVisible = await page.locator(`tr:has-text("${usernameToApprove}"), td:has-text("${usernameToApprove}")`).count().catch(() => 0);
          const contentAlreadyVisible = approveButtonsVisible > 0 || userTableVisible > 0;
          
          // Only click if tab is not selected AND content is not visible
          if (!isSelected && !tabPanelVisible && !contentAlreadyVisible) {
            await tab.click();
            await page.waitForTimeout(1000);
          } else if (isSelected || tabPanelVisible || contentAlreadyVisible) {
            // Tab is already expanded, don't click
            // Just wait a bit for content to be ready
            await page.waitForTimeout(500);
          }
          tabFound = true;
          break;
        }
      } catch {
        continue;
      }
    }
    
    if (!tabFound) {
      // Try to find any tab that might be the new users tab
      const allTabs = await page.locator('[role="tab"], button[class*="tab" i]').all();
      for (const tab of allTabs) {
        const text = await tab.textContent();
        if (text && (text.toLowerCase().includes('new') || text.toLowerCase().includes('never'))) {
          const isSelected = await tab.evaluate((el) => {
            return el.getAttribute('aria-selected') === 'true' ||
                   el.classList.contains('active') ||
                   el.classList.contains('selected') ||
                   el.classList.contains('Mui-selected') ||
                   el.getAttribute('aria-expanded') === 'true';
          }).catch(() => false);
          
          // Check if content is visible
          const tabPanelVisible = await page.evaluate(() => {
            const panels = document.querySelectorAll('[role="tabpanel"], [class*="tabpanel"], [class*="tab-content"]');
            for (const panel of panels) {
              const text = panel.textContent || '';
              if (text.toLowerCase().includes('new') || text.toLowerCase().includes('never')) {
                const style = window.getComputedStyle(panel);
                return style.display !== 'none' && style.visibility !== 'hidden';
              }
            }
            return false;
          }).catch(() => false);
          
          // Check if we can already see approve buttons or user table
          const approveButtonsVisible = await page.locator('button:has-text("Approve"), button:has-text("approve")').count().catch(() => 0);
          const userTableVisible = await page.locator(`tr:has-text("${usernameToApprove}"), td:has-text("${usernameToApprove}")`).count().catch(() => 0);
          const contentAlreadyVisible = approveButtonsVisible > 0 || userTableVisible > 0;
          
          if (!isSelected && !tabPanelVisible && !contentAlreadyVisible) {
            await tab.click();
            await page.waitForTimeout(1000);
          } else if (isSelected || tabPanelVisible || contentAlreadyVisible) {
            // Tab is already expanded, don't click
            await page.waitForTimeout(500);
          }
          tabFound = true;
          break;
        }
      }
    }
    
    if (!tabFound) {
      // Tab might already be expanded or might not exist - continue anyway
      logger.logStep('Expand "new users (never signed in)" tab', 'completed', 'Tab might already be expanded or not found');
    } else {
      logger.logStep('Expand "new users (never signed in)" tab', 'completed');
    }
    
    // Wait for content to load
    await page.waitForTimeout(2000);
  } catch (error: any) {
    const errorDetails = `Error: ${error.message}`;
    logger.logStep('Expand "new users (never signed in)" tab', 'error', errorDetails);
    // Continue anyway - tab might already be expanded
  }
}

/**
 * Helper function to find and click the approve button for a user
 */
async function findAndClickApproveButton(
  page: Page,
  logger: TestLogger,
  usernameToApprove: string
): Promise<void> {
  // Wait for the table/content to load
  await page.waitForLoadState('networkidle', { timeout: 10000 });
  await page.waitForTimeout(2000);
  
  // Find the row with the username
  const usernameSelectors = [
    `text=${usernameToApprove}`,
    `td:has-text("${usernameToApprove}")`,
    `tr:has-text("${usernameToApprove}")`,
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
      if (text && text.includes(usernameToApprove)) {
        userRow = row;
        break;
      }
    }
  }
  
  if (!userRow || (await userRow.count()) === 0) {
    throw new Error(`Could not find user row for ${usernameToApprove}`);
  }
  
  // Find approve button in the actions column (beside delete button)
  const approveButtonSelectors = [
    'button:has-text("Approve")',
    'button:has-text("approve")',
    'button[aria-label*="approve" i]',
    'button[title*="approve" i]',
    '[data-testid*="approve" i]',
  ];
  
  let approveButtonFound = false;
  
  // First try to find within the user row
  for (const selector of approveButtonSelectors) {
    try {
      const button = userRow.locator(selector).first();
      if (await button.isVisible({ timeout: 2000 })) {
        await button.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await button.click();
        approveButtonFound = true;
        break;
      }
    } catch {
      continue;
    }
  }
  
  // If not found in row, try to find in the same area
  if (!approveButtonFound) {
    // Find all approve buttons and check which one is near the username
    for (const selector of approveButtonSelectors) {
      try {
        const buttons = await page.locator(selector).all();
        for (const button of buttons) {
          if (await button.isVisible({ timeout: 1000 })) {
            await button.scrollIntoViewIfNeeded();
            await page.waitForTimeout(500);
            await button.click();
            approveButtonFound = true;
            break;
          }
        }
        if (approveButtonFound) break;
      } catch {
        continue;
      }
    }
  }
  
  if (!approveButtonFound) {
    throw new Error(`Could not find approve button for user ${usernameToApprove}`);
  }
  
  // Wait a bit after clicking before checking for modal
  await page.waitForTimeout(1000);
}

/**
 * Helper function to handle the approval modal
 */
async function handleApprovalModal(
  page: Page,
  logger: TestLogger
): Promise<void> {
  // Wait for modal to appear - look for the modal with "Approve User" title
  try {
    // Wait for modal with "Approve User" title to appear
    await page.waitForSelector('text=/Approve User/i', { 
      state: 'visible', 
      timeout: 10000 
    });
    
    // Wait a bit for modal to fully render
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
      throw new Error('Approval modal did not appear after clicking approve button');
    }
  }
  
  // Step 5.1: Click on "Select a role" dropdown and select "sadmin" (second to last option)
  try {
    // Find the select dropdown for role
    const roleSelect = page.locator('select').filter({ hasText: /Select a role/i }).or(page.locator('select')).first();
    
    // Wait for select to be visible
    await roleSelect.waitFor({ state: 'visible', timeout: 5000 });
    
    // Click on the select dropdown to open it
    await roleSelect.click();
    await page.waitForTimeout(500);
    
    // Get all options in the select dropdown
    const options = await roleSelect.locator('option').all();
    
    if (options.length === 0) {
      throw new Error('No options found in role dropdown');
    }
    
    // Find "sadmin" option by text first, otherwise select second to last option
    let sadminOptionIndex = -1;
    let sadminFound = false;
    
    for (let i = 0; i < options.length; i++) {
      const optionText = await options[i].textContent();
      if (optionText && optionText.toLowerCase().includes('sadmin')) {
        sadminOptionIndex = i;
        sadminFound = true;
        break;
      }
    }
    
    // If sadmin not found by text, select second to last option (skip first option which is "-- Select a role --")
    if (!sadminFound) {
      if (options.length >= 2) {
        // Second to last option (options.length - 2)
        sadminOptionIndex = options.length - 2;
      } else {
        throw new Error('Not enough options in role dropdown to select second to last');
      }
    }
    
    // Get the value of the selected option
    const selectedOption = options[sadminOptionIndex];
    const optionValue = await selectedOption.getAttribute('value');
    
    if (!optionValue) {
      throw new Error('Selected option does not have a value');
    }
    
    // Select the option by value
    await roleSelect.selectOption({ value: optionValue });
    await page.waitForTimeout(500);
    
    logger.logStep('Select "sadmin" from role dropdown (second to last option)', 'completed');
  } catch (error: any) {
    const errorDetails = `Error: ${error.message}`;
    logger.logStep('Select "sadmin" from role dropdown', 'error', errorDetails);
    throw error;
  }
  
  // Step 5.2: Uncheck "User must reset password on next login" checkbox
  try {
    // Find the checkbox - it's inside a label with span containing "User must reset password on next login"
    // The label contains: <input type="checkbox" /> and <span>User must reset password on next login</span>
    let checkbox: Locator | null = null;
    let checkboxFound = false;
    
    // Strategy 1: Find label by text and get checkbox from it
    try {
      const labelWithText = page.locator('label:has(span:has-text("User must reset password on next login")), label:has(span:has-text("user must reset password on next login"))').first();
      if (await labelWithText.isVisible({ timeout: 2000 }).catch(() => false)) {
        checkbox = labelWithText.locator('input[type="checkbox"]').first();
        if (await checkbox.isVisible({ timeout: 1000 }).catch(() => false)) {
          checkboxFound = true;
        }
      }
    } catch {
      // Continue to next strategy
    }
    
    // Strategy 2: Find checkbox using xpath - find span with text and get preceding checkbox
    if (!checkboxFound) {
      try {
        const xpathCheckbox = page.locator('xpath=//span[contains(text(), "User must reset password on next login") or contains(text(), "user must reset password on next login")]/preceding-sibling::input[@type="checkbox"]').first();
        if (await xpathCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
          checkbox = xpathCheckbox;
          checkboxFound = true;
        }
      } catch {
        // Continue to next strategy
      }
    }
    
    // Strategy 3: Find label by contains text and get checkbox
    if (!checkboxFound) {
      try {
        const labelContainingText = page.locator('label:has-text("User must reset password on next login"), label:has-text("user must reset password on next login")').first();
        if (await labelContainingText.isVisible({ timeout: 2000 }).catch(() => false)) {
          checkbox = labelContainingText.locator('input[type="checkbox"]').first();
          if (await checkbox.isVisible({ timeout: 1000 }).catch(() => false)) {
            checkboxFound = true;
          }
        }
      } catch {
        // Continue to next strategy
      }
    }
    
    // Strategy 4: Find all checkboxes and check which one is in a parent with reset password text
    if (!checkboxFound) {
      try {
        const allCheckboxes = await page.locator('input[type="checkbox"]').all();
        for (const cb of allCheckboxes) {
          if (await cb.isVisible({ timeout: 1000 }).catch(() => false)) {
            // Check if this checkbox is in a label or parent that contains reset password text
            const isNearResetPasswordText = await cb.evaluate((el) => {
              let current = el.parentElement;
              while (current && current !== document.body) {
                const text = current.textContent || '';
                if (text.toLowerCase().includes('reset password') || text.toLowerCase().includes('next login')) {
                  return true;
                }
                current = current.parentElement;
              }
              return false;
            }).catch(() => false);
            
            if (isNearResetPasswordText) {
              checkbox = cb;
              checkboxFound = true;
              break;
            }
          }
        }
      } catch {
        // Continue to next strategy
      }
    }
    
    // Strategy 5: Last resort - find the first checkbox in the modal
    if (!checkboxFound) {
      try {
        const firstCheckbox = page.locator('input[type="checkbox"]').first();
        if (await firstCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
          checkbox = firstCheckbox;
          checkboxFound = true;
        }
      } catch {
        // Continue
      }
    }
    
    if (!checkboxFound || !checkbox) {
      throw new Error('Could not find "User must reset password on next login" checkbox');
    }
    
    // Check if it's checked and uncheck if needed
    const isChecked = await checkbox.isChecked();
    if (isChecked) {
      await checkbox.uncheck();
      await page.waitForTimeout(300);
    }
    
    await page.waitForTimeout(500);
    logger.logStep('Uncheck "User must reset password on next login" checkbox', 'completed');
  } catch (error: any) {
    const errorDetails = `Error: ${error.message}`;
    logger.logStep('Uncheck "User must reset password on next login" checkbox', 'error', errorDetails);
    throw error;
  }
  
  // Step 5.3: Click approve button in the modal
  try {
    // Find the approve button - it should be visible and enabled
    const approveButton = page.locator('button:has-text("Approve"):visible').first();
    
    await approveButton.waitFor({ state: 'visible', timeout: 5000 });
    
    // Check if button is disabled
    const isDisabled = await approveButton.isDisabled().catch(() => false);
    if (isDisabled) {
      throw new Error('Approve button is disabled - role may not be selected');
    }
    
    await approveButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await approveButton.click();
    
    // Wait for modal to close and approval to complete
    await page.waitForTimeout(2000);
    logger.logStep('Click approve button in modal', 'completed');
  } catch (error: any) {
    const errorDetails = `Error: ${error.message}`;
    logger.logStep('Click approve button in modal', 'error', errorDetails);
    throw error;
  }
}

/**
 * Helper function to approve a user (login as admin, navigate to users, expand new users tab, approve)
 */
export async function approveUser(
  page: Page,
  logger: TestLogger,
  usernameToApprove?: string,
  
): Promise<void> {
  const { username: adminUsername, password: adminPassword } = getAdminCredentials();
  const finalUsernameToApprove = usernameToApprove || getTestUserCredentials().username;

  // ========== STEP 1: Login as admin ==========
  await loginWithCredentials(page, logger, adminUsername, adminPassword);
  
  // ========== STEP 2: Navigate to admin/users page ==========
  try {
    await navigateTo(page, logger, '/admin/users', false);
    await page.waitForTimeout(1500);
    logger.logStep('Navigate to admin/users page', 'completed');
  } catch (error: any) {
    const errorDetails = `Error: ${error.message}`;
    logger.logStep('Navigate to admin/users page', 'error', errorDetails);
    throw error;
  }
  
  // ========== STEP 3: Expand "new users (never signed in)" tab if not already expanded ==========
  await expandNewUsersTab(page, logger, finalUsernameToApprove);
  
  // ========== STEP 4: Find and click approve button for the user ==========
  try {
    await findAndClickApproveButton(page, logger, finalUsernameToApprove);
  } catch (error: any) {
    const errorDetails = `Error: ${error.message}`;
    logger.logStep(`Find and click approve button for user "${finalUsernameToApprove}"`, 'error', errorDetails);
    throw error;
  }
  
  // ========== STEP 5: Handle approval modal ==========
  try {
    await handleApprovalModal(page, logger);
    logger.logStep(`Approve user "${finalUsernameToApprove}"`, 'completed');
  } catch (error: any) {
    const errorDetails = `Error: ${error.message}`;
    logger.logStep('Handle approval modal', 'error', errorDetails);
    throw error;
  }
}
