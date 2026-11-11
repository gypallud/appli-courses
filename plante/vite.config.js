import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' : chemins relatifs, le build fonctionne dans un sous-dossier.
// Le build va dans ../plantes/, servi par GitHub Pages : https://gypallud.github.io/appli-courses/plantes/
export default defineConfig({
  base: './',
  build: { outDir: '../plantes', emptyOutDir: true },
  plugins: [react()],
  server: { port: 5173 },
});
