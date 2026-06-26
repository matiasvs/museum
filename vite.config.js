import { defineConfig } from 'vite';

export default defineConfig({
    base: '/museum/', // Base path for GitHub Pages
    optimizeDeps: {
        esbuildOptions: { target: 'esnext' }
    },
    build: {
        outDir: 'dist',
        target: 'esnext'
    },
});
