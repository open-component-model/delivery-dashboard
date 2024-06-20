import reactRecommended from 'eslint-plugin-react/configs/recommended.js'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import js from '@eslint/js'
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default [
  js.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  reactRecommended,
  {
    rules: {
      'prefer-const': 'error',
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
    },

    settings: {
      react: {
        version: '18.2.0',
      },
    },

    plugins: {
      'react-hooks': reactHooks,
    },

    languageOptions: {
      globals: {
        ...globals.browser,
      },

      ecmaVersion: 13,
      sourceType: 'module',

      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  }
]
