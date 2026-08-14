/**
 * Las dos pantallas del cotizador: la de armar y la de consultar.
 *
 * Con el fragmento (`#/historial`) y no con rutas de verdad. Así el servidor
 * no tiene que saber nada de rutas —cualquier hosting estático sirve el mismo
 * `index.html`— y el enlace se puede compartir y recargar sin dar un 404. Con
 * dos pantallas no compensa traer un enrutador entero.
 */

import { useEffect, useState } from 'react';

export type Ruta = 'cotizador' | 'historial';

function rutaActual(): Ruta {
  return window.location.hash.replace(/^#\/?/, '') === 'historial' ? 'historial' : 'cotizador';
}

export function useRuta(): [Ruta, (ruta: Ruta) => void] {
  const [ruta, setRuta] = useState<Ruta>(rutaActual);

  useEffect(() => {
    // Cubre el botón «atrás» del navegador, que cambia el fragmento sin pasar
    // por `ir`.
    const alCambiar = () => setRuta(rutaActual());
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);

  const ir = (siguiente: Ruta) => {
    window.location.hash = siguiente === 'historial' ? '#/historial' : '#/';
    setRuta(siguiente);
  };

  return [ruta, ir];
}
