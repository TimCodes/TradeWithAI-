import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
const API_TIMEOUT = 30000; // 30 seconds

/**
 * API Error Response Structure
 */
export interface APIError {
  message: string;
  statusCode: number;
  error?: string;
  details?: any;
}

/**
 * Create and configure axios instance
 */
const createAPIClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - Add auth token
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Get token from localStorage
      const token = localStorage.getItem('auth_token');
      
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Log request in development
      if (import.meta.env.DEV) {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
          params: config.params,
          data: config.data,
        });
      }

      return config;
    },
    (error: AxiosError) => {
      console.error('[API] Request error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor - Handle errors
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      // Log response in development
      if (import.meta.env.DEV) {
        console.log(`[API] Response ${response.config.url}:`, response.data);
      }
      return response;
    },
    async (error: AxiosError<APIError>) => {
      const { response, config } = error;

      // Log error
      console.error('[API] Response error:', {
        url: config?.url,
        status: response?.status,
        message: response?.data?.message || error.message,
      });

      // Handle 401 Unauthorized - Token expired
      if (response?.status === 401) {
        // Clear auth state
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        
        // Redirect to login (optional - can be handled by auth store)
        // window.location.href = '/login';
        
        // You can implement token refresh logic here
        // const refreshToken = localStorage.getItem('refresh_token');
        // if (refreshToken) {
        //   try {
        //     const newToken = await refreshAuthToken(refreshToken);
        //     localStorage.setItem('auth_token', newToken);
        //     // Retry original request
        //     if (config) {
        //       config.headers.Authorization = `Bearer ${newToken}`;
        //       return client.request(config);
        //     }
        //   } catch (refreshError) {
        //     // Refresh failed, redirect to login
        //   }
        // }
      }

      // Handle 403 Forbidden
      if (response?.status === 403) {
        console.error('[API] Access forbidden:', response.data?.message);
      }

      // Handle 429 Too Many Requests
      if (response?.status === 429) {
        console.error('[API] Rate limit exceeded. Please try again later.');
      }

      // Handle 500+ Server Errors
      if (response && response.status >= 500) {
        console.error('[API] Server error:', response.data?.message);
      }

      // Return formatted error
      const apiError: APIError = {
        message: response?.data?.message || error.message || 'An unexpected error occurred',
        statusCode: response?.status || 0,
        error: response?.data?.error,
        details: response?.data?.details,
      };

      return Promise.reject(apiError);
    }
  );

  return client;
};

// Export singleton instance
export const apiClient = createAPIClient();

/**
 * Helper function to handle API errors in components
 */
export const handleAPIError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const apiError = error as AxiosError<APIError>;
    return apiError.response?.data?.message || apiError.message || 'An error occurred';
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
};

/**
 * Type guard for API errors
 */
export const isAPIError = (error: unknown): error is APIError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'statusCode' in error
  );
};

/**
 * Utility to build query string from params
 */
export const buildQueryString = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((item) => searchParams.append(key, String(item)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });
  
  return searchParams.toString();
};

export default apiClient;
