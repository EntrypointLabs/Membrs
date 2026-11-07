import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // A single React instance, so hooks always resolve to the same copy.
  resolve: {
    dedupe: ['react', 'react-dom'],
    // shadcn components import from @/, so the CLI can add more later.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, strictPort: true },
  build: {
    target: 'es2022',
    // React changes far less often than our code, so it gets its own chunk
    // and stays cached across deploys.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id))
            return 'react';
          return undefined;
        },
      },
    },
  },
});
