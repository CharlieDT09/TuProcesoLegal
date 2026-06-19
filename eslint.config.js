// Configuración de ESLint (flat config, ESLint 9+).
// Reglas intencionalmente moderadas para no bloquear al equipo de entrada;
// se pueden endurecer con el tiempo.

const js = require('@eslint/js');

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  fetch: 'readonly',
  console: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  alert: 'readonly',
  FormData: 'readonly',
  URL: 'readonly',
  Blob: 'readonly',
  supabase: 'readonly',
  marked: 'readonly',
  DOMPurify: 'readonly',
};

const nodeGlobals = {
  process: 'readonly',
  module: 'writable',
  require: 'readonly',
  __dirname: 'readonly',
  console: 'readonly',
  fetch: 'readonly',
  setTimeout: 'readonly',
  Buffer: 'readonly',
};

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'database/node_modules/**',
      '.vercel/**',
      '.netlify/**',
      '.claude/**',
      '**/*.min.js',
    ],
  },
  js.configs.recommended,
  {
    // Frontend (navegador)
    files: ['app.js', 'quiz.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: browserGlobals,
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'warn',
    },
  },
  {
    // Backend (Vercel functions / Node)
    files: ['api/**/*.js', 'lib/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: nodeGlobals,
    },
    rules: {
      'no-unused-vars': 'warn',
    },
  },
];
