// client/src/config/axios.js
import axios from 'axios';
import API_CONFIG from './api';

// Create axios instance with base configuration
const axiosInstance = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper: Check if JWT token is expired
const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch (error) {
    console.error('[AXIOS] Token parse error:', error);
    return true;
  }
};

// Helper: Handle logout
const handleLogout = () => {
  console.log('[AXIOS] Session expired - Logging out');
  localStorage.clear();
  window.location.href = '/login';
};

// ============================================
// REQUEST INTERCEPTOR
// ============================================
// Automatically adds token to every request and checks expiry
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    // Skip auth check for login endpoint
    if (config.url?.includes('/auth')) {
      console.log('[AXIOS] Login request - skipping auth check');
      return config;
    }
    
    // No token found
    if (!token) {
      console.log('[AXIOS] No token found - redirecting to login');
      handleLogout();
      return Promise.reject(new Error('No authentication token'));
    }

    // Check if token expired
    if (isTokenExpired(token)) {
      console.log('[AXIOS] Token expired - redirecting to login');
      handleLogout();
      return Promise.reject(new Error('Token expired'));
    }

    // Add token to request headers
    config.headers.Authorization = `Bearer ${token}`;
    console.log(`[AXIOS] ✓ ${config.method.toUpperCase()} ${config.url}`);
    
    return config;
  },
  (error) => {
    console.error('[AXIOS] Request error:', error);
    return Promise.reject(error);
  }
);

// ============================================
// RESPONSE INTERCEPTOR
// ============================================
// Handles errors globally and auto-logout on 401
axiosInstance.interceptors.response.use(
  (response) => {
    // Successful response
    console.log(`[AXIOS] ✓ Response from ${response.config.url}`);
    return response;
  },
  (error) => {
    // Handle different error types
    if (error.response) {
      const { status, data } = error.response;
      const url = error.config?.url || 'unknown';

      switch (status) {
        case 401:
          console.error(`[AXIOS] 401 Unauthorized - ${url}`);
          handleLogout();
          return Promise.reject(new Error('Session expired. Please login again.'));
        
        case 403:
          console.error(`[AXIOS] 403 Forbidden - ${url}`);
          return Promise.reject(new Error(data.message || 'Access denied'));
        
        case 404:
          console.error(`[AXIOS] 404 Not Found - ${url}`);
          return Promise.reject(new Error(data.message || 'Resource not found'));
        
        case 500:
          console.error(`[AXIOS] 500 Server Error - ${url}:`, data.message);
          return Promise.reject(new Error(data.message || 'Internal server error'));
        
        default:
          console.error(`[AXIOS] ${status} Error - ${url}:`, data.message);
          return Promise.reject(new Error(data.message || `Error ${status} occurred`));
      }
    }

    // Network error (no response from server)
    if (error.request) {
      console.error('[AXIOS] Network error - No response from server');
      return Promise.reject(new Error('Unable to connect to server. Please check your internet connection.'));
    }

    // Other errors
    console.error('[AXIOS] Unknown error:', error.message);
    return Promise.reject(error);
  }
);

export default axiosInstance;