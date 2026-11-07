import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: 'localhost',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (_err, _req, res) => {
              if (res && !('headersSent' in res && res.headersSent)) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(
                  JSON.stringify({
                    error: 'Backend API server unavailable (http://localhost:3001). Switching to demo/offline mode.',
                    code: 'BACKEND_OFFLINE',
                  })
                );
              }
            });
          },
        },
      },
    },
    preview: {
      port: 3000,
      host: 'localhost',
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (_err, _req, res) => {
              if (res && !('headersSent' in res && res.headersSent)) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(
                  JSON.stringify({
                    error: 'Backend API server unavailable (http://localhost:3001). Switching to demo/offline mode.',
                    code: 'BACKEND_OFFLINE',
                  })
                );
              }
            });
          },
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            charts: ['recharts'],
            motion: ['motion'],
            tanstack: ['@tanstack/react-query'],
            icons: ['lucide-react'],
          },
        },
      },
    },
  };
});
