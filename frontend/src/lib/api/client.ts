import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { useAuthStore, useUIStore } from "@/lib/stores";
import { errorHandler, AppError } from "@/lib/error-handler";
import { retryManager } from "@/lib/retry-manager";
import { logger } from "@/lib/logging";

// API configuration
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
const REQUEST_TIMEOUT = 30000; // 30 seconds

// Request/Response interfaces
export interface APIResponse<T = any> {
  data: T;
  message?: string;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      hasNext: boolean;
    };
  };
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  requestId: string;
}

export interface APIErrorResponse {
  error: APIError;
}

class APIClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;
  private requestTimings = new Map<string, number>();

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: REQUEST_TIMEOUT,
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: true, // Include cookies for JWT
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - add auth token and logging
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token from store
        const { user } = useAuthStore.getState();
        const token = this.getStoredToken();

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request ID for tracking
        const requestId = this.generateRequestId();
        config.headers["X-Request-ID"] = requestId;

        // Set global request ID for logging
        (globalThis as any).__currentRequestId = requestId;

        // Add request start time for performance tracking
        this.requestTimings.set(requestId, Date.now());

        // Log API request
        logger.info("API request started", "api-client", {
          method: config.method?.toUpperCase(),
          url: config.url,
          requestId,
          userId: user?.id,
          hasAuth: !!token,
        });

        return config;
      },
      (error) => {
        logger.error("API request setup failed", "api-client", {
          error: error.message,
          stack: error.stack,
        });
        return Promise.reject(error);
      },
    );

    // Response interceptor - handle errors and token refresh
    this.client.interceptors.response.use(
      (response: AxiosResponse<APIResponse>) => {
        const requestId = response.config.headers["X-Request-ID"];

        // Log successful API response
        logger.info("API request completed", "api-client", {
          method: response.config.method?.toUpperCase(),
          url: response.config.url,
          status: response.status,
          requestId,
          duration: this.calculateRequestDuration(requestId as string),
        });

        // Clear global request ID
        (globalThis as any).__currentRequestId = undefined;

        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 Unauthorized - attempt token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            this.handleAuthFailure();
            return Promise.reject(refreshError);
          }
        }

        // Handle rate limiting
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers["retry-after"];
          if (retryAfter) {
            const { addToast } = useUIStore.getState();
            addToast({
              title: "Rate Limited",
              description: `Too many requests. Please wait ${retryAfter} seconds.`,
              type: "warning",
              duration: parseInt(retryAfter) * 1000,
            });
          }
        }

        // Transform error for consistent handling
        const appError = AppError.fromAxiosError(error);
        const requestId = error.config?.headers["X-Request-ID"];

        // Log API error
        logger.error("API request failed", "api-client", {
          method: error.config?.method?.toUpperCase(),
          url: error.config?.url,
          status: error.response?.status,
          requestId,
          errorCode: appError.code,
          errorMessage: appError.message,
          duration: this.calculateRequestDuration(requestId as string),
        });

        // Log security events for suspicious errors
        if (error.response?.status === 401) {
          logger.security("unauthorized_api_access", "medium", {
            url: error.config?.url,
            method: error.config?.method,
            requestId,
          });
        }
        // Clear global request ID
        (globalThis as any).__currentRequestId = undefined;

        return Promise.reject(appError);
      },
    );
  }

  private async refreshToken(): Promise<string> {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();

    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<string> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        {
          withCredentials: true,
          timeout: 10000, // Shorter timeout for refresh
        },
      );

      const { token, user } = response.data.data;

      // Update auth store
      const { setUser } = useAuthStore.getState();
      setUser(user);

      // Store new token
      this.storeToken(token);

      return token;
    } catch (error) {
      throw AppError.fromAxiosError(error);
    }
  }

  private handleAuthFailure() {
    const { logout } = useAuthStore.getState();
    const { addToast } = useUIStore.getState();

    logout();
    this.clearStoredToken();

    addToast({
      title: "Session Expired",
      description: "Please log in again to continue.",
      type: "warning",
    });
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  private calculateRequestDuration(requestId: string): number {
    const startTime = this.requestTimings.get(requestId);
    if (startTime) {
      const duration = Date.now() - startTime;
      // Clean up the timing entry
      this.requestTimings.delete(requestId);
      return duration;
    }
    return 0;
  }

  private getStoredToken(): string | null {
    // In a real app, this might come from httpOnly cookies or secure storage
    // For now, we'll assume it's handled by the backend via cookies
    return null;
  }

  private storeToken(token: string): void {
    // Token storage would be handled here
    // In our case, using httpOnly cookies managed by backend
  }

  private clearStoredToken(): void {
    // Clear token storage
  }

  // Generic request methods with retry logic
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return retryManager.executeWithRetry(`GET:${url}`, async () => {
      const response = await this.client.get<T>(url, config);
      return response.data;
    });
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return retryManager.executeWithRetry(
      `POST:${url}`,
      async () => {
        const response = await this.client.post<T>(
          url,
          data,
          config,
        );
        return response.data;
      },
      { maxAttempts: 2 }, // Fewer retries for mutations
    );
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return retryManager.executeWithRetry(
      `PUT:${url}`,
      async () => {
        const response = await this.client.put<T>(
          url,
          data,
          config,
        );
        return response.data;
      },
      { maxAttempts: 2 },
    );
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return retryManager.executeWithRetry(
      `PATCH:${url}`,
      async () => {
        const response = await this.client.patch<T>(
          url,
          data,
          config,
        );
        return response.data;
      },
      { maxAttempts: 2 },
    );
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return retryManager.executeWithRetry(
      `DELETE:${url}`,
      async () => {
        const response = await this.client.delete<T>(url, config);
        return response.data;
      },
      { maxAttempts: 2 },
    );
  }

  // File upload with progress
  async upload<T = any>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<T> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await this.client.post<T>(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress(progress);
        }
      },
    });

    return response.data;
  }

  // Batch requests
  async batch<T = any>(requests: Array<() => Promise<any>>): Promise<T[]> {
    const results = await Promise.allSettled(requests.map((req) => req()));

    const errors: AppError[] = [];
    const data: T[] = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        data[index] = result.value;
      } else {
        errors.push(AppError.fromAxiosError(result.reason));
      }
    });

    if (errors.length > 0) {
      // Handle partial failures
      const { addToast } = useUIStore.getState();
      addToast({
        title: "Partial Failure",
        description: `${errors.length} of ${requests.length} requests failed.`,
        type: "warning",
      });
    }

    return data;
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.get("/health");
  }

  // Get the underlying axios instance for advanced usage
  getClient(): AxiosInstance {
    return this.client;
  }
}

// Create singleton instance
export const apiClient = new APIClient();

// Export for testing and advanced usage
export { APIClient };

