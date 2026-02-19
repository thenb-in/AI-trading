import { ApiClient } from '../../helpers/apiClient';
import { TestLogger } from '../../helpers/logger';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResult {
  user: any;
  cookies: string[];
  accessToken?: string;
  refreshToken?: string;
}

/**
 * Login action - authenticates a user and returns user data and cookies
 * @param apiClient - API client instance
 * @param logger - Test logger instance
 * @param credentials - Login credentials (username, password)
 * @returns LoginResult with user data and cookies
 */
export async function login(
  apiClient: ApiClient,
  logger: TestLogger,
  credentials: LoginCredentials
): Promise<LoginResult> {
  try {
    logger.logStep(`Logging in with username: ${credentials.username}`, 'completed');

    const response = await apiClient.post('/api/v1/auth/login', {
      username: credentials.username,
      password: credentials.password,
    });

    if (response.status !== 200 && response.status !== 201) {
      const errorMessage = response.data?.error || `Login failed with status ${response.status}`;
      logger.logStep('Login failed', 'error', errorMessage);
      throw new Error(errorMessage);
    }

    // Update API client cookies
    if (response.cookies.length > 0) {
      apiClient.setCookies(response.cookies);
    }

    // Extract tokens from cookies if needed
    const cookies = response.cookies;
    let accessToken: string | undefined;
    let refreshToken: string | undefined;

    cookies.forEach((cookie) => {
      if (cookie.startsWith('accessToken=')) {
        accessToken = cookie.split('accessToken=')[1].split(';')[0];
      }
      if (cookie.startsWith('refreshToken=')) {
        refreshToken = cookie.split('refreshToken=')[1].split(';')[0];
      }
    });

    logger.logStep('Login successful', 'completed');

    return {
      user: response.data.user || response.data,
      cookies,
      accessToken,
      refreshToken,
    };
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error during login';
    logger.logStep('Login action failed', 'error', errorMessage);
    throw error;
  }
}
