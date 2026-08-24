/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  test: {
    css: true,
    environment: 'jsdom',
    globals: true,
    pool: 'threads',
    setupFiles: './src/test/setup.ts',
  },
})
