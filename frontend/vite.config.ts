import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // При деплое на GitHub Pages (project page) нужно указать путь репозитория
  // Задаётся через env: VITE_BASE_PATH=/content-factory/ (или оставить '/' для кастомного домена)
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    port: 5173,
    proxy: {
      // Все API-запросы через /api/ → localhost:3000/api/
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
