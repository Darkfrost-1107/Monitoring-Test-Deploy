/**
 * Quién figura en la ficha impresa: evaluado, monitor, institución y director.
 *
 * La resolución vivía dentro de `FichaPrintable`, en cuatro expresiones
 * `find(por id) || find(por nombre en minúsculas)` seguidas de cinco ternarios
 * que armaban los datos del director.
 *
 * ── Por qué se fue la búsqueda por nombre ──
 * `evaluado_id`, `monitor_id` e `institucion_id` son columnas no nulas con
 * clave foránea. Si el identificador no encuentra a nadie, lo que falta es el
 * padrón cargado en memoria, no el vínculo. Adivinar por nombre en ese caso
 * puede llevar a otra persona a un documento oficial firmado.
 */

export interface DocenteDelPadron {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
  correo?: string | null;
  celular?: string | null;
  condicion?: string | null;
  institucionId: string;
  cargo: string;
}

export interface EspecialistaDelPadron {
  id: string;
  nombre: string;
  dni?: string | null;
  correo?: string | null;
  celular?: string | null;
  cargo?: string | null;
}

export interface InstitucionDelPadron {
  id: string;
  nombre: string;
  codigoModular?: string | null;
  director?: string | null;
  directorDni?: string | null;
  directorCorreo?: string | null;
  directorTelefono?: string | null;
}

export interface PadronDeFicha {
  docentes?: DocenteDelPadron[];
  especialistas?: EspecialistaDelPadron[];
  instituciones?: InstitucionDelPadron[];
}

export interface VisitaDeFicha {
  tipo: 'DOCENTE' | 'DIRECTIVO';
  evaluadoId?: string;
  monitorId: string;
  institucionId: string;
  docenteDirectivo: string;
  especialista: string;
  institucion: string;
}

/** Los datos del director que la ficha imprime. */
export interface DirectorDeLaFicha {
  nombre: string;
  dni: string;
  correo: string;
  celular: string;
  condicion: string;
}

const SIN_DATOS: DirectorDeLaFicha = {
  nombre: '',
  dni: '',
  correo: '',
  celular: '',
  condicion: '',
};

const nombreCompleto = (d: DocenteDelPadron) => `${d.nombres} ${d.apellidos}`;

export interface ParticipantesDeLaFicha {
  docente: DocenteDelPadron | null;
  especialista: EspecialistaDelPadron | null;
  institucion: InstitucionDelPadron | null;
  director: DirectorDeLaFicha;
}

export function participantesDeLaFicha(
  visita: VisitaDeFicha,
  padron: PadronDeFicha,
): ParticipantesDeLaFicha {
  const docente = padron.docentes?.find((d) => d.id === visita.evaluadoId) ?? null;
  const especialista = padron.especialistas?.find((e) => e.id === visita.monitorId) ?? null;
  const institucion = padron.instituciones?.find((i) => i.id === visita.institucionId) ?? null;

  return {
    docente,
    especialista,
    institucion,
    director: directorDeLaFicha(visita, docente, institucion, padron),
  };
}

/**
 * Los datos del director que encabezan la ficha.
 *
 * En una visita directiva el evaluado **es** el director, así que se toman de
 * él. En una visita a docente se busca al director de esa misma institución en
 * el padrón, y si no está se recurre a los datos que la propia institución
 * guarda.
 */
function directorDeLaFicha(
  visita: VisitaDeFicha,
  evaluado: DocenteDelPadron | null,
  institucion: InstitucionDelPadron | null,
  padron: PadronDeFicha,
): DirectorDeLaFicha {
  if (visita.tipo === 'DIRECTIVO') {
    return {
      nombre: visita.docenteDirectivo,
      dni: evaluado?.dni ?? '',
      correo: evaluado?.correo ?? '',
      celular: evaluado?.celular ?? '',
      condicion: evaluado?.condicion ?? '',
    };
  }

  const enElPadron = padron.docentes?.find(
    (d) => d.institucionId === visita.institucionId && d.cargo === 'Director',
  );

  if (enElPadron) {
    return {
      nombre: nombreCompleto(enElPadron),
      dni: enElPadron.dni,
      correo: enElPadron.correo ?? '',
      celular: enElPadron.celular ?? '',
      condicion: enElPadron.condicion ?? '',
    };
  }

  if (!institucion?.director) return SIN_DATOS;

  return {
    nombre: institucion.director,
    dni: institucion.directorDni ?? '',
    correo: institucion.directorCorreo ?? '',
    celular: institucion.directorTelefono ?? '',
    // La institución guarda el nombre del director, no su condición laboral.
    condicion: '',
  };
}
