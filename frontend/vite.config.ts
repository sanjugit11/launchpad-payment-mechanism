import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  envDir: '../',
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/home/sanjeev/2026/Launchpad/frontend/src',
    },
  },
})
