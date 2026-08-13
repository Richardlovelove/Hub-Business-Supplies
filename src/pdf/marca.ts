/**
 * Tokens visuales del PDF.
 *
 * Los colores son los mismos de byslogistics-web (rampa `--color-brand-*` de
 * `src/assets/styles/global.css`), en RGB porque jsPDF no entiende hex ni
 * oklch. Así la cotización impresa y el sitio se ven de la misma empresa.
 */

export type RGB = readonly [number, number, number];

export const COLOR = {
  /** brand-600 #0060a8 — el azul del logo. */
  marca: [0, 96, 168] as RGB,
  /** brand-800 #004174 — títulos y filetes. */
  marcaOscuro: [0, 65, 116] as RGB,
  /** brand-950 #00203a — banda de cabecera. */
  tinta: [0, 32, 58] as RGB,
  /** brand-50 #eff7fc — fondo de filas alternas. */
  marcaTenue: [239, 247, 252] as RGB,
  /** brand-100 #d7ecf8 — fondo de paneles. */
  marcaSuave: [215, 236, 248] as RGB,

  /** neutral-800 — texto de cuerpo. */
  texto: [38, 38, 38] as RGB,
  /** neutral-600 — texto secundario. */
  textoSuave: [82, 82, 82] as RGB,
  /** neutral-400 — texto de pie. */
  textoTenue: [140, 140, 140] as RGB,
  /** neutral-300 — bordes. */
  borde: [212, 212, 212] as RGB,
  /** neutral-100 — fondos suaves. */
  fondo: [245, 245, 245] as RGB,
  blanco: [255, 255, 255] as RGB,
} as const;

/**
 * Helvetica es una de las fuentes que todo lector de PDF trae incorporada: no
 * hay que empotrar ningún archivo y el documento pesa lo mismo con o sin
 * texto. Cubre los acentos y la eñe del español.
 */
export const FUENTE = 'helvetica';

export const TIPO = {
  titulo: 20,
  subtitulo: 12,
  seccion: 8,
  cuerpo: 9,
  tabla: 8.5,
  pie: 7.5,
} as const;

/** Medidas de página en milímetros. */
export const HOJA = {
  ancho: 210,
  alto: 297,
  margen: 14,
  /** Alto reservado abajo para el pie institucional. */
  pie: 22,
} as const;

export const ANCHO_UTIL = HOJA.ancho - HOJA.margen * 2;
