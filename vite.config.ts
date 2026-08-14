import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

const repositoryName = 'Quantitative_Precipitation_Estimation';
const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  base: isGitHubPages ? `/${repositoryName}/` : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '解析雨量アーカイブ',
        short_name: '解析雨量',
        description: '過去の解析雨量を時系列で閲覧するWeb GIS',
        theme_color: '#071923',
        background_color: '#071923',
        display: 'standalone',
        orientation: 'any',
        start_url: '.'
      },
      workbox: {
        navigateFallbackDenylist: [/\/local-data\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.endsWith('gsi.go.jp'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'gsi-basemap',
              expiration: { maxEntries: 160, maxAgeSeconds: 60 * 60 * 24 * 7 }
            }
          }
        ]
      }
    })
  ],
  server: {
    fs: { strict: true }
  },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    css: true,
    coverage: {
      reporter: ['text', 'html']
    }
  }
});
