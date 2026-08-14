# Hub · B&S Logistics

La página de entrada a las herramientas internas de **Business & Supplies
Logistics S.A.S.** Un empleado la abre, ve tres botones y va directo a lo que
necesita: la página web, el cotizador o el CRM.

**https://richardlovelove.github.io/Hub-Business-Supplies/**

Aquí no vive el código de las herramientas — cada una tiene su propio
repositorio y su propio despliegue. Este repo es solo la portada que las
enlaza.

---

## Qué enlaza hoy

| Herramienta       | Qué es                                                        | A dónde va                                                  |
| ----------------- | ------------------------------------------------------------- | ----------------------------------------------------------- |
| **Página web**    | El sitio público: catálogo, servicios y contacto               | `byslogistics.com.co`                                        |
| **Cotizador**     | Arma la cotización y genera el PDF y el mensaje de WhatsApp    | `richardlovelove.github.io/Cotizador-Business-Supplies/`     |
| **CRM · Chatbot** | Panel del bot multicanal: conversaciones, leads y conexiones   | `bys-logistics.abrinay1997.workers.dev/admin`                |

---

## Cómo está hecho

Un solo archivo, `index.html`, con los estilos dentro. No hay dependencias, no
hay `npm install`, no hay paso de construcción. Se abre haciendo doble clic
sobre el archivo y se ve exactamente igual que publicado.

```
index.html      la página entera (marcado + estilos)
assets/         el logo oficial
.github/        el flujo que la publica
```

La paleta son los once azules de la marca (`--brand-50` … `--brand-950`,
alrededor del `#0060a8` del logo), los mismos que usa la página web. Están
declarados juntos al principio del `<style>`. La página se adapta sola a modo
claro y oscuro según la configuración de quien la abre.

---

## Agregar una herramienta nueva

En `index.html`, busca el comentario `LAS HERRAMIENTAS`. Debajo hay un `<li>`
por cada tarjeta. Copia uno entero, pégalo al final de la lista y cambia
cuatro cosas:

1. El `href` del enlace — a dónde lleva el botón.
2. El `<h2>` — el nombre de la herramienta.
3. El `<p>` — una línea explicando para qué sirve.
4. El `<svg>` del icono, si quieres otro dibujo.

La rejilla se reacomoda sola: con cuatro herramientas pasa a dos filas sin que
haya que tocar nada.

Para cambiarle el destino a una herramienta que ya está, basta con su `href`.

---

## Publicación

Cada empuje a `main` publica el hub en GitHub Pages a través de
`.github/workflows/pages.yml`. Para activarlo, una sola vez:
**Settings → Pages → Source: GitHub Actions**.

Al ser un sitio estático sin datos ni sesión, la página es pública para quien
tenga el enlace. Lleva `noindex` para que no aparezca en buscadores, pero eso
no es una contraseña: lo que protege cada herramienta es su propio acceso —
el panel del CRM pide su clave, y el cotizador y la web no exponen nada
sensible.
