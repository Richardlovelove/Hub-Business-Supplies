/**
 * Primitivas de dibujo sobre jsPDF.
 *
 * jsPDF trabaja con estado global —color de relleno, fuente, tamaño— y con
 * coordenadas absolutas. Escribir la cotización directamente contra esa API
 * hace que un cambio de márgenes obligue a recalcular decenas de números.
 * Estas funciones envuelven lo que se repite: colores por nombre, texto con
 * estilo, paneles y filetes.
 */

import type jsPDF from 'jspdf';
import { COLOR, FUENTE, type RGB } from './marca';

export function relleno(doc: jsPDF, color: RGB): void {
  doc.setFillColor(color[0], color[1], color[2]);
}

export function trazo(doc: jsPDF, color: RGB): void {
  doc.setDrawColor(color[0], color[1], color[2]);
}

export function tinta(doc: jsPDF, color: RGB): void {
  doc.setTextColor(color[0], color[1], color[2]);
}

export interface EstiloTexto {
  tamano?: number;
  color?: RGB;
  negrita?: boolean;
  /** Ancho máximo en mm; el texto se parte en varias líneas si lo excede. */
  ancho?: number;
  alineacion?: 'left' | 'center' | 'right';
  /** Separación entre líneas, como múltiplo del tamaño de fuente. */
  interlineado?: number;
}

/**
 * Escribe texto y devuelve la Y siguiente, para poder encadenar bloques sin
 * llevar la cuenta de altos a mano.
 */
export function escribir(
  doc: jsPDF,
  texto: string,
  x: number,
  y: number,
  estilo: EstiloTexto = {},
): number {
  const {
    tamano = 9,
    color = COLOR.texto,
    negrita = false,
    ancho,
    alineacion = 'left',
    interlineado = 1.25,
  } = estilo;

  doc.setFont(FUENTE, negrita ? 'bold' : 'normal');
  doc.setFontSize(tamano);
  tinta(doc, color);

  const lineas = ancho ? doc.splitTextToSize(texto, ancho) : [texto];
  doc.text(lineas, x, y, { align: alineacion });

  const altoLinea = (tamano * interlineado) / 2.835; // pt → mm
  return y + lineas.length * altoLinea;
}

/** Ancho que ocuparía un texto, para alinear a la derecha o medir columnas. */
export function anchoDe(doc: jsPDF, texto: string, tamano: number, negrita = false): number {
  doc.setFont(FUENTE, negrita ? 'bold' : 'normal');
  doc.setFontSize(tamano);
  return doc.getTextWidth(texto);
}

export interface Caja {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export function panel(
  doc: jsPDF,
  caja: Caja,
  opciones: { fondo?: RGB; borde?: RGB; radio?: number } = {},
): void {
  const { fondo, borde, radio = 2 } = opciones;
  if (fondo) relleno(doc, fondo);
  if (borde) trazo(doc, borde);

  const estilo = fondo && borde ? 'FD' : fondo ? 'F' : 'S';
  doc.setLineWidth(0.2);
  doc.roundedRect(caja.x, caja.y, caja.ancho, caja.alto, radio, radio, estilo);
}

/** Filete horizontal. */
export function regla(
  doc: jsPDF,
  x: number,
  y: number,
  ancho: number,
  color: RGB = COLOR.borde,
  grosor = 0.3,
): void {
  trazo(doc, color);
  doc.setLineWidth(grosor);
  doc.line(x, y, x + ancho, y);
}

/**
 * Rótulo de sección: texto corto en versalitas con un filete debajo. Es el
 * separador que estructura el documento sin recurrir a más colores.
 */
export function rotulo(doc: jsPDF, texto: string, x: number, y: number, ancho: number): number {
  const siguiente = escribir(doc, texto.toUpperCase(), x, y, {
    tamano: 8,
    color: COLOR.marcaOscuro,
    negrita: true,
  });
  regla(doc, x, y + 1.4, ancho, COLOR.marcaSuave, 0.5);
  return siguiente + 1.5;
}

/**
 * Pareja etiqueta/valor de los paneles de datos. La etiqueta va arriba en
 * gris pequeño y el valor debajo: ocupa menos ancho que ponerlos en línea y
 * no obliga a alinear dos columnas.
 */
export function campo(
  doc: jsPDF,
  etiqueta: string,
  valor: string,
  x: number,
  y: number,
  ancho: number,
): number {
  const tras = escribir(doc, etiqueta.toUpperCase(), x, y, {
    tamano: 6.5,
    color: COLOR.textoTenue,
    negrita: true,
  });
  return escribir(doc, valor || '—', x, tras + 0.6, {
    tamano: 9,
    color: COLOR.texto,
    ancho,
  });
}
