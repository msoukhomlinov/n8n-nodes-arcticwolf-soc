/* eslint-env node */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json', './tsconfig.test.json'],
    sourceType: 'module',
    ecmaVersion: 2020,
  },
  plugins: ['@typescript-eslint', 'n8n-nodes-base'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:n8n-nodes-base/community',
    'prettier',
  ],
  env: {
    node: true,
    es2020: true,
  },
  rules: {
    'no-console': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  ignorePatterns: ['dist/**', 'node_modules/**'],
  overrides: [
    {
      files: ['**/*.test.ts'],
      rules: {
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/require-await': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};


