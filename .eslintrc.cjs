/**
 * Konfigurasi ESLint (flat config baru ditunda — eslint 8 legacy lebih stabil untuk monorepo ini).
 * Aturan menegakkan sebagian standar docs/21: larang `any`, larang impor melintasi batas modul.
 */
/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  env: {
    node: true,
    es2022: true,
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '**/dist/**',
    'docs/',
    'examples/',
    'schemas/',
    '*.config.js',
    '.eslintrc.cjs',
  ],
  rules: {
    // docs/21: hindari `any`, pakai `unknown` lalu narrow.
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    // docs/21: jangan menelan error.
    'no-empty': ['error', { allowEmptyCatch: false }],
  },
  overrides: [
    {
      // docs/21 Batas Modul: packages/* TIDAK boleh meng-impor apps/*.
      files: ['packages/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@docgen/api', '@docgen/worker', '**/apps/**'],
                message:
                  'packages/* tidak boleh meng-impor apps/* (batas modul, docs/21).',
              },
            ],
          },
        ],
      },
    },
  ],
};
