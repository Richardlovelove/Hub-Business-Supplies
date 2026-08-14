import { describe, expect, it } from 'vitest';

import {
  escalonesDe,
  margenDeLinea,
  oportunidadDeVolumen,
  sugerirPrecio,
  totalesDeCotizacion,
  totalesDeLinea,
} from './precios';
import type { Linea, Producto } from './tipos';

/** Producto con dos tandas de precios, con y sin logo, como los del listado. */
const precinto: Producto = {
  id: 'precinto-demo',
  nombre: 'PRECINTO DEMO',
  categoria: 'Precintos plásticos',
  minimo: 100,
  admiteLogo: true,
  admiteSinLogo: true,
  costoReferencia: 200,
  escalones: [
    { desde: 100, unitario: 900, logo: false },
    { desde: 500, unitario: 550, logo: false },
    { desde: 1000, unitario: 400, logo: true },
    { desde: 2000, unitario: 350, logo: true },
    { desde: 5000, unitario: 320, logo: true },
  ],
};

/** Producto sin distinción de logo: un solo juego de precios. */
const bolsa: Producto = {
  id: 'bolsa-demo',
  nombre: 'BOLSA DEMO',
  categoria: 'Bolsas y sobres de seguridad',
  minimo: 100,
  admiteLogo: false,
  admiteSinLogo: true,
  escalones: [
    { desde: 100, unitario: 990 },
    { desde: 1000, unitario: 600 },
  ],
};

function linea(parcial: Partial<Linea> = {}): Linea {
  return {
    id: 'l1',
    productoId: precinto.id,
    descripcion: precinto.nombre,
    cantidad: 1000,
    conLogo: true,
    unitario: 400,
    precioManual: false,
    descuento: 0,
    ...parcial,
  };
}

describe('escalonesDe', () => {
  it('separa la tanda con logo de la tanda sin logo', () => {
    expect(escalonesDe(precinto, { conLogo: true }).map((e) => e.desde)).toEqual([
      1000, 2000, 5000,
    ]);
    expect(escalonesDe(precinto, { conLogo: false }).map((e) => e.desde)).toEqual([100, 500]);
  });

  it('usa el único juego de precios cuando el producto no distingue logo', () => {
    expect(escalonesDe(bolsa, { conLogo: true })).toHaveLength(2);
    expect(escalonesDe(bolsa, { conLogo: false })).toHaveLength(2);
  });
});

describe('sugerirPrecio', () => {
  it('aplica el escalón alcanzado, no el siguiente', () => {
    // 1.500 unidades pagan el precio de 1.000, no el de 2.000.
    const { unitario, motivo } = sugerirPrecio(precinto, 1500, { conLogo: true });
    expect(unitario).toBe(400);
    expect(motivo).toBe('escalon');
  });

  it('respeta el escalón exacto', () => {
    expect(sugerirPrecio(precinto, 2000, { conLogo: true }).unitario).toBe(350);
  });

  it('avisa cuando la cantidad no llega al mínimo publicado', () => {
    const resultado = sugerirPrecio(precinto, 250, { conLogo: true });
    expect(resultado.motivo).toBe('bajo-minimo');
    expect(resultado.unitario).toBe(400);
  });

  it('no rompe con un producto sin escalones', () => {
    const vacio: Producto = { ...bolsa, escalones: [] };
    expect(sugerirPrecio(vacio, 100, { conLogo: false })).toMatchObject({
      unitario: 0,
      motivo: 'sin-precio',
    });
  });

  it('filtra por medida cuando el producto se vende por medidas', () => {
    const etiqueta: Producto = {
      id: 'etiqueta-demo',
      nombre: 'ETIQUETA DEMO',
      categoria: 'Etiquetas de seguridad',
      minimo: 500,
      admiteLogo: true,
      admiteSinLogo: false,
      medidas: [{ nombre: '5 X 5 CMS', cmAdicional: 30 }, { nombre: '10 X 5 CMS' }],
      escalones: [
        { desde: 500, unitario: 500, logo: true, medida: '5 X 5 CMS' },
        { desde: 500, unitario: 750, logo: true, medida: '10 X 5 CMS' },
      ],
    };
    expect(sugerirPrecio(etiqueta, 500, { conLogo: true, medida: '10 X 5 CMS' }).unitario).toBe(
      750,
    );
  });
});

describe('oportunidadDeVolumen', () => {
  it('detecta cuándo llevar más unidades cuesta menos dinero', () => {
    // 1.900 × 400 = 760.000 contra 2.000 × 350 = 700.000.
    const oportunidad = oportunidadDeVolumen(precinto, 1900, { conLogo: true });
    expect(oportunidad).not.toBeNull();
    expect(oportunidad?.cantidad).toBe(2000);
    expect(oportunidad?.ahorro).toBe(60000);
    expect(oportunidad?.unidadesExtra).toBe(100);
  });

  it('no propone nada en el último escalón', () => {
    expect(oportunidadDeVolumen(precinto, 6000, { conLogo: true })).toBeNull();
  });
});

describe('totalesDeLinea', () => {
  it('calcula subtotal, IVA y total', () => {
    expect(totalesDeLinea(linea(), 0.19)).toEqual({
      bruto: 400_000,
      descuento: 0,
      subtotal: 400_000,
      iva: 76_000,
      total: 476_000,
    });
  });

  it('aplica el descuento antes del IVA', () => {
    const t = totalesDeLinea(linea({ descuento: 10 }), 0.19);
    expect(t.descuento).toBe(40_000);
    expect(t.subtotal).toBe(360_000);
    expect(t.iva).toBe(68_400);
    expect(t.total).toBe(428_400);
  });

  it('ignora descuentos fuera de rango en lugar de producir totales absurdos', () => {
    expect(totalesDeLinea(linea({ descuento: 150 }), 0.19).subtotal).toBe(0);
    expect(totalesDeLinea(linea({ descuento: -20 }), 0.19).subtotal).toBe(400_000);
  });

  it('redondea a peso entero', () => {
    const t = totalesDeLinea(linea({ cantidad: 3, unitario: 333.33 }), 0.19);
    expect(Number.isInteger(t.bruto)).toBe(true);
    expect(Number.isInteger(t.iva)).toBe(true);
  });
});

describe('totalesDeCotizacion', () => {
  it('suma líneas y unidades', () => {
    const totales = totalesDeCotizacion(
      [linea(), linea({ id: 'l2', cantidad: 2000, unitario: 350 })],
      0.19,
    );
    expect(totales.unidades).toBe(3000);
    expect(totales.subtotal).toBe(1_100_000);
    expect(totales.total).toBe(1_309_000);
  });

  it('devuelve ceros sin líneas', () => {
    expect(totalesDeCotizacion([], 0.19).total).toBe(0);
  });

  // Reproduce la cotización del Excel: PRECINTO PLANO 42 CMS, 100 uds a $950.
  it('coincide con la hoja COTIZACION FORMAL del listado', () => {
    const totales = totalesDeCotizacion(
      [linea({ cantidad: 100, unitario: 950, conLogo: false })],
      0.19,
    );
    expect(totales.subtotal).toBe(95_000);
    expect(totales.iva).toBe(18_050);
    expect(totales.total).toBe(113_050);
  });
});

describe('margenDeLinea', () => {
  it('calcula el margen contra el costo de compra', () => {
    expect(margenDeLinea(precinto, linea())).toBeCloseTo(0.5, 5);
  });

  it('no inventa margen si no hay costo registrado', () => {
    expect(margenDeLinea(bolsa, linea())).toBeNull();
    expect(margenDeLinea(undefined, linea())).toBeNull();
  });
});
