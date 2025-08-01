// Note: AsyncStorage import kept for potential future use
// import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  API_CONFIG,
  API_ENDPOINTS,
  API_ERROR_CODES,
  SUCCESS_CODES,
  LOG_API_REQUESTS,
  LOG_API_RESPONSES,
  LOG_API_ERRORS,
} from "../config/api";
import { secureStorage, SECURE_KEYS, STORAGE_KEYS } from "./secureStorage";
import logger from "../utils/logger";

// Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status?: number | undefined;
}

export interface ApiError {
  message: string;
  status?: number | undefined;
  code?: string | undefined;
  details?: unknown;
}

// Storage keys (deprecated, kept for reference)
// const DEPRECATED_STORAGE_KEYS = {
//   ACCESS_TOKEN: "access_token",
//   REFRESH_TOKEN: "@cookcam_refresh_token",
//   USER_DATA: "user_data",
// };

class ApiService {
  private static instance: ApiService;
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  private constructor() {
    this.baseURL = API_CONFIG.baseURL;
    this.defaultHeaders = API_CONFIG.headers;
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  // Get stored authentication token
  private async getAuthToken(): Promise<string | null> {
    try {
      return await secureStorage.getSecureItem(SECURE_KEYS.ACCESS_TOKEN);
    } catch (error) {
      logger.error("Error getting auth token:", error);
      return null;
    }
  }

  // Set authentication token
  async setAuthToken(token: string, refreshToken?: string): Promise<void> {
    try {
      await secureStorage.setAuthTokens(token, refreshToken);
    } catch (error) {
      logger.error("Error setting auth token:", error);
    }
  }

  // Remove authentication token
  async removeAuthToken(): Promise<void> {
    try {
      await secureStorage.clearAllSecureData();
      await secureStorage.removeItem(STORAGE_KEYS.USER_PREFERENCES); // Example of removing non-sensitive data
    } catch (error) {
      logger.error("Error removing auth token:", error);
    }
  }

  // Build headers with authentication
  private async buildHeaders(
    customHeaders?: Record<string, string>,
  ): Promise<Record<string, string>> {
    const headers = { ...this.defaultHeaders, ...customHeaders };

    const token = await this.getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  // Log API requests (development only)
  private logRequest(method: string, url: string, data?: any) {
    if (LOG_API_REQUESTS) {
      logger.debug(
        `🔄 API ${method.toUpperCase()} ${url}`,
        data ? { data } : "",
      );
    }
  }

  // Log API responses (development only)
  private logResponse(method: string, url: string, response: any) {
    if (LOG_API_RESPONSES) {
      logger.debug(`✅ API ${method.toUpperCase()} ${url} Response:`, response);
    }
  }

  // Log API errors
  private logError(method: string, url: string, error: any) {
    if (LOG_API_ERRORS) {
      logger.error(`❌ API ${method.toUpperCase()} ${url} Error:`, error);
    }
  }

  // Handle API errors
  private handleApiError(error: any, url: string): ApiError {
    let apiError: ApiError;

    if (error.response) {
      // Server responded with error status
      apiError = {
        message:
          error.response.data?.message ||
          error.response.data?.error ||
          "Server error",
        status: error.response.status,
        code: error.response.data?.code,
        details: error.response.data,
      };
    } else if (error.request) {
      // Network error
      apiError = {
        message: "Network error. Please check your connection.",
        code: API_ERROR_CODES.NETWORK_ERROR,
      };
    } else {
      // Other error
      apiError = {
        message: error.message || "An unexpected error occurred",
        code: "UNKNOWN_ERROR",
      };
    }

    this.logError("ERROR", url, apiError);
    return apiError;
  }

  // Retry logic for failed requests
  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    retries: number = API_CONFIG.retryAttempts,
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      if (retries > 0 && this.shouldRetry(error)) {
        await this.delay(API_CONFIG.retryDelay);
        return this.retryRequest(requestFn, retries - 1);
      }
      throw error;
    }
  }

  // Check if request should be retried
  private shouldRetry(error: any): boolean {
    // Retry on network errors or 5xx server errors
    if (!error.response) {
      return true;
    } // Network error
    const status = error.response.status;
    return status >= 500 && status < 600;
  }

  // Delay helper for retry logic
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Generic request method
  private async request<T = unknown>(
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    endpoint: string,
    data?: unknown,
    customHeaders?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    try {
      this.logRequest(method, url, data);

      const headers = await this.buildHeaders(customHeaders);

      const response = await this.retryRequest(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          API_CONFIG.timeout,
        );

        try {
          const fetchResponse = await fetch(url, {
            method,
            headers,
            body: data ? JSON.stringify(data) : undefined,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          return fetchResponse;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      });

      const responseData = await response.json();

      this.logResponse(method, url, responseData);

      if (SUCCESS_CODES.includes(response.status)) {
        return {
          success: true,
          data: responseData,
          status: response.status,
        };
      } else {
        return {
          success: false,
          error: responseData.message || responseData.error || "Request failed",
          status: response.status,
        };
      }
    } catch (error: any) {
      const apiError = this.handleApiError(error, url);

      // Handle unauthorized errors by clearing tokens
      if (apiError.status === API_ERROR_CODES.UNAUTHORIZED) {
        await this.removeAuthToken();
      }

      return {
        success: false,
        error: apiError.message,
        status: apiError.status,
      };
    }
  }

  // GET request
  async get<T = any>(
    endpoint: string,
    headers?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>("GET", endpoint, undefined, headers);
  }

  // POST request
  async post<T = any>(
    endpoint: string,
    data?: any,
    headers?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>("POST", endpoint, data, headers);
  }

  // PUT request
  async put<T = any>(
    endpoint: string,
    data?: any,
    headers?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>("PUT", endpoint, data, headers);
  }

  // DELETE request
  async delete<T = any>(
    endpoint: string,
    headers?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>("DELETE", endpoint, undefined, headers);
  }

  // PATCH request
  async patch<T = any>(
    endpoint: string,
    data?: any,
    headers?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>("PATCH", endpoint, data, headers);
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get(API_ENDPOINTS.health);
      return response.success;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const apiService = ApiService.getInstance();
export default ApiService;
