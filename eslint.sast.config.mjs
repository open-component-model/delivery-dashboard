import reactRecommended from 'eslint-plugin-react/configs/recommended.js'
import globals from 'globals'
import js from '@eslint/js'
import pluginSecurity from 'eslint-plugin-security'

export default [
  { ignores: ['build/', 'dist/'] },
  js.configs.recommended,
  pluginSecurity.configs.recommended,
  reactRecommended,
  {
    rules: {
      'security/detect-object-injection': ['off'],
      'security/detect-non-literal-regexp': ['off'],
    },

    settings: {
      react: {
        version: 'detect',
      },
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
