import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // vps-tus-service is a separate CommonJS Node service deployed to the media
  // VPS, not part of this Vite/browser app — same reason `backend/` isn't a
  // realistic target for this browser-focused ESLint config either.
  globalIgnores(['dist', 'vps-tus-service']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Playwright config/tests run under Node, not the browser (they drive a
    // browser via the `page` fixture, but the test code itself is Node).
    files: ['playwright.config.js', 'e2e/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
])
