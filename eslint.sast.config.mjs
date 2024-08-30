import reactRecommended from 'eslint-plugin-react/configs/recommended.js'
import globals from 'globals'
import js from '@eslint/js'
import pluginSecurity from 'eslint-plugin-security'

export default [
  js.configs.recommended,
  pluginSecurity.configs.recommended,
  reactRecommended,
  {
    rules: {
      'security/detect-object-injection': ['off'],
    },

    settings: {
      react: {
        version: '18.2.0',
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
