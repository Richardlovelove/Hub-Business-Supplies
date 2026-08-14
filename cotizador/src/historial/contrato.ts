/**
 * Qué le pide el cotizador al historial, sin decir quién lo cumple.
 *
 * Está separado de las implementaciones para que las dos —la de verdad, contra
 * el servidor, y la de la vista previa, contra el navegador— puedan depender de
 * esto sin depender la una de la otra.
 */

import type {
  CotizacionGuardada,
  ErrorApi,
  Estado,
  FiltroHistorial,
  Identidad,
  PaginaHistorial,
} from '../../../compartido/historial';
import type { Cotizacion } from '../dominio/tipos';

export interface Almacen {
  /** Quién está usando el hub. */
  yo(): Promise<Identidad>;
  /**
   * Guarda una cotización emitida y devuelve su número.
   *
   * Sin número asignado, lo pide al consecutivo central. Con número, actualiza
   * la que ya existe: bajar el PDF y luego mandar el WhatsApp es una sola
   * cotización, no dos.
   */
  registrar(cotizacion: Cotizacion): Promise<{ numero: string; emitidaEn: string }>;
  listar(filtro: FiltroHistorial): Promise<PaginaHistorial>;
  abrir(numero: string): Promise<CotizacionGuardada<Cotizacion>>;
  marcar(numero: string, estado: Estado, nota: string): Promise<void>;
}

export type CodigoFallo = ErrorApi['codigo'] | 'sin-conexion';

/**
 * Un fallo ya traducido a algo que se le puede enseñar a una persona.
 *
 * `mensaje` va en español y se pinta tal cual; `message` lo hereda de `Error`
 * con el mismo texto, para que la consola y las trazas no salgan vacías.
 */
export class FalloHistorial extends Error {
  constructor(
    readonly codigo: CodigoFallo,
    readonly mensaje: string,
  ) {
    super(mensaje);
  }
}
