import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Rutas relativas: el `dist/` resultante se puede abrir desde el disco o
  // colgar de un subdirectorio del sitio sin reconfigurar nada. Es lo que
  // permite servirlo en `/cotizador/` del hub sin tocar la configuración.
  base: './',
  server: {
    fs: {
      // El contrato con el servidor (`compartido/`) vive fuera del cotizador,
      // porque lo comparte con el Worker. Sin esto, el servidor de desarrollo
      // se niega a servir un archivo de fuera de su raíz.
      allow: ['..'],
    },
    proxy: {
      // `npm run dev` sirve la pantalla con recarga en caliente, y el
      // historial lo atiende el `wrangler dev` de al lado. En producción los
      // dos salen del mismo dominio y no hay proxy que valga.
      '/api': 'http://127.0.0.1:8787',
    },
  },
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
