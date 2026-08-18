import type { TipoPlantilla } from '@sistema-monitoreo/shared-contracts';

/**
 * Traducción entre el instrumento del contrato y el rótulo del formulario.
 *
 * ── Por qué hay dos representaciones ──
 * `Plantilla.tipoMonitoreo` del frontend guarda el ROTULO —«Monitoreo Docente
 * EIB»—, que es lo que el formulario ofrece y lo que la pantalla muestra. El
 * contrato usa el VALOR —`DOCENTE_EIB`—. Son el mismo dato en dos formas, y el
 * campo se llama igual en las dos, así que era fácil confundirlas: un fixture de
 * prueba llegó a usar el valor donde el modelo guarda el rótulo.
 *
 * ── Qué resuelve tenerlo acá ──
 * La tabla estaba escrita dos veces —`TIPO_MONITOREO_LABEL` en el mapeador y
 * `PLANTILLA_DE_INSTRUMENTO` en la lib de reportes— y la vuelta inversa se hacía
 * con `includes('EIB')` sobre el rótulo en mayúsculas, que es la clase de
 * comparación que ya nos dio un bug de precedencia. Acá está una sola vez, en la
 * entidad que es dueña del modelo, y en las dos direcciones.
 */

/** El rótulo con el que se nombra cada instrumento en el formulario. */
export const ROTULO_DE_INSTRUMENTO: Record<TipoPlantilla, string> = {
  DOCENTE: 'Monitoreo Docente',
  DOCENTE_EIB: 'Monitoreo Docente EIB',
  DIRECTIVO: 'Monitoreo Directivo',
};

/**
 * El instrumento que corresponde a un rótulo, o el docente si no se reconoce.
 *
 * La comparación es exacta contra la tabla. Antes era
 * `if (t.includes('EIB')) return 'DOCENTE_EIB'` sobre el rótulo en mayúsculas:
 * funcionaba, pero cualquier rótulo nuevo que contuviera esas letras entraba por
 * la rama equivocada sin que nada lo dijera.
 *
 * El respaldo es DOCENTE porque es el instrumento corriente y porque el
 * formulario sólo ofrece los tres rótulos de la tabla: llegar acá con otro
 * significa que alguien mandó algo que la pantalla no produce.
 */
export function instrumentoDeRotulo(rotulo: string): TipoPlantilla {
  const entrada = (Object.entries(ROTULO_DE_INSTRUMENTO) as [TipoPlantilla, string][]).find(
    ([, valor]) => valor === rotulo.trim(),
  );

  return entrada?.[0] ?? 'DOCENTE';
}
