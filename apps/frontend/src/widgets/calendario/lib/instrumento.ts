/**
 * Por qué no se puede abrir la ficha de una visita, si es que no se puede.
 *
 * `LlenarFichaForm` sólo se monta con una plantilla activa. Sin esta
 * comprobación el botón de iniciar seguía habilitado y la pulsación no hacía
 * nada: ni modal, ni aviso, ni rastro. Y el catálogo de plantillas arranca
 * vacío en cada montaje —`refetchOnMount`—, así que la ventana no era rara:
 * era la normal.
 */

export interface EstadoDelCatalogo {
  cargando: boolean;
  fallo: boolean;
}

export function motivoSinInstrumento(
  hayPlantillaActiva: boolean,
  catalogo: EstadoDelCatalogo,
): string | null {
  if (hayPlantillaActiva) return null;
  if (catalogo.cargando) return 'Cargando el instrumento de monitoreo…';
  if (catalogo.fallo) {
    return 'No se pudo cargar el instrumento de monitoreo. Reintente en unos momentos.';
  }
  return 'No hay una plantilla vigente para este tipo de visita. Solicite a la Jefatura de Gestión Pedagógica que publique una.';
}
