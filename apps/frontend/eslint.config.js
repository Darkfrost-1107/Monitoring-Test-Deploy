import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores([
    'dist',
    // Informe HTML que genera `vitest run --coverage`: artefacto, no código fuente.
    'coverage',
    'refactor_aliases.ts',
    'refactor_aliases.cjs',
    'update_useauth.cjs',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'no-restricted-imports': [
        'warn',
        {
          paths: [
            {
              name: '@entities/model-instituciones/ui',
              message: 'UI components moved to @features/institutions/ui',
            },
          ],
          patterns: [
            {
              group: ['**/entities/**/ui*'],
              message: 'entities/ no debe contener componentes UI. Los componentes UI deben ir en features/ o widgets/.',
            },
          ],
        },
      ],
    },
  },
]);
