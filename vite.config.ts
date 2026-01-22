import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // هذا السطر هو الأهم لعمل التطبيق كـ APK
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1600,
  }
})
