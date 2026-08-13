import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { construirPdf, nombreArchivo } from './cotizacionPdf';
import type { Cotizacion, Linea } from '../dominio/tipos';

/**
 * Con `MUESTRA_PDF=1 npm test` los PDF de prueba quedan en `muestras/` para
 * poder abrirlos y revisar el diseño a ojo, que es lo único que detecta un
 * bloque descuadrado.
 */
const GUARDAR = process.env.MUESTRA_PDF === '1';
const CARPETA = 'muestras';

function linea(parcial: Partial<Linea>): Linea {
  return {
    id: crypto.randomUUID(),
    productoId: 'demo',
    descripcion: 'PRECINTO DEMO',
    cantidad: 1000,
    conLogo: true,
    unitario: 400,
    precioManual: false,
    descuento: 0,
    ...parcial,
  };
}

function cotizacion(lineas: Linea[], observaciones = ''): Cotizacion {
  return {
    numero: 'COT-2026-0042',
    fecha: '2026-08-13',
    asesor: 'Yeimy Mahecha',
    cliente: {
      empresa: 'TRANSPORTES Y LOGÍSTICA DEL CARIBE S.A.S.',
      nit: '901.234.567-8',
      contacto: 'Sandra Rojas',
      telefono: '300 790 5606',
      email: 'compras@translogcaribe.com.co',
      ciudad: 'Barranquilla',
    },
    lineas,
    condiciones: {
      validezDias: 8,
      tiempoEntrega: '5 a 8 días hábiles',
      formaPago: 'Anticipado',
      incluyeFlete: true,
      incluye: [
        'Incluye personalización con logo',
        'Numeración consecutiva',
        'Color a elección',
        'Envío a ciudades principales',
      ],
      observaciones,
    },
  };
}

function guardar(nombre: string, doc: ReturnType<typeof construirPdf>): void {
  if (!GUARDAR) return;
  mkdirSync(CARPETA, { recursive: true });
  writeFileSync(`${CARPETA}/${nombre}`, Buffer.from(doc.output('arraybuffer')));
}

describe('construirPdf', () => {
  it('genera una sola página para una cotización corta', () => {
    const doc = construirPdf(
      cotizacion([
        linea({ descripcion: 'PRECINTO DOBLE DENTADO 38 CMS', cantidad: 2000, unitario: 360 }),
        linea({ descripcion: 'PRECINTO PLANO 42 CMS', cantidad: 1000, unitario: 520 }),
        linea({
          descripcion: 'CLISÉ PARA MARCACIÓN DE LOGO',
          cantidad: 1,
          unitario: 55000,
          conLogo: false,
        }),
      ]),
      { iva: 0.19 },
    );
    expect(doc.getNumberOfPages()).toBe(1);
    guardar('cotizacion-corta.pdf', doc);
  });

  it('reparte en varias páginas una cotización larga sin perder cabecera ni pie', () => {
    const lineas = Array.from({ length: 40 }, (_, i) =>
      linea({
        descripcion: `PRECINTO GUAYA REF. 0${(i % 2) + 1} - ${40 + i * 10} CMS`,
        cantidad: 1000 * ((i % 5) + 1),
        unitario: 1950 + i * 25,
        medida: i % 3 === 0 ? '20 X 5 CMS' : undefined,
      }),
    );
    const doc = construirPdf(cotizacion(lineas, 'Precios sujetos a confirmación de existencias.'), {
      iva: 0.19,
    });
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    guardar('cotizacion-larga.pdf', doc);
  });

  it('muestra la columna de descuento sólo cuando hay descuento', () => {
    const doc = construirPdf(
      cotizacion([
        linea({ descripcion: 'PRECINTO GUAYA REF. 02 - 40 CMS', cantidad: 5000, descuento: 10 }),
        linea({ descripcion: 'TULA DE SEGURIDAD 30 X 40 CMS AZUL', cantidad: 20, unitario: 38000 }),
      ]),
      { iva: 0.19, borrador: true },
    );
    expect(doc.getNumberOfPages()).toBe(1);
    guardar('cotizacion-descuento-borrador.pdf', doc);
  });

  it('no falla con una cotización vacía', () => {
    expect(() => construirPdf(cotizacion([]), { iva: 0.19 })).not.toThrow();
  });
});

describe('nombreArchivo', () => {
  it('usa el número y el cliente, sin tildes ni signos', () => {
    expect(nombreArchivo(cotizacion([]))).toBe(
      'COT-2026-0042-TRANSPORTES-Y-LOGISTICA-DEL-CARIBE-S-A-S.pdf',
    );
  });

  it('funciona sin nombre de cliente', () => {
    const sinCliente = cotizacion([]);
    sinCliente.cliente.empresa = '';
    expect(nombreArchivo(sinCliente)).toBe('COT-2026-0042-cliente.pdf');
  });
});
