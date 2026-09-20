import { TestLogger } from "../../helpers/logger";
import { User } from "../../interface/auth";
import * as fs from 'fs';
import * as path from 'path';
import { getAdminCredentials } from "../../helpers/testContext";
import { getContext } from "../../helpers/testContext";
import { spawn } from 'child_process';
import { stripAnsiCodes } from "../../helpers/terminalHelper";

/**
 * Helper function to create a company with automated inputs
 * Runs npm run create-new-company in the server directory
 */
export async function createCompanyWithAdmin(logger: TestLogger): Promise<User> {
    return new Promise((resolve, reject) => {
        // company.ts lives at tests/e2e-tests/actions/server/; up 4 levels lands at repo root.
        // The runnable server is app/server (it holds .env); the script delegates to startup/server.
        const serverDir = path.resolve(__dirname, '../../../../app/server');
        const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

        if (!fs.existsSync(serverDir)) {
            reject(new Error(`Server directory not found: ${serverDir}`));
            return;
        }

        // Log the start of company creation
        // get admin name and password from test context
        const { username: adminName, password: adminPassword } = getAdminCredentials();
        const companyName = getContext().company.name;

        fs.appendFileSync(logger.getLogFilePath(), `\n--- Company Creation Details ---\n`);
        fs.appendFileSync(logger.getLogFilePath(), `Command: npm run create-new-company\n`);
        fs.appendFileSync(logger.getLogFilePath(), `Directory: ${serverDir}\n`);
        fs.appendFileSync(logger.getLogFilePath(), `Company Name: ${companyName}\n`);
        fs.appendFileSync(logger.getLogFilePath(), `Admin Name: ${adminName}\n`);
        fs.appendFileSync(logger.getLogFilePath(), `Admin Username: ${adminName}\n`);
        fs.appendFileSync(logger.getLogFilePath(), `Admin Password: ${adminPassword}\n`);
        fs.appendFileSync(logger.getLogFilePath(), `Phone Number: (empty - will skip)\n`);
        fs.appendFileSync(logger.getLogFilePath(), `\n--- Process Output ---\n`);

        // In CI, the actual server under test may be running against a
        // per-run database (postgres-up exports DB_HOST/DB_NAME to
        // $GITHUB_ENV, e.g. linux_built_tests's deploy container gets a
        // DATABASE_URL built from these) while this CLI runs directly on
        // the runner against app/server/.env's static default DATABASE_URL.
        // Without this override the company gets created in the wrong
        // database — invisible to the server the e2e suite actually talks
        // to, so the next test's login fails as if the admin never existed.
        const dbOverrideEnv = (process.env.DB_HOST && process.env.DB_NAME)
            ? { DATABASE_URL: `postgresql://postgres:postgres@${process.env.DB_HOST}:5432/${process.env.DB_NAME}` }
            : {};

        const child = spawn(npmCommand, ['run', 'create-new-company'], {
            cwd: serverDir,
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: false,
            env: { ...process.env, ...dbOverrideEnv },
        });

        let stdout = '';
        let stderr = '';
        let companyId = '';
        const adminUsername = adminName;

        // Collect output
        child.stdout?.on('data', (data) => {
            const output = data.toString();
            stdout += output;
            process.stdout.write(output); // Also show in test output (with colors)
            // Log to file without ANSI codes for cleaner logs
            const cleanOutput = stripAnsiCodes(output);
            fs.appendFileSync(logger.getLogFilePath(), `[STDOUT] ${cleanOutput}`);
        });

        child.stderr?.on('data', (data) => {
            const error = data.toString();
            stderr += error;
            process.stderr.write(error); // Also show in test output (with colors)
            // Log to file without ANSI codes for cleaner logs
            const cleanError = stripAnsiCodes(error);
            fs.appendFileSync(logger.getLogFilePath(), `[STDERR] ${cleanError}`);
        });

        // Track which input we're waiting for based on stdout patterns
        let inputIndex = 0;
        let lastPromptSeen = '';

        const inputs = [
            { value: companyName, description: 'Company name', waitFor: 'Enter company name' },
            { value: 'yes', description: 'Do you want to create a user?', waitFor: 'Do you want to create a user' },
            { value: adminUsername, description: 'Enter username', waitFor: 'Enter username:' },
            { value: adminPassword, description: 'Enter password', waitFor: 'Enter password:' },
            { value: '', description: 'Enter phone number', waitFor: 'Enter phone number' },
            { value: adminName, description: 'Enter user name', waitFor: 'Enter user name' },
        ];

        const sendNextInput = (promptText: string) => {
            if (inputIndex < inputs.length && child.stdin && !child.stdin.destroyed) {
                const input = inputs[inputIndex];
                // Check if this is the right prompt
                const promptLower = promptText.toLowerCase();
                const waitForLower = input.waitFor.toLowerCase();

                if (promptLower.includes(waitForLower) && lastPromptSeen !== promptText) {
                    const inputValue = input.value + '\n';
                    const logValue = input.value || '(empty - press enter)';
                    fs.appendFileSync(logger.getLogFilePath(), `[RESPONSE ${inputIndex + 1}] ${input.description}: ${logValue}\n`);
                    child.stdin.write(inputValue);
                    lastPromptSeen = promptText;
                    inputIndex++;
                }
            }
        };

        // Monitor stdout for prompts and respond accordingly
        let stdoutBuffer = '';

        // Override stdout handler to detect prompts
        child.stdout?.removeAllListeners('data');
        child.stdout?.on('data', (data) => {
            const output = data.toString();
            stdout += output;
            stdoutBuffer += output;
            process.stdout.write(output);
            const cleanOutput = stripAnsiCodes(output);
            fs.appendFileSync(logger.getLogFilePath(), `[STDOUT] ${cleanOutput}`);

            // Check for prompts in the buffer
            const bufferLower = stdoutBuffer.toLowerCase();
            if (bufferLower.includes('enter company name') && inputIndex === 0) {
                sendNextInput(stdoutBuffer);
                stdoutBuffer = '';
            } else if (bufferLower.includes('do you want to create a user') && inputIndex === 1) {
                sendNextInput(stdoutBuffer);
                stdoutBuffer = '';
            } else if (bufferLower.includes('enter username:') && inputIndex === 2) {
                sendNextInput(stdoutBuffer);
                stdoutBuffer = '';
            } else if (bufferLower.includes('enter password:') && inputIndex === 3) {
                sendNextInput(stdoutBuffer);
                stdoutBuffer = '';
            } else if (bufferLower.includes('enter phone number') && inputIndex === 4) {
                sendNextInput(stdoutBuffer);
                stdoutBuffer = '';
            } else if (bufferLower.includes('enter user name') && inputIndex === 5) {
                sendNextInput(stdoutBuffer);
                stdoutBuffer = '';
            }
        });

        child.on('close', (code) => {
            fs.appendFileSync(logger.getLogFilePath(), `\n--- Process Completed ---\n`);
            fs.appendFileSync(logger.getLogFilePath(), `Exit Code: ${code}\n`);

            // The CLI script logs errors to stdout but exits 0, so a "success"
            // exit can hide a failed user creation. Reject loudly instead of
            // letting subsequent login tests fail with a confusing "wrong
            // password" cascade.
            const userExistsError = stdout.match(/UserName already exists\s+(\S+?)\.?\s*$/im);
            if (code === 0 && userExistsError) {
                const username = userExistsError[1];
                fs.appendFileSync(logger.getLogFilePath(), `\n--- User Creation Skipped ---\n`);
                fs.appendFileSync(logger.getLogFilePath(), `User "${username}" already exists; admin password in DB is whatever was set previously and may not match TEST_SADMIN_PASSWORD.\n`);
                const errorDetails = `Admin user "${username}" already exists in the DB. The CLI did not update the password, so subsequent logins may fail if TEST_SADMIN_PASSWORD in .env doesn't match the DB. Either reset the DB or align the env password with the existing user.`;
                logger.logStep('Create company with admin user', 'error', errorDetails);
                reject(new Error(errorDetails));
                return;
            }

            if (code === 0) {
                // Try to extract company ID from output
                const companyIdMatch = stdout.match(/Company created with ID: ([a-f0-9-]+)/i) ||
                    stdout.match(/Company already exists with ID: ([a-f0-9-]+)/i);
                if (companyIdMatch) {
                    companyId = companyIdMatch[1];
                    fs.appendFileSync(logger.getLogFilePath(), `Company ID Extracted: ${companyId}\n`);
                } else {
                    fs.appendFileSync(logger.getLogFilePath(), `Warning: Could not extract company ID from output\n`);
                }

                // Username is explicitly set to "admin-testing" in inputs
                fs.appendFileSync(logger.getLogFilePath(), `Admin Username: ${adminUsername}\n`);

                // Log final details
                fs.appendFileSync(logger.getLogFilePath(), `\n--- Final Company Details ---\n`);
                fs.appendFileSync(logger.getLogFilePath(), `Company Name: ${companyName}\n`);
                fs.appendFileSync(logger.getLogFilePath(), `Company ID: ${companyId || '(not found)'}\n`);
                fs.appendFileSync(logger.getLogFilePath(), `Admin Username: ${adminUsername}\n`);
                fs.appendFileSync(logger.getLogFilePath(), `Admin Password: ${adminPassword}\n`);
                fs.appendFileSync(logger.getLogFilePath(), `Admin Name: ${adminName}\n`);
                fs.appendFileSync(logger.getLogFilePath(), `\n--- End Company Creation ---\n\n`);

                logger.logStep(`Create company with admin user (Company: "${companyName}", ID: ${companyId || 'N/A'}, Admin: "${adminUsername}", Password: "${adminPassword}")`, 'completed');
                resolve({
                    companyId: companyId,
                    username: adminUsername,
                    password: adminPassword,
                });
            } else {
                fs.appendFileSync(logger.getLogFilePath(), `\n--- Error Details ---\n`);
                fs.appendFileSync(logger.getLogFilePath(), `Stdout (last 1000 chars):\n${stdout.slice(-1000)}\n`);
                fs.appendFileSync(logger.getLogFilePath(), `Stderr (last 1000 chars):\n${stderr.slice(-1000)}\n`);
                const errorDetails = `Process exited with code ${code}. See log file for full output.`;
                logger.logStep('Create company with admin user', 'error', errorDetails);
                reject(new Error(`Company creation failed with exit code ${code}: ${errorDetails}`));
            }
        });

        child.on('error', (error) => {
            fs.appendFileSync(logger.getLogFilePath(), `\n--- Process Error ---\n`);
            fs.appendFileSync(logger.getLogFilePath(), `Error: ${error.message}\n`);
            const errorDetails = `Failed to spawn process: ${error.message}`;
            logger.logStep('Create company with admin user', 'error', errorDetails);
            reject(error);
        });
    });
}
