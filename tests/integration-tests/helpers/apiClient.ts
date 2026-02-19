/**
 * API Client using Supertest for HTTP requests
 * Supertest is the standard library for API testing in Node.js
 * For integration tests against a running server, we use Supertest's agent
 */
import request, { Agent } from 'supertest';

export interface ApiResponse<T = any> {
  status: number;
  data: T;
  headers: Record<string, string | string[] | undefined>;
  cookies: string[];
}

export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  cookies?: string[];
}

export class ApiClient {
  private baseUrl: string;
  private agent: Agent;
  private cookies: string[] = [];

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    
    // Create supertest agent for the base URL
    // This handles cookies automatically and works with remote servers
    this.agent = request.agent(this.baseUrl);
  }

  /**
   * Set cookies to be sent with requests
   */
  setCookies(cookies: string[]): void {
    this.cookies = cookies;
  }

  /**
   * Get current cookies
   */
  getCookies(): string[] {
    return this.cookies;
  }

  /**
   * Clear cookies
   */
  clearCookies(): void {
    this.cookies = [];
  }

  /**
   * Make an HTTP request using Supertest
   */
  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    const method = (options.method || 'GET').toUpperCase();
    const fullUrl = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    // Log request to console
    console.log(`\n📤 ${method} ${fullUrl}`);
    if (options.body) {
      const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body, null, 2);
      console.log(`   Body: ${bodyStr.substring(0, 500)}${bodyStr.length > 500 ? '...' : ''}`);
    }

    // Build supertest request using agent
    let req = this.agent;
    
    // Set headers first
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        req = req.set(key, value);
      });
    }

    // Note: Supertest agent handles cookies automatically from Set-Cookie headers
    // We don't need to manually set cookies as the agent maintains them

    // Build request based on method
    switch (method.toLowerCase()) {
      case 'get':
        req = req.get(endpoint);
        break;
      case 'post':
        req = req.post(endpoint);
        if (options.body) {
          req = req.send(options.body);
        }
        break;
      case 'put':
        req = req.put(endpoint);
        if (options.body) {
          req = req.send(options.body);
        }
        break;
      case 'delete':
        req = req.delete(endpoint);
        break;
      case 'patch':
        req = req.patch(endpoint);
        if (options.body) {
          req = req.send(options.body);
        }
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }

    // Execute request
    const response = await req;
    const duration = Date.now() - startTime;

    // Extract cookies from response
    const responseCookies: string[] = [];
    const setCookieHeaders = response.headers['set-cookie'];
    if (setCookieHeaders) {
      if (Array.isArray(setCookieHeaders)) {
        responseCookies.push(...setCookieHeaders);
      } else {
        responseCookies.push(setCookieHeaders);
      }
    }

    // Update stored cookies (agent also maintains cookies automatically)
    if (responseCookies.length > 0) {
      this.cookies = responseCookies;
    }

    // Log response to console
    const statusEmoji = response.status >= 200 && response.status < 300 ? '✅' : response.status >= 400 ? '❌' : '⚠️';
    console.log(`📥 ${statusEmoji} ${response.status} ${fullUrl} (${duration}ms)`);
    if (response.body) {
      const dataStr = typeof response.body === 'string' ? response.body : JSON.stringify(response.body, null, 2);
      console.log(`   Response: ${dataStr.substring(0, 500)}${dataStr.length > 500 ? '...' : ''}`);
    }

    return {
      status: response.status,
      data: response.body || {},
      headers: response.headers,
      cookies: responseCookies,
    };
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}
