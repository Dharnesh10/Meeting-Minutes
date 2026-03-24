// client/src/config/api.js
// Centralized API configuration for easy deployment

const API_CONFIG = {
  // Vite uses import.meta.env instead of process.env
  // Change VITE_API_URL in .env files for different environments
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000, // 30 seconds
};

export default API_CONFIG;