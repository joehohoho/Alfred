import { defineConfig } from 'vite';

// Wispmere build config.
// `base: './'` keeps asset URLs relative so the same bundle works from a dev
// server, from `vite preview`, and from Capacitor's `capacitor://` iOS origin.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Split three.js into its own chunk so the game code can be rebuilt and
        // re-downloaded without invalidating the largest dependency.
        manualChunks(id: string) {
          if (id.includes('node_modules/three')) return 'three';
          return undefined;
        },
      },
    },
  },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});
