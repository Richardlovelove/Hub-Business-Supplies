import { beforeEach, describe, expect, it } from 'vitest';

import type { Cotizacion } from '../dominio/tipos';
import { almacenLocal } from './almacenLocal';
import { FalloHistorial } from './contrato';

/**
 * Las pruebas corren en Node, donde no hay `localStorage`. Este remedo basta:
 * lo que se prueba es la lógica del almacén —numeración, filtros, qué
 * sobrevive a una reemisión—, no el almacenamiento del navegador.
 */
beforeEach(() => {
  const datos = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (clave: string) => datos.get(clave) ?? null,
      setItem: (clave: string, valor: string) => void datos.set(clave, valor),
      removeItem: (clave: string) => void datos.delete(clave),
    },
  });
});

function cotizacion(cambios: Partial<Cotizacion> = {}): Cotizacion {
  return {
    numero: '',
    fecha: '2026-08-14',
    asesor: 'Yeimy Mahecha',
    iva: 0.19,
    catalogoVersion: 'v1',
    cliente: {
      empresa: 'Coordinadora Mercantil S.A.',
      nit: '800.155.005-1',
      contacto: 'Ana Ruiz',
      telefono: '',
      email: '',
      ciudad: 'Bogotá',
    },
    lineas: [
      {
        id: 'l1',
        productoId: 'precinto-ancla-1',
        descripcion: 'PRECINTO ANCLA 1',
        cantidad: 100,
        conLogo: false,
        unitario: 1000,
        precioManual: false,
        descuento: 0,
      },
    ],
    condiciones: {
      validezDias: 15,
      tiempoEntrega: '8 días hábiles',
      formaPago: 'Anticipado',
      incluyeFlete: true,
      incluye: [],
      observaciones: '',
    },
    ...cambios,
  };
}

describe('almacenLocal', () => {
  it('numera con DEMO dentro, para que no se confunda con una de verdad', async () => {
    const primera = await almacenLocal.registrar(cotizacion());
    const segunda = await almacenLocal.registrar(cotizacion());

    expect(primera.numero).toBe('COT-DEMO-0001');
    expect(segunda.numero).toBe('COT-DEMO-0002');
  });

  it('calcula el total con IVA, no lo copia de quien lo manda', async () => {
    const { numero } = await almacenLocal.registrar(cotizacion());
    const guardada = await almacenLocal.abrir(numero);

    expect(guardada.total).toBe(119_000); // 100 × 1.000 + 19 %
    expect(guardada.unidades).toBe(100);
  });

  it('no emite una cotización sin líneas', async () => {
    await expect(almacenLocal.registrar(cotizacion({ lineas: [] }))).rejects.toBeInstanceOf(
      FalloHistorial,
    );
  });

  it('reemitir actualiza el documento sin perder el seguimiento comercial', async () => {
    // El caso real: se emite, se marca como aceptada, y después se corrige una
    // cantidad y se vuelve a mandar. Si la reemisión borrara el estado, el
    // historial dejaría de servir justo para lo que se hizo.
    const { numero } = await almacenLocal.registrar(cotizacion());
    await almacenLocal.marcar(numero, 'aceptada', 'Orden de compra 4512');

    const corregida = cotizacion({ numero });
    corregida.lineas[0]!.cantidad = 200;
    await almacenLocal.registrar(corregida);

    const guardada = await almacenLocal.abrir(numero);
    expect(guardada.estado).toBe('aceptada');
    expect(guardada.estadoNota).toBe('Orden de compra 4512');
    expect(guardada.total).toBe(238_000);
    expect(guardada.documento.lineas[0]!.cantidad).toBe(200);
  });

  it('reemitir no cambia cuándo salió por primera vez', async () => {
    const { numero, emitidaEn } = await almacenLocal.registrar(cotizacion());
    await almacenLocal.registrar(cotizacion({ numero }));

    expect((await almacenLocal.abrir(numero)).emitidaEn).toBe(emitidaEn);
  });

  it('busca por número, empresa, NIT y contacto, sin distinguir mayúsculas', async () => {
    await almacenLocal.registrar(cotizacion());
    await almacenLocal.registrar(
      cotizacion({
        cliente: {
          empresa: 'Transportes del Norte',
          nit: '900.111.222-3',
          contacto: 'Luis Gómez',
          telefono: '',
          email: '',
          ciudad: 'Medellín',
        },
      }),
    );

    expect((await almacenLocal.listar({ texto: 'coordinadora' })).cuantas).toBe(1);
    expect((await almacenLocal.listar({ texto: '900.111' })).cuantas).toBe(1);
    expect((await almacenLocal.listar({ texto: 'GÓMEZ' })).cuantas).toBe(1);
    expect((await almacenLocal.listar({ texto: 'COT-DEMO' })).cuantas).toBe(2);
    expect((await almacenLocal.listar({ texto: 'nadie' })).cuantas).toBe(0);
  });

  it('filtra por estado y suma sólo lo que cumple el filtro', async () => {
    const primera = await almacenLocal.registrar(cotizacion());
    await almacenLocal.registrar(cotizacion());
    await almacenLocal.marcar(primera.numero, 'aceptada', '');

    const aceptadas = await almacenLocal.listar({ estado: 'aceptada' });
    expect(aceptadas.cuantas).toBe(1);
    expect(aceptadas.sumaTotales).toBe(119_000);

    const todas = await almacenLocal.listar({});
    expect(todas.cuantas).toBe(2);
    expect(todas.sumaTotales).toBe(238_000);
  });

  it('deja fuera lo emitido antes de la fecha desde la que se busca', async () => {
    await almacenLocal.registrar(cotizacion());

    expect((await almacenLocal.listar({ desde: '2020-01-01' })).cuantas).toBe(1);
    expect((await almacenLocal.listar({ desde: '2100-01-01' })).cuantas).toBe(0);
    expect((await almacenLocal.listar({ hasta: '2020-01-01' })).cuantas).toBe(0);
  });

  it('lista lo último emitido primero', async () => {
    const primera = await almacenLocal.registrar(cotizacion());
    // Sin esperar, dos emisiones seguidas comparten milisegundo y el orden
    // queda a suerte del navegador.
    await new Promise((seguir) => setTimeout(seguir, 5));
    const segunda = await almacenLocal.registrar(cotizacion());

    const { cotizaciones } = await almacenLocal.listar({});
    expect(cotizaciones.map((c) => c.numero)).toEqual([segunda.numero, primera.numero]);
  });

  it('el listado no arrastra el documento entero', async () => {
    await almacenLocal.registrar(cotizacion());
    const [fila] = (await almacenLocal.listar({})).cotizaciones;

    // Cien cotizaciones con su JSON completo son varios megas para pintar
    // cinco columnas.
    expect(fila).not.toHaveProperty('documento');
  });

  it('avisa cuando se pide una cotización que no existe', async () => {
    await expect(almacenLocal.abrir('COT-DEMO-9999')).rejects.toBeInstanceOf(FalloHistorial);
    await expect(almacenLocal.marcar('COT-DEMO-9999', 'perdida', '')).rejects.toBeInstanceOf(
      FalloHistorial,
    );
  });
});
