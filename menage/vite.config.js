import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base './' : le build fonctionne aussi depuis un sous-dossier (ex. GitHub Pages /menage/)
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
});
