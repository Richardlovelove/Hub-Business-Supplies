/**
 * El historial, visto desde la pantalla.
 *
 * Todo lo que el cotizador sabe del servidor está en este archivo. El resto de
 * la aplicación llama a `almacen.registrar(...)` y no sabe si detrás hay
 * Cloudflare, Supabase o una carpeta: cambiar de proveedor es reescribir este
 * archivo y nada más.
 *
 * La otra mitad del contrato está en `compartido/historial.ts`, fuera del
 * cotizador, que es donde se declara qué viaja por el cable.
 */

import type {
  CotizacionGuardada,
  Estado,
  FiltroHistorial,
  Identidad,
  PaginaHistorial,
  ErrorApi,
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

const BASE = '/api';

/**
 * Arma la dirección del listado a partir del filtro.
 *
 * Aparte para poder probarla: es la única parte de este archivo que decide
 * algo, y equivocarse aquí significa un historial que ignora en silencio el
 * filtro que la persona acaba de escribir.
 */
export function urlDelListado(filtro: FiltroHistorial, base = BASE): string {
  const parametros = new URLSearchParams();

  const texto = filtro.texto?.trim();
  if (texto) parametros.set('texto', texto);
  if (filtro.estado) parametros.set('estado', filtro.estado);
  if (filtro.desde) parametros.set('desde', filtro.desde);
  if (filtro.hasta) parametros.set('hasta', filtro.hasta);
  if (filtro.pagina && filtro.pagina > 1) parametros.set('pagina', String(filtro.pagina));

  const cadena = parametros.toString();
  return cadena ? `${base}/cotizaciones?${cadena}` : `${base}/cotizaciones`;
}

async function pedir<T>(url: string, opciones: RequestInit = {}): Promise<T> {
  let respuesta: Response;

  try {
    respuesta = await fetch(url, {
      ...opciones,
      headers: { 'Content-Type': 'application/json', ...opciones.headers },
    });
  } catch {
    // `fetch` sólo lanza cuando la petición no llegó a salir: sin red, DNS
    // caído, servidor inalcanzable. Un 500 no pasa por aquí.
    throw new FalloHistorial(
      'sin-conexion',
      'Sin conexión con el servidor. Revise la red y vuelva a intentarlo.',
    );
  }

  if (!respuesta.ok) {
    const problema = (await respuesta.json().catch(() => null)) as ErrorApi | null;
    throw new FalloHistorial(
      problema?.codigo ?? 'fallo',
      problema?.mensaje ?? `El servidor respondió ${respuesta.status}.`,
    );
  }

  return (await respuesta.json()) as T;
}

export const almacen: Almacen = {
  yo: () => pedir<Identidad>(`${BASE}/yo`),

  registrar: (cotizacion) =>
    cotizacion.numero
      ? pedir(`${BASE}/cotizaciones/${encodeURIComponent(cotizacion.numero)}`, {
          method: 'PUT',
          body: JSON.stringify(cotizacion),
        })
      : pedir(`${BASE}/cotizaciones`, { method: 'POST', body: JSON.stringify(cotizacion) }),

  listar: (filtro) => pedir<PaginaHistorial>(urlDelListado(filtro)),

  abrir: (numero) =>
    pedir<CotizacionGuardada<Cotizacion>>(`${BASE}/cotizaciones/${encodeURIComponent(numero)}`),

  marcar: async (numero, estado, nota) => {
    await pedir(`${BASE}/cotizaciones/${encodeURIComponent(numero)}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado, nota }),
    });
  },
};
