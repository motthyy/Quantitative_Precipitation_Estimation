/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_PROVIDER?: string;
  readonly VITE_RAINFALL_BASE_URL?: string;
  readonly VITE_BASEMAP?: string;
  readonly VITE_ENABLE_RAILWAY?: string;
  readonly VITE_ENABLE_DISASTERS?: string;
  readonly VITE_ENABLE_EXPORT?: string;
  readonly VITE_DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

