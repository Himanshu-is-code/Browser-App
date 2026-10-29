import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // Relative asset URLs let the production build load from android_asset/.
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
});
