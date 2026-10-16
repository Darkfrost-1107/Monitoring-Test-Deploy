/**
 * Lleva al inicio el contenedor con scroll que contiene a `desde`.
 *
 * La ficha scrollea dentro de un único tramo interno (el encabezado y el pie
 * quedan fijos). Al cambiar de criterio, ese tramo conserva el scroll del
 * anterior: el evaluador veía los niveles sin saber qué criterio le tocaba, y
 * tenía que subir a buscarlo. Se busca el ancestro scrolleable en vez de
 * nombrarlo para que el panel no dependa de cómo lo envuelve el formulario.
 */
export function llevarAlInicio(desde: HTMLElement | null): void {
  for (let el = desde?.parentElement; el; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if (overflowY === 'auto' || overflowY === 'scroll') {
      el.scrollTop = 0;
      return;
    }
  }
}
