import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      "Content-Security-Policy": "default-src 'self' *; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: *; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' *; connect-src 'self' *; img-src 'self' * data: blob:; font-src 'self' *;"
    }
  }
})
