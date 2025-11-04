const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://trizencareersbackend.llp.trizenventures.com';

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
};

export default API_CONFIG;

