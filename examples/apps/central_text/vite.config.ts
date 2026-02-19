import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // relative paths so the build works when loaded via file://
  build: {
    outDir: 'dst',
    emptyOutDir: true,
  },
});
