import { TestLogger } from "../../helpers/logger";
import { isPageAccessible } from "../../helpers/navigator";
import { setupTest } from "../../helpers/setup";
import { getAdminCredentials } from "../../helpers/testContext";
import { loginWithCredentials } from "../../actions/auth/user";
import { logoutUser } from "../../actions/auth/logout-user";
import { test } from "@playwright/test";

test.describe('Auth - Logout User', () => {
    test('logout user', async ({ page }) => {
        const { logger, runTest } = setupTest(page, {
            timeout: 60000,
            captureApiResponses: false,
            apiUrlsToCapture: [],
        });

        await runTest(async () => {
            const isLoggedIn = await isPageAccessible(page, logger, '/admin/navigator');
            if (!isLoggedIn) {
                const { username: adminUsername, password: adminPassword } = getAdminCredentials();
                await loginWithCredentials(page, logger, adminUsername, adminPassword);
                await isPageAccessible(page, logger, '/admin/navigator');
            }
            await logoutUser(page, logger);
            logger.logStep('Logout user', 'completed');
        });
    });
});
