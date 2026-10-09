import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

/**
 * Единая конфигурация линтера (flat config).
 *
 * Правила:
 *  — JS/TS recommended: ошибки, неиспользуемый код, неявные приведения;
 *  — react-hooks: корректность хуков (порядок, зависимости, условные вызовы);
 *  — react-refresh: компоненты не должны иметь побочных экспортов (для HMR);
 *  — служебные скрипты проверяются с окружением Node.
 */
export default tseslint.config(
  {
    ignores: ['dist/**', '.tmp/**', 'node_modules/**', 'coverage/**', 'reports/**', 'public/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.es2022 },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // Правила хуков задаются явно: в eslint-plugin-react-hooks v7 в
      // `recommended` вошли экспериментальные правила React Compiler
      // (set-state-in-effect, use-memo, preserve-manual-memoization), которые
      // запрещают легитимные паттерны синхронизации состояния с URL и
      // localStorage. Их требования в этом проекте не применяются.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    // Контексты намеренно экспортируют провайдер и хук из одного файла —
    // это стандартный паттерн, fast-refresh для них не критичен
    files: ['src/context/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // Тесты и служебные скрипты выполняются в Node
    files: ['scripts/**/*.{js,mjs,ts}', 'tests/**/*.ts', 'vite.config.ts', 'eslint.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'no-console': 'off',
    },
  },
)
