import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import eslintReact from '@eslint-react/eslint-plugin';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores([
    'dist',
    'coverage',
    'playwright-report',
    'test-results',
    'reports',
    '.stryker-tmp',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      eslintReact.configs['recommended-type-checked'],
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // 盤面の金額は「$1,500」のように JSX テキストへ $ を直接書いて表示しており、テンプレートリテラルの書き損じではないため無効にする
      '@eslint-react/jsx-no-leaked-dollar': 'off',
      // eslint-plugin-react-hooks（React 公式）と同じ内容を検査するルールは、二重報告を避けるため ESLint React 側を無効にする
      '@eslint-react/error-boundaries': 'off',
      '@eslint-react/exhaustive-deps': 'off',
      '@eslint-react/purity': 'off',
      '@eslint-react/rules-of-hooks': 'off',
      '@eslint-react/set-state-in-effect': 'off',
      '@eslint-react/set-state-in-render': 'off',
      '@eslint-react/static-components': 'off',
      '@eslint-react/unsupported-syntax': 'off',
      '@eslint-react/use-memo': 'off',
    },
  },
  // tsconfig の projectService が拾えないファイル（Bun 用スクリプト・Playwright 設定）は型情報つきルールの対象外にする
  {
    files: ['scripts/**/*.ts', 'playwright.config.ts'],
    extends: [
      tseslint.configs.disableTypeChecked,
      eslintReact.configs['disable-type-checked'],
    ],
  },
  eslintConfigPrettier,
]);
