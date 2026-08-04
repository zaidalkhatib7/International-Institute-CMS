import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Where the app is served from. '/' for the site root; set VITE_BASE=/cms/ to
  // host it in a subdirectory. Passing --base on the command line is unreliable
  // from Git Bash, which rewrites a leading slash into a Windows path.
  // eslint-disable-next-line no-undef -- this file runs in Node, not the browser
  base: process.env.VITE_BASE || '/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
  server: {
    watch: {
      ignored: ['**/tmp/**'],
    },
  },
})
