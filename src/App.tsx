/**
 * Pantalla del cotizador: catálogo a la izquierda, cotización a la derecha.
 *
 * Todo ocurre en el navegador y sin servidor. El borrador se guarda solo, así
 * que cerrar la pestaña por accidente no cuesta el trabajo hecho.
 */

import { useState } from 'react';

import { catalogo } from './dominio/catalogo';
import { EMPRESA } from './datos/empresa';
import { abrirWhatsapp, copiarMensaje, descargarPdf, verPdf } from './ui/acciones';
import { PanelCatalogo } from './ui/PanelCatalogo';
import {
  DatosCliente,
  DatosOferta,
  PanelCondiciones,
  ResumenTotales,
} from './ui/PanelCotizacion';
import { TablaLineas } from './ui/TablaLineas';
import { Seccion } from './ui/componentes';
import { useCotizacion } from './ui/useCotizacion';

export default function App() {
  const { cotizacion, despachar, totales, productosEnUso } = useCotizacion();
  const [verMargen, setVerMargen] = useState(false);
  const [aviso, setAviso] = useState('');

  const vacia = cotizacion.lineas.length === 0;

  const anunciar = (mensaje: string) => {
    setAviso(mensaje);
    setTimeout(() => setAviso(''), 3000);
  };

  /**
   * Ejecuta una salida (PDF, WhatsApp, portapapeles) y da por gastado el
   * consecutivo. La vista previa no cuenta: es para revisar, no para enviar.
   */
  const emitir = async (
    accion: (c: typeof cotizacion) => Promise<void> | void,
    consumeNumero = true,
  ) => {
    try {
      await accion(cotizacion);
      if (consumeNumero) despachar({ tipo: 'confirmarNumero' });
    } catch (error) {
      console.error(error);
      anunciar('No se pudo generar el documento. Revise la consola.');
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Encabezado
        numero={cotizacion.numero}
        vacia={vacia}
        alDescargar={() => emitir((c) => descargarPdf(c))}
        alVer={() => emitir((c) => verPdf(c, true), false)}
        alWhatsapp={() => emitir(abrirWhatsapp)}
        alCopiar={() =>
          emitir(async (c) =>
            anunciar(
              (await copiarMensaje(c))
                ? 'Mensaje copiado al portapapeles.'
                : 'No se pudo copiar; seleccione el texto a mano.',
            ),
          )
        }
        alReiniciar={() => {
          if (vacia || confirm('¿Descartar la cotización actual y empezar una nueva?')) {
            despachar({ tipo: 'reiniciar' });
          }
        }}
      />

      <main className="mx-auto flex w-full max-w-[110rem] flex-1 flex-col gap-6 p-4 lg:flex-row lg:p-6">
        <aside className="tarjeta h-[calc(100vh-8rem)] overflow-hidden lg:sticky lg:top-6 lg:w-[26rem] lg:shrink-0">
          <PanelCatalogo
            productosEnUso={productosEnUso}
            alAgregar={(producto) => despachar({ tipo: 'agregar', producto })}
          />
        </aside>

        <div className="min-w-0 flex-1 space-y-6">
          <DatosCliente cotizacion={cotizacion} despachar={despachar} />
          <DatosOferta cotizacion={cotizacion} despachar={despachar} />

          <Seccion
            titulo={`Referencias cotizadas (${cotizacion.lineas.length})`}
            accion={
              <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-500">
                <input
                  type="checkbox"
                  className="size-3.5 rounded border-neutral-300 text-marca-600 focus:ring-marca-500"
                  checked={verMargen}
                  onChange={(e) => setVerMargen(e.currentTarget.checked)}
                />
                Ver margen
              </label>
            }
          >
            <TablaLineas lineas={cotizacion.lineas} despachar={despachar} verMargen={verMargen} />
          </Seccion>

          <ResumenTotales totales={totales} />
          <PanelCondiciones cotizacion={cotizacion} despachar={despachar} />
          <PieCatalogo />
        </div>
      </main>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center">
        {aviso ? (
          <p className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white shadow-lg">
            {aviso}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Encabezado({
  numero,
  vacia,
  alDescargar,
  alVer,
  alWhatsapp,
  alCopiar,
  alReiniciar,
}: {
  numero: string;
  vacia: boolean;
  alDescargar: () => void;
  alVer: () => void;
  alWhatsapp: () => void;
  alCopiar: () => void;
  alReiniciar: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[110rem] flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 lg:px-6">
        <img src="./marca/logo.png" alt={EMPRESA.nombreComercial} className="h-9 w-auto" />
        <div className="mr-auto">
          <p className="text-sm font-bold text-neutral-800">Cotizador</p>
          <p className="text-xs text-neutral-500">{numero}</p>
        </div>

        <button type="button" className="boton-secundario" onClick={alReiniciar}>
          Nueva
        </button>
        <button type="button" className="boton-secundario" onClick={alCopiar} disabled={vacia}>
          Copiar mensaje
        </button>
        <button type="button" className="boton-whatsapp" onClick={alWhatsapp} disabled={vacia}>
          WhatsApp
        </button>
        <button type="button" className="boton-secundario" onClick={alVer} disabled={vacia}>
          Vista previa
        </button>
        <button type="button" className="boton-primario" onClick={alDescargar} disabled={vacia}>
          Descargar PDF
        </button>
      </div>
    </header>
  );
}

/** Procedencia de los precios y rarezas detectadas al leer el Excel. */
function PieCatalogo() {
  const [abierto, setAbierto] = useState(false);
  const { incidencias, productos, generadoEl, origen } = catalogo;

  return (
    <section className="tarjeta p-5 text-xs text-neutral-500">
      <p>
        {productos.length} referencias tomadas de <strong>{origen}</strong>, generadas el{' '}
        {generadoEl}. Los precios se actualizan volviendo a correr{' '}
        <code className="rounded bg-neutral-100 px-1">npm run catalogo</code> sobre el Excel.
      </p>

      {incidencias.length > 0 ? (
        <>
          <button
            type="button"
            className="mt-2 font-bold text-amber-700 underline"
            onClick={() => setAbierto((v) => !v)}
          >
            {abierto ? 'Ocultar' : 'Ver'} {incidencias.length} observaciones sobre el listado
          </button>
          {abierto ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {incidencias.map((incidencia, indice) => (
                <li key={indice}>
                  <span className="font-semibold">{incidencia.tipo}</span>: {incidencia.detalle}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
