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

    // El sistema opera en Perú (UTC-5). Sin fijarlo, las pruebas de fecha
    // pasarían en cualquier huso y no guardarían nada: el corrimiento de un día
    // al interpretar una fecha sin hora sólo aparece al oeste de Greenwich.
    // Fase 6 de PLAN_REMEDIACION.md, H-17.
    env: { TZ: 'America/Lima' },
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],

    // ── Cobertura ──────────────────────────────────────────────────────────
    // Fase 0 del plan de remediación: se mide sin umbral bloqueante. Los
    // umbrales se activan al cierre de la Fase 3, cuando exista cobertura que
    // defender; imponerlos antes sólo produciría una barrera roja permanente.
    coverage: {
      provider: 'v8',

      // Umbral en el nivel alcanzado, para impedir el retroceso. No persigue el
      // objetivo del 45 %.
      //
      // Subió de 3,9 % al incorporar las primeras pruebas de componente: montar
      // un formulario ejercita su árbol entero, de modo que veintiocho pruebas
      // sobre `ModalCronograma` cubren mucho más que su propio archivo. Las
      // pruebas de `lib/` que había hasta ahora cubren reglas, no pantallas.
      thresholds: {
        statements: 21.3,
        branches: 23.5,
        functions: 17.9,
        lines: 20.4,
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
      ],
    },
  },
});
