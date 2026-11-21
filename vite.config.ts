import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// The port is fixed because browser storage belongs to the origin (scheme, host, and port).
// Serving on another port opens the app with an empty database.
const PORT = 5173;

declare const process: { env: Record<string, string | undefined> };

// GitHub Pages serves a project site from /<repo>/; the deploy workflow sets BASE_PATH to that.
const BASE = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Envelope Budget',
        short_name: 'Budget',
        description: 'Zero-based envelope budget that stays on this phone.',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        background_color: '#101513',
        theme_color: '#1f6f5c',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: { host: true, port: PORT, strictPort: true },
  preview: { host: true, port: PORT, strictPort: true },
});
