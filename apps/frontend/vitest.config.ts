import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
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
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],

    // ── Cobertura ──────────────────────────────────────────────────────────
    // Fase 0 del plan de remediación: se mide sin umbral bloqueante. Los
    // umbrales se activan al cierre de la Fase 3, cuando exista cobertura que
    // defender; imponerlos antes sólo produciría una barrera roja permanente.
    coverage: {
      provider: 'v8',

      // Umbral fijado al cierre de la Fase 3, en el nivel alcanzado. Impide el
      // retroceso, no persigue el objetivo: el 45 % exige que la Fase 5 parta
      // antes los cuatro componentes de más de 900 líneas, donde vive el grueso
      // del código sin cubrir.
      thresholds: {
        statements: 3.9,
        branches: 3.5,
        functions: 2.9,
        lines: 3.9,
      },
      reporter: ['text-summary', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/test/**',
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        // Datos simulados dentro del árbol de producción; se retiran en Fase 7.
        'src/**/mocks.ts',
      ],
    },
  },
});
