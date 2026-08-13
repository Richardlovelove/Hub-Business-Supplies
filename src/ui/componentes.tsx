/** Piezas de formulario reutilizadas por los paneles. */

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

interface CampoTextoProps extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string;
  /** Aviso bajo el campo; en ámbar, no bloquea nada. */
  nota?: string;
}

export function CampoTexto({ etiqueta, nota, className = '', ...resto }: CampoTextoProps) {
  return (
    <label className="block">
      <span className="etiqueta">{etiqueta}</span>
      <input className={`campo ${className}`} {...resto} />
      {nota ? <span className="mt-1 block text-xs text-amber-700">{nota}</span> : null}
    </label>
  );
}

interface CampoSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  etiqueta: string;
  children: ReactNode;
}

export function CampoSelect({ etiqueta, children, className = '', ...resto }: CampoSelectProps) {
  return (
    <label className="block">
      <span className="etiqueta">{etiqueta}</span>
      <select className={`campo ${className}`} {...resto}>
        {children}
      </select>
    </label>
  );
}

/**
 * Campo numérico que no pelea con quien escribe.
 *
 * Un `<input type="number">` atado directamente al estado no deja borrar el
 * contenido para teclear otra cifra: al quedar vacío devuelve `NaN` y el valor
 * anterior vuelve de golpe. Aquí el vacío se trata como cero y sólo se
 * propagan números válidos.
 */
interface CampoNumeroProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  etiqueta?: string;
  valor: number;
  alCambiar: (valor: number) => void;
  minimo?: number;
}

export function CampoNumero({
  etiqueta,
  valor,
  alCambiar,
  minimo = 0,
  className = '',
  ...resto
}: CampoNumeroProps) {
  const entrada = (
    <input
      type="number"
      inputMode="numeric"
      className={`campo ${className}`}
      value={Number.isFinite(valor) ? valor : ''}
      min={minimo}
      onFocus={(evento) => evento.currentTarget.select()}
      onChange={(evento) => {
        const crudo = evento.currentTarget.value;
        if (crudo === '') {
          alCambiar(minimo);
          return;
        }
        const numero = Number(crudo);
        if (Number.isFinite(numero)) alCambiar(Math.max(minimo, numero));
      }}
      {...resto}
    />
  );

  if (!etiqueta) return entrada;
  return (
    <label className="block">
      <span className="etiqueta">{etiqueta}</span>
      {entrada}
    </label>
  );
}

export function Seccion({
  titulo,
  accion,
  children,
}: {
  titulo: string;
  accion?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="tarjeta p-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xs font-bold tracking-wide text-marca-700 uppercase">{titulo}</h2>
        {accion}
      </header>
      {children}
    </section>
  );
}

export function Insignia({
  children,
  tono = 'neutro',
}: {
  children: ReactNode;
  tono?: 'neutro' | 'marca' | 'aviso' | 'exito';
}) {
  const tonos = {
    neutro: 'bg-neutral-100 text-neutral-600',
    marca: 'bg-marca-50 text-marca-700',
    aviso: 'bg-amber-50 text-amber-700',
    exito: 'bg-emerald-50 text-emerald-700',
  } as const;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${tonos[tono]}`}
    >
      {children}
    </span>
  );
}
