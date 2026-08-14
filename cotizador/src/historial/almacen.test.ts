import { describe, expect, it } from 'vitest';

import { formatoNumero } from '../../../compartido/historial';
import { urlDelListado } from './almacen';

describe('urlDelListado', () => {
  it('sin filtro pide el listado a secas', () => {
    expect(urlDelListado({})).toBe('/api/cotizaciones');
  });

  it('no manda la página cuando es la primera', () => {
    // Es la de por defecto en el servidor: mandarla sólo ensucia la dirección
    // y hace que dos consultas iguales parezcan distintas.
    expect(urlDelListado({ pagina: 1 })).toBe('/api/cotizaciones');
    expect(urlDelListado({ pagina: 3 })).toBe('/api/cotizaciones?pagina=3');
  });

  it('ignora el texto en blanco', () => {
    // El campo de búsqueda vacío no es un filtro: sin esto, borrar lo escrito
    // dejaría `texto=` y el listado seguiría creyendo que hay filtro puesto.
    expect(urlDelListado({ texto: '   ' })).toBe('/api/cotizaciones');
  });

  it('recorta los espacios sueltos del texto', () => {
    expect(urlDelListado({ texto: '  Coordinadora ' })).toBe(
      '/api/cotizaciones?texto=Coordinadora',
    );
  });

  it('escapa lo que escriba la persona', () => {
    // Un NIT con guion, un «&» en el nombre de la empresa o un acento no
    // pueden romper la consulta.
    expect(urlDelListado({ texto: 'B&S Logistics' })).toBe(
      '/api/cotizaciones?texto=B%26S+Logistics',
    );
  });

  it('junta todos los filtros', () => {
    expect(
      urlDelListado({
        texto: 'ANCLA',
        estado: 'aceptada',
        desde: '2026-01-01',
        hasta: '2026-06-30',
        pagina: 2,
      }),
    ).toBe(
      '/api/cotizaciones?texto=ANCLA&estado=aceptada&desde=2026-01-01&hasta=2026-06-30&pagina=2',
    );
  });
});

describe('formatoNumero', () => {
  it('rellena hasta cuatro cifras', () => {
    expect(formatoNumero('2026', 1)).toBe('COT-2026-0001');
    expect(formatoNumero('2026', 47)).toBe('COT-2026-0047');
    expect(formatoNumero('2026', 1234)).toBe('COT-2026-1234');
  });

  it('no recorta cuando se pasa de cuatro cifras', () => {
    // Con el ritmo actual no llega, pero truncar produciría dos cotizaciones
    // con el mismo número, que es justo lo que el consecutivo central existe
    // para impedir.
    expect(formatoNumero('2026', 12345)).toBe('COT-2026-12345');
  });
});
