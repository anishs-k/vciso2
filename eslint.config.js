const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  // ctw-admin/ui is a browser ESM + JSX app (checked by its Vite build); this config is for Node code.
  { ignores: ['dist/', 'node_modules/', 'coverage/', 'ctw-admin/ui/'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
