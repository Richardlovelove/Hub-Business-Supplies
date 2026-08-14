-- Historial de cotizaciones.
--
-- `documento` es el JSON completo tal como lo arma el cotizador, y es la
-- fuente de verdad: de ahí se regenera el PDF idéntico al que recibió el
-- cliente. Las demás columnas son copias planas de datos que ya están dentro
-- del JSON, y existen sólo para poder listar, buscar y filtrar sin abrirlo.
--
-- Esas copias las calcula el Worker con las mismas funciones que usa la
-- pantalla (`dominio/precios`), no el navegador que envía: así el total del
-- listado no puede discrepar del total del PDF.

CREATE TABLE cotizaciones (
  numero            TEXT PRIMARY KEY,
  -- Fecha del documento, la que se imprime. La pone el asesor y puede no ser
  -- la de hoy.
  fecha             TEXT NOT NULL,
  -- Instante real de emisión. Es el que ordena el historial: la fecha del
  -- documento se puede retocar, ésta no.
  emitida_en        TEXT NOT NULL,
  -- Correo de quien emitió, tomado del token de Cloudflare Access. No se
  -- acepta del navegador.
  autor             TEXT NOT NULL,
  -- Nombre que firma la cotización, del propio documento. Puede no coincidir
  -- con `autor`: una asistente emite a nombre de la asesora.
  asesor            TEXT NOT NULL DEFAULT '',

  cliente_empresa   TEXT NOT NULL DEFAULT '',
  cliente_nit       TEXT NOT NULL DEFAULT '',
  cliente_contacto  TEXT NOT NULL DEFAULT '',

  -- Pesos con IVA, redondeado. Se guarda como entero: el peso colombiano no
  -- tiene decimales en factura y así las sumas del historial son exactas.
  total             INTEGER NOT NULL,
  unidades          INTEGER NOT NULL,

  estado            TEXT NOT NULL DEFAULT 'emitida'
                      CHECK (estado IN ('emitida', 'aceptada', 'perdida')),
  estado_nota       TEXT NOT NULL DEFAULT '',
  estado_en         TEXT,
  estado_por        TEXT,

  catalogo_version  TEXT NOT NULL DEFAULT '',
  documento         TEXT NOT NULL
);

-- El historial se abre siempre por lo último emitido.
CREATE INDEX cotizaciones_por_emision ON cotizaciones (emitida_en DESC);
-- «Qué le hemos cotizado a este cliente» es la segunda pregunta que se hace.
CREATE INDEX cotizaciones_por_cliente ON cotizaciones (cliente_empresa COLLATE NOCASE);
CREATE INDEX cotizaciones_por_estado ON cotizaciones (estado);

-- Consecutivo central, un contador por año.
--
-- Reemplaza al que vivía en el `localStorage` de cada navegador: con dos
-- personas cotizando el mismo día, aquel repetía números sin que nadie se
-- enterara hasta que dos clientes tenían la misma «COT-2026-0007».
CREATE TABLE consecutivos (
  anio  TEXT PRIMARY KEY,
  valor INTEGER NOT NULL
);
