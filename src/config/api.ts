const DEFAULT_PROD_API_BASE_URL = 'https://trizen-careers-backend.llp.trizenventures.com';
const DEFAULT_PROD_EMAIL_SERVICE_URL = 'https://trizen-support-email-service.llp.trizenventures.com';

// API URL from env. In production, prefer VITE_API_BASE_URL at build time (CapRover build arg).
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000' : DEFAULT_PROD_API_BASE_URL);

// Email Service Configuration
const EMAIL_SERVICE_BASE_URL =
  import.meta.env.VITE_EMAIL_SERVICE_URL ||
  (import.meta.env.DEV ? 'http://localhost:3002' : DEFAULT_PROD_EMAIL_SERVICE_URL);
const EMAIL_SERVICE_API_KEY = import.meta.env.VITE_EMAIL_SERVICE_API_KEY || 'trizen-support-email-2024-secure-key-xyz789';

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  ENDPOINTS: {
    HEALTH: `${API_BASE_URL}/api/health`,
    APPLICATIONS: `${API_BASE_URL}/api/v1/applications`,
    APPLICATIONS_LOOKUP_EMAILS: `${API_BASE_URL}/api/v1/applications/lookup-emails`,
    RESUME_PROXY: `${API_BASE_URL}/api/v1/applications/resume`,
    applicationStatus: (id: string) => `${API_BASE_URL}/api/v1/applications/${id}/status`,
    applicationAdminNotes: (id: string) => `${API_BASE_URL}/api/v1/applications/${id}/admin-notes`,
    applicationById: (id: string) => `${API_BASE_URL}/api/v1/applications/${id}`,
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

