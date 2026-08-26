import { defineConfig } from 'vite';

export default defineConfig({
  // RELATIVE base (M4, doc 07 §3): itch.io serves the HTML5 build from an
  // iframe under a game-specific subpath (e.g. /<user>/moonleaf-cafe/).
  // Absolute /asset URLs break there; ./ keeps every reference inside the
  // upload directory. Runtime art/audio paths use import.meta.env.BASE_URL.
  base: './',
  // esbuild minify: doc 08 mandates a minimal dependency set (vite, typescript,
  // vitest, howler, @types/howler). Terser would add one; esbuild output is
  // within a few percent at this bundle size.
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: false,
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
