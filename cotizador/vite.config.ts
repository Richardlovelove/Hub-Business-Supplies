import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Saca del catálogo el costo de compra y el nombre del proveedor.
 *
 * Sólo para la vista previa, que se publica en GitHub Pages sin nada delante:
 * cualquiera con el enlace puede descargar el paquete y leer lo que haya
 * dentro. De los 114 productos, 109 traen el costo al que se compran y 108 el
 * proveedor que los surte — la lista de márgenes y de proveedores de la
 * empresa, entera, en un archivo.
 *
 * Ocultarlo en pantalla no serviría de nada: el dato viajaría igual dentro del
 * JavaScript. Hay que quitarlo al construir, que es lo que hace esto.
 *
 * En producción no se aplica. Allí el catálogo va completo y el margen se ve
 * en pantalla, porque detrás de Cloudflare Access sólo está el equipo.
 */
function catalogoSinCostos(): Plugin {
  return {
    name: 'catalogo-sin-costos',
    load(id) {
      if (!id.replace(/\\/g, '/').endsWith('/datos/catalogo.json')) return null;

      const catalogo = JSON.parse(readFileSync(id, 'utf8'));
      catalogo.productos = catalogo.productos.map(
        ({ costoReferencia: _costo, proveedor: _proveedor, ...producto }: Record<string, unknown>) =>
          producto,
      );

      // Se devuelve como JSON: el propio Vite lo convierte en módulo después.
      return JSON.stringify(catalogo);
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(process.env.VITE_DEMO === '1' ? [catalogoSinCostos()] : []),
  ],
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
