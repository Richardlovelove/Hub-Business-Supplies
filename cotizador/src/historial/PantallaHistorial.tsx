/**
 * El historial de cotizaciones emitidas.
 *
 * La pantalla que pidieron las dos socias: qué se ha cotizado, a quién, por
 * cuánto y en qué quedó. Lista lo que hay en el servidor —no lo que tenga
 * este navegador—, así que las dos ven lo mismo desde donde sea.
 *
 * Tres cosas se pueden hacer con una cotización guardada: volver a sacar su
 * PDF (idéntico al que recibió el cliente, porque sale del mismo documento),
 * reabrirla para hacer una nueva versión, y marcar en qué acabó.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ESTADOS,
  NOMBRE_ESTADO,
  type Estado,
  type FiltroHistorial,
  type PaginaHistorial,
  type ResumenCotizacion,
} from '../../../compartido/historial';
import { fechaCorta, pesos, unidades as formatoUnidades } from '../dominio/formato';
import type { Cotizacion } from '../dominio/tipos';
import { almacen, FalloHistorial } from './almacen';
import { CampoSelect, CampoTexto } from '../ui/componentes';
import { descargarPdf } from '../ui/acciones';

interface Props {
  /** Lleva una cotización guardada a la pantalla del cotizador. */
  alReabrir: (cotizacion: Cotizacion) => void;
  alVolver: () => void;
}

const FILTRO_VACIO: FiltroHistorial = { pagina: 1 };

