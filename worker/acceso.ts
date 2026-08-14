/**
 * Quién está entrando, según Cloudflare Access.
 *
 * Access pone delante del sitio una pantalla de correo y código, y a cada
 * petición que deja pasar le añade un token firmado. Aquí se comprueba esa
 * firma.
 *
 * Comprobarla —y no limitarse a leer la cabecera `Cf-Access-Authenticated-
 * User-Email`, que sería una línea— importa porque esa cabecera es texto que
 * cualquiera puede escribir. Si un día el Worker queda alcanzable por una
 * ruta que no pasa por Access (el subdominio `workers.dev`, una prueba, un
 * dominio nuevo mal configurado), leerla a secas convierte «quién eres» en un
 * campo que rellena quien llama. Verificando la firma, un token que no viene
 * de Access no vale nada.
 *
 * Aun así, la primera defensa es de configuración: `workers_dev` está apagado
 * en `wrangler.jsonc` para que la única puerta sea el dominio con Access
 * delante.
 */

/** Las claves públicas de Access, tal como las publica el equipo. */
interface Jwks {
  keys: (JsonWebKey & { kid: string })[];
}

/**
 * Claves ya importadas, indexadas por `kid`.
 *
 * Vive en memoria del aislado y sobrevive entre peticiones. Access rota las
 * claves cada seis semanas, y `TTL_CLAVES` obliga a volver a pedirlas mucho
 * antes de eso; si el `kid` que llega no está, se refrescan igual sin esperar
 * al vencimiento.
 */
let cache: { expiraEn: number; claves: Map<string, CryptoKey> } | null = null;

const TTL_CLAVES = 60 * 60 * 1000; // Una hora.

export interface ConfigAcceso {
  /** `algo.cloudflareaccess.com` */
  dominio: string;
  /** El «Application Audience (AUD) Tag» de la aplicación en Access. */
  aud: string;
}

export class SinAcceso extends Error {}

/**
 * Devuelve el correo de quien hace la petición, o lanza `SinAcceso`.
 *
 * El token llega en la cabecera `Cf-Access-Jwt-Assertion`; cuando la petición
 * la hace el navegador desde la propia página, viaja además como la cookie
 * `CF_Authorization`, que es la que se usa si la cabecera no está.
 */
export async function identificar(
  peticion: Request,
  config: ConfigAcceso,
): Promise<string> {
  const token =
    peticion.headers.get('Cf-Access-Jwt-Assertion') ?? cookie(peticion, 'CF_Authorization');

  if (!token) throw new SinAcceso('La petición no trae token de Access.');

  const [cabecera, cuerpo, firma] = token.split('.');
  if (!cabecera || !cuerpo || !firma) throw new SinAcceso('El token no tiene tres partes.');

  const { kid, alg } = leerJson<{ kid?: string; alg?: string }>(cabecera);
  if (alg !== 'RS256') throw new SinAcceso(`Algoritmo inesperado: ${alg}`);
  if (!kid) throw new SinAcceso('El token no dice con qué clave se firmó.');

  const clave = await claveDe(kid, config.dominio);
  const valida = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    clave,
    base64url(firma),
    new TextEncoder().encode(`${cabecera}.${cuerpo}`),
  );
  if (!valida) throw new SinAcceso('La firma del token no cuadra.');

  const datos = leerJson<{
    aud?: string | string[];
    iss?: string;
    exp?: number;
    email?: string;
  }>(cuerpo);

  const audiencias = Array.isArray(datos.aud) ? datos.aud : datos.aud ? [datos.aud] : [];
  if (!audiencias.includes(config.aud)) {
    // Un token válido de otra aplicación del mismo equipo. Firma correcta,
    // aplicación equivocada: sin esta comprobación, quien tenga acceso a
    // cualquier otra herramienta protegida entraría también aquí.
    throw new SinAcceso('El token es de otra aplicación.');
  }

  if (datos.iss !== `https://${config.dominio}`) {
    throw new SinAcceso('El token lo emitió otro equipo de Access.');
  }

  if (typeof datos.exp !== 'number' || datos.exp * 1000 <= Date.now()) {
    throw new SinAcceso('El token está vencido.');
  }

  if (!datos.email) throw new SinAcceso('El token no trae correo.');

  return datos.email.toLowerCase();
}

async function claveDe(kid: string, dominio: string): Promise<CryptoKey> {
  const vigente = cache && cache.expiraEn > Date.now() ? cache.claves : null;
  const conocida = vigente?.get(kid);
  if (conocida) return conocida;

  // O no hay caché, o está vencida, o llegó un `kid` nuevo porque Access acaba
  // de rotar las claves. En los tres casos toca volver a pedirlas.
  const claves = await descargarClaves(dominio);
  cache = { expiraEn: Date.now() + TTL_CLAVES, claves };

  const clave = claves.get(kid);
  if (!clave) throw new SinAcceso('El token se firmó con una clave desconocida.');
  return clave;
}

async function descargarClaves(dominio: string): Promise<Map<string, CryptoKey>> {
  const respuesta = await fetch(`https://${dominio}/cdn-cgi/access/certs`);
  if (!respuesta.ok) {
    throw new SinAcceso(`No se pudieron leer las claves de Access (${respuesta.status}).`);
  }

  const { keys } = (await respuesta.json()) as Jwks;
  const claves = new Map<string, CryptoKey>();

  for (const jwk of keys ?? []) {
    if (!jwk.kid) continue;
    claves.set(
      jwk.kid,
      await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify'],
      ),
    );
  }

  if (claves.size === 0) throw new SinAcceso('Access no devolvió ninguna clave.');
  return claves;
}

function cookie(peticion: Request, nombre: string): string | null {
  const crudo = peticion.headers.get('Cookie');
  if (!crudo) return null;

  for (const trozo of crudo.split(';')) {
    const igual = trozo.indexOf('=');
    if (igual < 0) continue;
    if (trozo.slice(0, igual).trim() === nombre) return trozo.slice(igual + 1).trim();
  }
  return null;
}

function leerJson<T>(parte: string): T {
  try {
    return JSON.parse(new TextDecoder().decode(base64url(parte))) as T;
  } catch {
    throw new SinAcceso('El token no es JSON válido.');
  }
}

/** base64url → bytes. El JWT no lleva relleno y cambia dos caracteres. */
function base64url(texto: string): Uint8Array {
  const base64 = texto.replace(/-/g, '+').replace(/_/g, '/');
  const relleno = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
  const binario = atob(base64 + relleno);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return bytes;
}
