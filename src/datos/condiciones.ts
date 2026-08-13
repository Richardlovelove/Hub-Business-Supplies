/**
 * Condiciones comerciales, tomadas literalmente de las plantillas que hoy usa
 * el área comercial (hojas COTIZADOR y COTIZACION FORMAL del Excel).
 *
 * Allí conviven dos ofertas distintas —producto personalizado y producto de
 * stock— con entregas y promesas diferentes. Aquí son dos plantillas
 * explícitas, y el asesor elige; antes había que acordarse de cuál copiar.
 */

import type { Condiciones } from '../dominio/tipos';

export type ClavePlantilla = 'personalizado' | 'stock';

export interface Plantilla {
  readonly clave: ClavePlantilla;
  readonly titulo: string;
  readonly descripcion: string;
  readonly condiciones: Condiciones;
}

export const PLANTILLAS: readonly Plantilla[] = [
  {
    clave: 'personalizado',
    titulo: 'Producto personalizado',
    descripcion: 'Con logo del cliente, numeración consecutiva y color a elección.',
    condiciones: {
      validezDias: 8,
      tiempoEntrega: '5 a 8 días hábiles',
      formaPago: 'Anticipado',
      incluyeFlete: true,
      incluye: [
        'Incluye personalización con logo',
        'Numeración consecutiva',
        'Color a elección',
        'Envío a ciudades principales',
      ],
      observaciones: '',
    },
  },
  {
    clave: 'stock',
    titulo: 'Producto de stock',
    descripcion: 'Existencias con texto SEGURIDAD, salida inmediata.',
    condiciones: {
      validezDias: 8,
      tiempoEntrega: '1 a 3 días hábiles',
      formaPago: 'Anticipado',
      incluyeFlete: false,
      incluye: [
        'Precintos con texto SEGURIDAD',
        'Numeración de stock',
        'Color de acuerdo a existencias',
        'Envío con flete contra entrega',
      ],
      observaciones: '',
    },
  },
];

export const PLANTILLA_POR_DEFECTO = PLANTILLAS[0]!;

/**
 * Notas que el Excel repite a mano y que conviene tener a un clic en lugar de
 * volver a escribirlas en cada cotización.
 */
export const NOTAS_FRECUENTES: readonly string[] = [
  'El valor del clisé para marcación de logo se cobra una sola vez por diseño.',
  'Colores disponibles: amarillo, azul, rojo, verde, blanco y negro.',
  'Colores diferentes a los estándar requieren inyección mínima de 5.000 unidades.',
  'Los precios no incluyen flete salvo indicación expresa.',
  'La numeración consecutiva se define con el cliente antes de producción.',
  'Precios sujetos a cambio sin previo aviso por variación de la tasa de cambio.',
];

/** Texto de cierre del PDF. */
export const AGRADECIMIENTO =
  'Agradecemos la oportunidad de presentarle esta propuesta. Quedamos atentos a sus comentarios.';