export function PantallaHistorial({ alReabrir, alVolver }: Props) {
  const [filtro, setFiltro] = useState<FiltroHistorial>(FILTRO_VACIO);
  const [pagina, setPagina] = useState<PaginaHistorial | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState('');
  const [ocupada, setOcupada] = useState('');

  const cargar = useCallback(async (cual: FiltroHistorial) => {
    setCargando(true);
    setFallo('');
    try {
      setPagina(await almacen.listar(cual));
    } catch (error) {
      setFallo(
        error instanceof FalloHistorial
          ? error.mensaje
          : 'No se pudo leer el historial. Vuelva a intentarlo.',
      );
    } finally {
      setCargando(false);
    }
  }, []);

  // El texto se consulta con retraso: escribir «Coordinadora» son doce letras,
  // y sin esto son doce consultas de las que sólo importa la última.
  useEffect(() => {
    const espera = setTimeout(() => void cargar(filtro), filtro.texto ? 300 : 0);
    return () => clearTimeout(espera);
  }, [filtro, cargar]);

  const cambiar = (cambios: Partial<FiltroHistorial>) =>
    // Cualquier cambio de filtro vuelve a la primera página: quedarse en la
    // siete de un listado que ahora tiene dos páginas muestra una tabla vacía
    // que parece un error.
    setFiltro((actual) => ({ ...actual, ...cambios, pagina: 1 }));

  const conPdf = async (resumen: ResumenCotizacion, hacer: (c: Cotizacion) => Promise<void>) => {
    setOcupada(resumen.numero);
    setFallo('');
    try {
      const guardada = await almacen.abrir(resumen.numero);
      await hacer(guardada.documento);
    } catch (error) {
      setFallo(
        error instanceof FalloHistorial
          ? error.mensaje
          : `No se pudo abrir la cotización ${resumen.numero}.`,
      );
    } finally {
      setOcupada('');
    }
  };

  const marcar = async (resumen: ResumenCotizacion, estado: Estado) => {
    setOcupada(resumen.numero);
    setFallo('');
    try {
      await almacen.marcar(resumen.numero, estado, resumen.estadoNota);
      await cargar(filtro);
    } catch (error) {
      setFallo(
        error instanceof FalloHistorial ? error.mensaje : 'No se pudo cambiar el estado.',
      );
    } finally {
      setOcupada('');
    }
  };

  const hayFiltro = useMemo(
    () => Boolean(filtro.texto || filtro.estado || filtro.desde || filtro.hasta),
    [filtro],
  );

  return (
    <div className="mx-auto w-full max-w-[90rem] space-y-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-2xl font-bold text-neutral-800">Historial de cotizaciones</h1>
          <p className="text-sm text-neutral-500">
            Todo lo emitido, por cualquiera del equipo.
          </p>
        </div>
        <button type="button" className="boton-secundario" onClick={alVolver}>
          Volver al cotizador
        </button>
      </div>

      <section className="tarjeta p-4" aria-label="Filtros">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <CampoTexto
              etiqueta="Buscar"
              placeholder="Número, empresa, NIT o contacto"
              type="search"
              value={filtro.texto ?? ''}
              onChange={(e) => cambiar({ texto: e.currentTarget.value })}
            />
          </div>
          <CampoSelect
            etiqueta="Estado"
            value={filtro.estado ?? ''}
            onChange={(e) =>
              cambiar({ estado: (e.currentTarget.value || undefined) as Estado | undefined })
            }
          >
            <option value="">Todos</option>
            {ESTADOS.map((estado) => (
              <option key={estado} value={estado}>
                {NOMBRE_ESTADO[estado]}
              </option>
            ))}
          </CampoSelect>
          <CampoTexto
            etiqueta="Desde"
            type="date"
            value={filtro.desde ?? ''}
            onChange={(e) => cambiar({ desde: e.currentTarget.value || undefined })}
          />
          <CampoTexto
            etiqueta="Hasta"
            type="date"
            value={filtro.hasta ?? ''}
            onChange={(e) => cambiar({ hasta: e.currentTarget.value || undefined })}
          />
        </div>

        {hayFiltro ? (
          <button
            type="button"
            className="mt-3 py-2 text-sm font-bold text-marca-700 underline"
            onClick={() => setFiltro(FILTRO_VACIO)}
          >
            Quitar los filtros
          </button>
        ) : null}
      </section>

      {fallo ? (
        <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {fallo}
        </p>
      ) : null}

      {pagina ? <Resumen pagina={pagina} /> : null}

      <section className="tarjeta overflow-hidden" aria-busy={cargando}>
        {cargando && !pagina ? (
          <p className="p-8 text-center text-sm text-neutral-500">Cargando el historial…</p>
        ) : pagina && pagina.cotizaciones.length === 0 ? (
          <p className="p-8 text-center text-sm text-neutral-500">
            {hayFiltro
              ? 'Ninguna cotización cumple ese filtro.'
              : 'Todavía no se ha emitido ninguna cotización.'}
          </p>
        ) : (
          <Tabla
            cotizaciones={pagina?.cotizaciones ?? []}
            ocupada={ocupada}
            alPdf={(r) => void conPdf(r, (c) => descargarPdf(c))}
            alReabrir={(r) => void conPdf(r, async (c) => alReabrir(c))}
            alMarcar={(r, estado) => void marcar(r, estado)}
          />
        )}
      </section>

      {pagina && pagina.cuantas > pagina.porPagina ? (
        <Paginacion
          pagina={pagina}
          alIr={(numero) => setFiltro((actual) => ({ ...actual, pagina: numero }))}
        />
      ) : null}
    </div>
  );
}

/** Cuántas y por cuánto: la cifra que las socias miran primero. */
function Resumen({ pagina }: { pagina: PaginaHistorial }) {
  return (
    <p className="text-sm text-neutral-600">
      <strong className="font-bold text-neutral-800">{pagina.cuantas}</strong>{' '}
      {pagina.cuantas === 1 ? 'cotización' : 'cotizaciones'} por un total de{' '}
      <strong className="font-bold text-neutral-800">{pesos(pagina.sumaTotales)}</strong>.
    </p>
  );
}

