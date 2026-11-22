import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Analytics go to /ingest on our own origin and are forwarded to PostHog, so
 * ad blockers do not drop them. The backend does the same in production.
 */
function posthogProxy(region: string) {
  const host = region === 'eu' ? 'eu' : 'us';
  const strip = (path: string) => path.replace(/^\/ingest/, '');
  return {
    '/ingest/static': {
      target: `https://${host}-assets.i.posthog.com`,
      changeOrigin: true,
      rewrite: strip,
    },
    '/ingest': {
      target: `https://${host}.i.posthog.com`,
      changeOrigin: true,
      rewrite: strip,
    },
  };
}

export default defineConfig(({ mode }) => {
  const root = fileURLToPath(new URL('.', import.meta.url));
  const analytics = posthogProxy(
    loadEnv(mode, root).VITE_POSTHOG_REGION ?? 'us',
  );
  return {
    plugins: [react(), tailwindcss()],
    // A single React instance, so hooks always resolve to the same copy.
    resolve: {
      dedupe: ['react', 'react-dom'],
      // shadcn components import from @/, so the CLI can add more later.
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:24081',
        ...analytics,
      },
    },
    preview: { proxy: analytics },
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
  };
});
