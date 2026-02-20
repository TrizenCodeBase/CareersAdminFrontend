// API URL from env. In production, VITE_API_BASE_URL must be set at build time (e.g. in CapRover env).
// In dev, fall back to localhost if unset.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? 'http://localhost:5000' : '');

// Email Service Configuration
// Default to local email service in dev; override via VITE_EMAIL_SERVICE_URL for prod/staging
const EMAIL_SERVICE_BASE_URL = import.meta.env.VITE_EMAIL_SERVICE_URL || 'http://localhost:3002';
const EMAIL_SERVICE_API_KEY = import.meta.env.VITE_EMAIL_SERVICE_API_KEY || 'trizen-support-email-2024-secure-key-xyz789';

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  ENDPOINTS: {
    HEALTH: `${API_BASE_URL}/api/health`,
    APPLICATIONS: `${API_BASE_URL}/api/v1/applications`,
    USERS: {
      LOGIN: `${API_BASE_URL}/api/v1/users/login`,
      PROFILE: `${API_BASE_URL}/api/v1/users/profile`,
    },
  },
  // Email Service Configuration
  EMAIL_SERVICE: {
    BASE_URL: EMAIL_SERVICE_BASE_URL,
    API_KEY: EMAIL_SERVICE_API_KEY,
    ENDPOINTS: {
      SEND_ACCEPTANCE: `${EMAIL_SERVICE_BASE_URL}/api/support/send-application-acceptance`,
      SEND_REJECTION: `${EMAIL_SERVICE_BASE_URL}/api/support/send-application-rejection`,
      SEND_FINAL_YEAR_PROJECT: `${EMAIL_SERVICE_BASE_URL}/api/support/send-final-year-project`,
      TEST_CONFIG: `${EMAIL_SERVICE_BASE_URL}/api/support/test-config`,
      STATUS: `${EMAIL_SERVICE_BASE_URL}/api/support/status`,
    }
  },
};

export default API_CONFIG;

