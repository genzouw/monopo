import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import eslintReact from '@eslint-react/eslint-plugin';
import tseslint from 'typescript-eslint';
import vitest from '@vitest/eslint-plugin';
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
  // ゲームロジック層（src/game）は UI に依存させない。React なしで単体テスト・ミューテーションテストを行う前提を守るため
  {
    files: ['src/game/**/*.ts'],
    ignores: ['src/game/__tests__/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message: 'src/game は React に依存させない。UI 側で扱う。',
            },
            {
              name: 'react-dom',
              message: 'src/game は React に依存させない。UI 側で扱う。',
            },
          ],
          patterns: [
            {
              regex: '^react(-dom)?/',
              message: 'src/game は React に依存させない。UI 側で扱う。',
            },
            {
              regex:
                '(^|/)(components|sound|hooks)(/|$)|(^|/)(App|main)(\\.[cm]?[jt]sx?)?$',
              message:
                'src/game から UI 層を import しない。依存の向きは UI → game の一方向にする。',
            },
            {
              regex: '\\.css$',
              message: 'src/game から CSS を import しない。',
            },
          ],
        },
      ],
    },
  },
  // テストの書き方の誤り（アサーションの無いテスト、条件付きの expect、重複したタイトルなど）を検出する
  {
    files: ['src/**/*.test.{ts,tsx}'],
    ...vitest.configs.recommended,
    rules: {
      ...vitest.configs.recommended.rules,
      // fast-check の fc.assert と、expectInvariants のような expect で始まる検証ヘルパーもアサーションとして扱う
      'vitest/expect-expect': [
        'error',
        { assertFunctionNames: ['expect', 'expect*', 'fc.assert'] },
      ],
    },
  },
  eslintConfigPrettier,
]);
