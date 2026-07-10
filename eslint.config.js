import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    rules: {
      // any 禁止（プロジェクト方針）— warn ではなく error に昇格
      '@typescript-eslint/no-explicit-any': 'error',
      // _ 始まりの未使用引数/変数は意図的な無視として許可
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_',
      }],
      // HMR(Fast Refresh)専用のDXルール。定数/ヘルパの併存は許容するため warn に下げる
      'react-refresh/only-export-components': 'warn',

      // ── React Compiler の実験的静的解析ルール群を無効化 ──
      // 本アプリは 60fps 更新のため droneSimBridge（モジュールレベルの可変シングルトン）と
      // CesiumJS の命令的 API・RAF ループを意図的に併用している（CLAUDE.md 設計判断参照）。
      // これらのルールはその設計を誤検知するため off にする。
      // 古典的な rules-of-hooks / exhaustive-deps は有効のまま残す。
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
])
