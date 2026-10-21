import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'relatorios/',
      'node_modules/',
      'test-results/',
      'playwright-report/',
      'playwright/.cache/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Os testes usam o `test` de testes/fixtures.ts (log de execução automático).
    files: ['testes/**/*.ts'],
    ignores: ['testes/fixtures.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@playwright/test',
              importNames: ['test', 'expect'],
              allowTypeImports: true,
              message: "Importar test/expect de 'testes/fixtures' (log de execução automático).",
            },
          ],
        },
      ],
    },
  },
);
