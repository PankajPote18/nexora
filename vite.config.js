import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        // Split rarely-changing vendor code from app code so a deploy that
        // only touches app code doesn't invalidate the browser's cached
        // copy of React/Router/Swiper/icons.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('swiper')) return 'vendor-swiper';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (/[\\/]node_modules[\\/](react|react-dom|react-router-dom|react-router)[\\/]/.test(id)) return 'vendor-react';
        },
      },
    },
  },
})
