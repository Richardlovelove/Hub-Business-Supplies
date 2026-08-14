/**
 * Construcción y persistencia de la cotización en curso.
 *
 * No hay servidor: el borrador vive en `localStorage`, igual que el carrito
 * del sitio público. Cerrar la pestaña por accidente no debe costar una
 * cotización a medio armar.
 */

import { PLANTILLA_POR_DEFECTO } from '../datos/condiciones';
import { catalogo } from './catalogo';
import { ASESORES } from '../datos/empresa';
import { hoyIso } from './formato';
import { sugerirPrecio } from './precios';
import type { Cliente, Cotizacion, Linea, Producto } from './tipos';

const CLAVE_BORRADOR = 'bys-cotizador:borrador';
const CLAVE_CONSECUTIVO = 'bys-cotizador:consecutivo';

export const CLIENTE_VACIO: Cliente = {
  empresa: '',
  nit: '',
  contacto: '',
  telefono: '',
  email: '',
  ciudad: '',
};

/**
 * Número de cotización con formato `COT-2026-0001`.
 *
 * El consecutivo es local al navegador del asesor: sirve para que dos
 * cotizaciones del mismo día no salgan con el mismo número, no como registro
 * contable. Si un día hay varios asesores, el número tendrá que venir de un
 * sistema central.
 */
export function siguienteNumero(fecha = hoyIso()): string {
  const anio = fecha.slice(0, 4);
  const guardado = leer<{ anio: string; valor: number }>(CLAVE_CONSECUTIVO);
  const valor = guardado?.anio === anio ? guardado.valor + 1 : 1;
  escribir(CLAVE_CONSECUTIVO, { anio, valor });
  return `COT-${anio}-${String(valor).padStart(4, '0')}`;
}

/** Número que tomaría la próxima cotización, sin consumirlo. */
export function numeroPrevisto(fecha = hoyIso()): string {
  const anio = fecha.slice(0, 4);
  const guardado = leer<{ anio: string; valor: number }>(CLAVE_CONSECUTIVO);
  const valor = guardado?.anio === anio ? guardado.valor + 1 : 1;
  return `COT-${anio}-${String(valor).padStart(4, '0')}`;
}

export function cotizacionNueva(): Cotizacion {
  const fecha = hoyIso();
  return {
    numero: numeroPrevisto(fecha),
    fecha,
    asesor: ASESORES[0]!,
    iva: catalogo.iva,
    catalogoVersion: catalogo.version,
    cliente: { ...CLIENTE_VACIO },
    lineas: [],
    condiciones: {
      ...PLANTILLA_POR_DEFECTO.condiciones,
      incluye: [...PLANTILLA_POR_DEFECTO.condiciones.incluye],
    },
  };
}

/**
 * Crea la línea de un producto con la cantidad y el precio que le corresponden.
 *
 * La cantidad por defecto es el mínimo publicado, que es lo que el asesor
 * termina escribiendo casi siempre y evita arrancar con un precio "bajo
 * mínimo" que no significa nada.
 */
export function lineaDesdeProducto(
  producto: Producto,
  opciones: { cantidad?: number; conLogo?: boolean; medida?: string } = {},
): Linea {
  const conLogo = opciones.conLogo ?? (producto.admiteLogo && !producto.admiteSinLogo);
  const medida = opciones.medida ?? producto.medidas?.[0]?.nombre;
  const cantidad = opciones.cantidad ?? producto.minimo;
  const { unitario } = sugerirPrecio(producto, cantidad, { conLogo, medida });

  return {
    id: nuevoId(),
    productoId: producto.id,
    descripcion: producto.nombre,
    cantidad,
    conLogo,
    medida,
    unitario,
    precioManual: false,
    descuento: 0,
  };
}

/**
 * Aplica cambios a una línea y recalcula el precio si toca.
 *
 * El precio se vuelve a sugerir cuando cambia algo que lo determina —cantidad,
 * logo o medida— salvo que el asesor ya lo haya escrito a mano: en ese caso su
 * número manda hasta que lo suelte.
 */
export function actualizarLinea(
  linea: Linea,
  cambios: Partial<Linea>,
  producto: Producto | undefined,
): Linea {
  const siguiente: Linea = { ...linea, ...cambios };

  const cambioLaBase =
    ('cantidad' in cambios && cambios.cantidad !== linea.cantidad) ||
    ('conLogo' in cambios && cambios.conLogo !== linea.conLogo) ||
    ('medida' in cambios && cambios.medida !== linea.medida);

  const soltoElPrecio = cambios.precioManual === false;

  if (producto && (soltoElPrecio || (cambioLaBase && !siguiente.precioManual))) {
    siguiente.unitario = sugerirPrecio(producto, siguiente.cantidad, {
      conLogo: siguiente.conLogo,
      medida: siguiente.medida,
    }).unitario;
    siguiente.precioManual = false;
  }

  return siguiente;
}

export function guardarBorrador(cotizacion: Cotizacion): void {
  escribir(CLAVE_BORRADOR, cotizacion);
}

/**
 * Recupera el borrador y completa lo que falte.
 *
 * Los borradores guardados antes de que la cotización llevara su propia
 * tarifa no tienen `iva` ni `catalogoVersion`. Se rellenan con lo vigente:
 * no hay mejor dato, y dejarlos en `undefined` produciría totales `NaN`.
 */
export function recuperarBorrador(): Cotizacion | null {
  const guardado = leer<Cotizacion>(CLAVE_BORRADOR);
  if (!guardado?.lineas || !Array.isArray(guardado.lineas)) return null;

  return {
    ...guardado,
    iva: Number.isFinite(guardado.iva) ? guardado.iva : catalogo.iva,
    catalogoVersion: guardado.catalogoVersion ?? catalogo.version,
  };
}

export function descartarBorrador(): void {
  try {
    localStorage.removeItem(CLAVE_BORRADOR);
  } catch {
    /* Modo privado o almacenamiento lleno: se sigue sin persistencia. */
  }
}

export function nuevoId(): string {
  return crypto.randomUUID?.() ?? `l-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function leer<T>(clave: string): T | null {
  try {
    const crudo = localStorage.getItem(clave);
    return crudo ? (JSON.parse(crudo) as T) : null;
  } catch {
    return null;
  }
}

function escribir(clave: string, valor: unknown): void {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* Ver `descartarBorrador`: perder el borrador no debe romper la pantalla. */
  }
}
