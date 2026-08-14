/**
 * El contrato entre el cotizador y el Worker.
 *
 * Vive fuera de los dos a propósito: si un día el historial deja de estar en
 * Cloudflare, este archivo es lo que la otra implementación tiene que cumplir,
 * y el cotizador no se entera del cambio.
 *
 * El documento viaja como JSON opaco. El Worker no interpreta su interior
 * salvo para calcular las columnas del listado, y por eso aquí es genérico:
 * quien lo recibe decide de qué tipo es.
 */

export type Estado = 'emitida' | 'aceptada' | 'perdida';

export const ESTADOS: readonly Estado[] = ['emitida', 'aceptada', 'perdida'];

/** Cómo se llama cada estado en pantalla. */
export const NOMBRE_ESTADO: Record<Estado, string> = {
  emitida: 'Emitida',
  aceptada: 'Aceptada',
  perdida: 'Perdida',
};

/** Quién está usando el hub, según Cloudflare Access. */
export interface Identidad {
  correo: string;
}

/**
 * Una fila del historial: lo justo para pintar la tabla.
 *
 * No trae el documento. Un listado de cien cotizaciones con el JSON completo
 * de cada una son varios megas para mostrar cinco columnas.
 */
export interface ResumenCotizacion {
  numero: string;
  fecha: string;
  emitidaEn: string;
  autor: string;
  asesor: string;
  cliente: string;
  nit: string;
  contacto: string;
  total: number;
  unidades: number;
  estado: Estado;
  estadoNota: string;
  estadoEn: string | null;
  estadoPor: string | null;
}

/** Una cotización con su documento, para reabrirla o regenerar el PDF. */
export interface CotizacionGuardada<Documento = unknown> extends ResumenCotizacion {
  documento: Documento;
}

export interface FiltroHistorial {
  /** Busca en número, empresa, NIT y contacto. */
  texto?: string;
  estado?: Estado;
  /** Fechas de emisión, inclusivas, en formato `YYYY-MM-DD`. */
  desde?: string;
  hasta?: string;
  pagina?: number;
}

export interface PaginaHistorial {
  cotizaciones: ResumenCotizacion[];
  /** Cuántas cumplen el filtro en total, no cuántas trae esta página. */
  cuantas: number;
  pagina: number;
  porPagina: number;
  /** Suma de los totales de todas las que cumplen el filtro. */
  sumaTotales: number;
}

export const POR_PAGINA = 25;

/** `COT-2026-0007`. El año sale de la fecha del documento, no del reloj. */
export function formatoNumero(anio: string, valor: number): string {
  return `COT-${anio}-${String(valor).padStart(4, '0')}`;
}

/**
 * Lo que el Worker devuelve cuando algo se rechaza.
 *
 * `codigo` es para la pantalla —decide qué botón ofrecer— y `mensaje` es para
 * la persona, ya redactado en español.
 */
export interface ErrorApi {
  codigo: 'sin-acceso' | 'numero-ocupado' | 'no-encontrada' | 'invalida' | 'fallo';
  mensaje: string;
}
