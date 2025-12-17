// Environment Configuration
export const ENV_CONFIG = {
  // API Base URL - defaults to production, can be overridden by environment variable
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',

  // Email Service Configuration
  EMAIL_SERVICE: {
    BASE_URL: import.meta.env.VITE_EMAIL_SERVICE_URL || 'http://localhost:3002',
    API_KEY: import.meta.env.VITE_EMAIL_SERVICE_API_KEY || 'trizen-support-email-2024-secure-key-xyz789',
    FROM_EMAIL: import.meta.env.VITE_EMAIL_FROM || 'support@trizenventures.com',
    FROM_NAME: import.meta.env.VITE_EMAIL_FROM_NAME || 'Trizen Ventures HR'
  },

  // Environment
  NODE_ENV: import.meta.env.MODE || 'production',

  // Is Development
  IS_DEV: import.meta.env.MODE === 'development',

  // Is Production
  IS_PROD: import.meta.env.MODE === 'production',
};

export default ENV_CONFIG;

