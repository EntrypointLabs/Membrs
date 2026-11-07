import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // A single React instance, so hooks always resolve to the same copy.
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: { port: 5173, strictPort: true },
  build: {
    target: 'es2022',
  },
});
