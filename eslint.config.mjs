import { fixupConfigRules, fixupPluginRules } from '@eslint/compat'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import js from '@eslint/js'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
})

export default [...fixupConfigRules(compat.extends(
  'eslint:recommended',
  'plugin:react/recommended',
  'plugin:react-hooks/recommended',
  'plugin:jsx-a11y/recommended',
  'plugin:import/recommended',
)), {
  plugins: {
    react: fixupPluginRules(react),
    'react-hooks': fixupPluginRules(reactHooks),
  },

  languageOptions: {
    globals: {
      ...globals.browser,
      Atomics: 'readonly',
      SharedArrayBuffer: 'readonly',
    },

    ecmaVersion: 13,
    sourceType: 'module',

    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },

  settings: {
    react: {
      version: '18.2.0',
    },
  },

  rules: {
    indent: ['error', 2, {
      SwitchCase: 1,
    }],

    'linebreak-style': ['warn', 'unix'],
    quotes: ['error', 'single'],
    'no-extra-semi': ['error'],
    semi: ['error', 'never'],
    'react/prop-types': ['warn'],
    'no-unused-vars': ['warn'],
    'no-unreachable': ['warn'],
    'eol-last': ['warn'],
    'jsx-a11y/no-autofocus': ['off'],
    'import/no-unresolved': ['off'],
  },
}]
