import { defineConfig } from 'vite';

export default defineConfig({
    base: '/museum/', // Base path for GitHub Pages
    build: {
        outDir: 'dist',
    },
});
