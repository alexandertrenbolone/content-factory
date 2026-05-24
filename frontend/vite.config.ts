import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiRoutes = ['/auth', '/keys', '/storage', '/social', '/sources', '/topics', '/posts', '/health'];

export default defineConfig({
  plugins: [react()],
  // При деплое на GitHub Pages (project page) нужно указать путь репозитория
  // Задаётся через env: VITE_BASE_PATH=/content-factory/ (или оставить '/' для кастомного домена)
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    port: 5173,
    proxy: Object.fromEntries(
      apiRoutes.map((route) => [
        route,
        {
          target: 'http://localhost:3000',
          changeOrigin: true,
          bypass(req: any) {
            // HTML navigation requests (browser page loads) → serve index.html
            if (req.headers.accept?.includes('text/html')) return '/index.html';
          },
        },
      ])
    ),
  },
});
