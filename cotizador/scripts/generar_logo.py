#!/usr/bin/env python3
"""
Empotra el logo de B&S Logistics como módulo TypeScript.

jsPDF necesita el mapa de bits en memoria al construir el documento. Si el
logo se pidiera por red, generar el PDF dependería de que la aplicación esté
servida y en línea; empotrado, el cotizador funciona abierto desde el disco.

Se reescala porque el original (1600 px) pesa 320 KB y en el PDF ocupa unos
45 mm de ancho: a 300 ppp bastan ~530 px.

Uso:
    python3 scripts/generar_logo.py public/marca/logo.png -o src/pdf/logo.ts
"""

from __future__ import annotations

import argparse
import base64
import io
from pathlib import Path

from PIL import Image

ANCHO_OBJETIVO = 700

# El logo son tres tintas planas sobre transparencia; con paleta reducida baja
# de 112 KB a 20 KB sin diferencia visible, y eso se nota en el peso del bundle.
COLORES_PALETA = 128

PLANTILLA = '''// Archivo generado por scripts/generar_logo.py — no editar a mano.
// Origen: {origen} ({ancho}×{alto} px, PNG con transparencia).

/** Logo institucional en data URI, listo para `doc.addImage`. */
export const LOGO_DATA_URI =
  '{data_uri}';

/** Proporción ancho/alto del logo, para no deformarlo al colocarlo. */
export const LOGO_RELACION_ASPECTO = {aspecto};
'''


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("origen", type=Path, help="PNG del logo")
    parser.add_argument("-o", "--salida", type=Path, default=Path("src/pdf/logo.ts"))
    parser.add_argument("--ancho", type=int, default=ANCHO_OBJETIVO)
    parser.add_argument("--colores", type=int, default=COLORES_PALETA)
    args = parser.parse_args()

    imagen = Image.open(args.origen).convert("RGBA")
    if imagen.width > args.ancho:
        alto = round(imagen.height * args.ancho / imagen.width)
        imagen = imagen.resize((args.ancho, alto), Image.LANCZOS)

    ancho, alto = imagen.size
    if args.colores:
        # FASTOCTREE es el único cuantizador de Pillow que conserva el canal
        # alfa; con MEDIANCUT el fondo transparente se vuelve negro.
        imagen = imagen.quantize(colors=args.colores, method=Image.FASTOCTREE)

    buffer = io.BytesIO()
    imagen.save(buffer, format="PNG", optimize=True)
    datos = buffer.getvalue()
    data_uri = "data:image/png;base64," + base64.b64encode(datos).decode()

    args.salida.parent.mkdir(parents=True, exist_ok=True)
    args.salida.write_text(
        PLANTILLA.format(
            origen=args.origen.name,
            ancho=ancho,
            alto=alto,
            data_uri=data_uri,
            aspecto=round(ancho / alto, 4),
        ),
        encoding="utf-8",
    )
    print(f"{ancho}×{alto} · {len(datos) / 1024:.0f} KB → {args.salida}")


if __name__ == "__main__":
    main()
