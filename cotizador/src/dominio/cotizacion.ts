/**
 * Construcción y persistencia de la cotización en curso.
 *
 * El borrador vive en `localStorage`, igual que el carrito del sitio público:
 * cerrar la pestaña por accidente no debe costar una cotización a medio armar.
 * Lo que sí sale de aquí es el documento emitido, que se guarda en el
 * historial (`historial/almacen.ts`) para que las dos socias lo vean.
 */

import { PLANTILLA_POR_DEFECTO } from '../datos/condiciones';
import { catalogo } from './catalogo';
import { ASESORES } from '../datos/empresa';
import { hoyIso } from './formato';
import { sugerirPrecio } from './precios';
import type { Cliente, Cotizacion, Linea, Producto } from './tipos';

const CLAVE_BORRADOR = 'bys-cotizador:borrador';

export const CLIENTE_VACIO: Cliente = {
  empresa: '',
  nit: '',
  contacto: '',
  telefono: '',
  email: '',
  ciudad: '',
};

/**
 * Una cotización nueva nace **sin número**, y eso es a propósito.
 *
 * El consecutivo lo lleva ahora el servidor, no el navegador. El contador
 * local funcionaba con un solo asesor y se rompía con dos: cada navegador
 * tenía el suyo, así que dos personas cotizando el mismo día le entregaban
 * «COT-2026-0007» a dos clientes distintos, y nadie se enteraba hasta que
 * alguien cruzaba los dos PDF.
 *
 * Con el consecutivo central ya no se puede adivinar el número antes de
 * tiempo —depende de quién emita primero—, así que la pantalla dice «se
 * asigna al emitir» en vez de enseñar un número que podría cambiar. El número
 * llega al emitir, y desde ese momento acompaña al documento.
 */
export function cotizacionNueva(): Cotizacion {
  const fecha = hoyIso();
  return {
    numero: '',
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
