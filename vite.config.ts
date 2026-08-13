import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Rutas relativas: el `dist/` resultante se puede abrir desde el disco o
  // colgar de un subdirectorio del sitio sin reconfigurar nada.
  base: './',
  build: {
    rollupOptions: {
      output: {
        // jsPDF pesa más que toda la aplicación: en su propio paquete, la
        // pantalla se dibuja sin tener que analizarlo ni ejecutarlo.
        manualChunks: (id) => (/node_modules\/jspdf/.test(id) ? 'pdf' : undefined),
      },
    },
  },
});
