import { defineConfig } from 'vitest/config';
import path from 'path';

// Config de tests aparte de vite.config.ts (que arrastra tailwind y el servidor de Tauri).
export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@releases': path.resolve(__dirname, './releases'),
        },
    },
    test: {
        environment: 'jsdom',
        include: ['src/**/*.test.{ts,tsx}'],
    },
});
