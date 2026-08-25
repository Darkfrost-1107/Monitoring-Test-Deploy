import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA: la app se instala y ABRE sin conexión (precache del shell). El acceso
    // offline a los datos —monitoreos, plantillas, cola de envío— se construye en
    // fases posteriores; esta capa sólo garantiza que la app cargue sin red.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg', 'logo-ugel.png'],
      manifest: {
        name: 'UGEL Lampa · Sistema de Monitoreo',
        short_name: 'Monitoreo',
        description: 'Monitoreo pedagógico de la UGEL Lampa, con soporte de trabajo sin conexión.',
        lang: 'es-PE',
        theme_color: '#8a1e42',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // El shell de una SPA: cualquier ruta desconocida se sirve con index.html
        // desde la caché, para que la navegación funcione sin red.
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        // Los chunks de Vite pueden superar el tope por defecto de 2 MB.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
      // El service worker no corre en `dev`: evita cachear durante el desarrollo.
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@app': path.resolve(__dirname, './src/app'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@widgets': path.resolve(__dirname, './src/widgets'),
      '@features': path.resolve(__dirname, './src/features'),
      '@entities': path.resolve(__dirname, './src/entities'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
});
