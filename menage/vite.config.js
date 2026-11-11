import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base './' : chemins relatifs, le build fonctionne dans un sous-dossier.
// Le build va dans ../maison/, servi par GitHub Pages : https://gypallud.github.io/appli-courses/maison/
export default defineConfig({
  base: './',
  build: { outDir: '../maison', emptyOutDir: true },
  plugins: [react(), tailwindcss()],
});
