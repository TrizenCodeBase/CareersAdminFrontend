/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_EMAIL_SERVICE_URL?: string;
  readonly VITE_EMAIL_SERVICE_API_KEY?: string;
  readonly VITE_EMAIL_FROM?: string;
  readonly VITE_EMAIL_FROM_NAME?: string;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}