function Tabla({
  cotizaciones,
  ocupada,
  alPdf,
  alReabrir,
  alMarcar,
}: {
  cotizaciones: ResumenCotizacion[];
  ocupada: string;
  alPdf: (resumen: ResumenCotizacion) => void;
  alReabrir: (resumen: ResumenCotizacion) => void;
  alMarcar: (resumen: ResumenCotizacion, estado: Estado) => void;
}) {
  return (
    // La tabla se desborda a lo ancho en móvil antes que encogerse hasta ser
    // ilegible: el scroll horizontal es del contenedor, no de la página.
    <div className="overflow-x-auto">
      <table className="w-full min-w-[54rem] text-left text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-xs tracking-wide text-neutral-500 uppercase">
          <tr>
            <th scope="col" className="px-4 py-3 font-bold">Número</th>
            <th scope="col" className="px-4 py-3 font-bold">Cliente</th>
            <th scope="col" className="px-4 py-3 font-bold">Emitida</th>
            <th scope="col" className="px-4 py-3 text-right font-bold">Total</th>
            <th scope="col" className="px-4 py-3 font-bold">Estado</th>
            <th scope="col" className="px-4 py-3 font-bold">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {cotizaciones.map((resumen) => (
            <Fila
              key={resumen.numero}
              resumen={resumen}
              ocupada={ocupada === resumen.numero}
              alPdf={() => alPdf(resumen)}
              alReabrir={() => alReabrir(resumen)}
              alMarcar={(estado) => alMarcar(resumen, estado)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Fila({
  resumen,
  ocupada,
  alPdf,
  alReabrir,
  alMarcar,
}: {
  resumen: ResumenCotizacion;
  ocupada: boolean;
  alPdf: () => void;
  alReabrir: () => void;
  alMarcar: (estado: Estado) => void;
}) {
  return (
    <tr className={ocupada ? 'opacity-50' : undefined}>
      <td className="px-4 py-3 font-bold whitespace-nowrap text-neutral-800">
        {resumen.numero}
        <span className="block text-xs font-normal text-neutral-400">
          {formatoUnidades(resumen.unidades)} unidades
        </span>
      </td>

      <td className="max-w-[18rem] px-4 py-3">
        <span className="block truncate text-neutral-800">{resumen.cliente || '—'}</span>
        {resumen.contacto ? (
          <span className="block truncate text-xs text-neutral-500">{resumen.contacto}</span>
        ) : null}
      </td>

      <td className="px-4 py-3 whitespace-nowrap text-neutral-600">
        {fechaCorta(resumen.emitidaEn.slice(0, 10))}
        {/* Quién la emitió importa cuando hay que preguntarle algo al que la
            hizo, y con dos socias y varios asesores deja de ser obvio. */}
        <span className="block truncate text-xs text-neutral-400">
          {resumen.asesor || resumen.autor}
        </span>
      </td>

      <td className="px-4 py-3 text-right font-bold whitespace-nowrap text-neutral-800">
        {pesos(resumen.total)}
      </td>

      <td className="px-4 py-3">
        <label className="sr-only" htmlFor={`estado-${resumen.numero}`}>
          Estado de la cotización {resumen.numero}
        </label>
        <select
          id={`estado-${resumen.numero}`}
          className="campo py-1 text-xs"
          value={resumen.estado}
          disabled={ocupada}
          onChange={(e) => alMarcar(e.currentTarget.value as Estado)}
        >
          {ESTADOS.map((estado) => (
            <option key={estado} value={estado}>
              {NOMBRE_ESTADO[estado]}
            </option>
          ))}
        </select>
      </td>

      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="boton-secundario px-3 text-xs"
            onClick={alPdf}
            disabled={ocupada}
          >
            PDF
          </button>
          <button
            type="button"
            className="boton-secundario px-3 text-xs"
            onClick={alReabrir}
            disabled={ocupada}
          >
            Reabrir
          </button>
        </div>
      </td>
    </tr>
  );
}

function Paginacion({
  pagina,
  alIr,
}: {
  pagina: PaginaHistorial;
  alIr: (numero: number) => void;
}) {
  const ultima = Math.max(1, Math.ceil(pagina.cuantas / pagina.porPagina));

  return (
    <nav className="flex items-center justify-center gap-4" aria-label="Páginas del historial">
      <button
        type="button"
        className="boton-secundario"
        onClick={() => alIr(pagina.pagina - 1)}
        disabled={pagina.pagina <= 1}
      >
        Anterior
      </button>
      <span className="text-sm text-neutral-600">
        Página {pagina.pagina} de {ultima}
      </span>
      <button
        type="button"
        className="boton-secundario"
        onClick={() => alIr(pagina.pagina + 1)}
        disabled={pagina.pagina >= ultima}
      >
        Siguiente
      </button>
    </nav>
  );
}
