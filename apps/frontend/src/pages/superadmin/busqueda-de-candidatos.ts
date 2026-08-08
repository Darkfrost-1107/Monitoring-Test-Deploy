/**
 * La búsqueda del directorio de personal del superusuario.
 *
 * Estaba en línea dentro de `SuperadminPanel` y no recortaba espacios, pero el
 * estado vacío de la tabla sí: escribir sólo espacios filtraba a todos y el
 * mensaje decía «Aún no hay personal registrado», que es otra cosa —y falsa—.
 *
 * También se busca por el nombre completo: quien escribe «Ana Torres» espera
 * encontrarla, aunque nombres y apellidos vivan en campos separados.
 */

interface CandidatoBuscable {
  dni: string;
  nombres: string;
  apellidos: string;
}

export function candidatosQueCoinciden<T extends CandidatoBuscable>(
  candidatos: readonly T[],
  busqueda: string,
): T[] {
  const termino = busqueda.trim().toLowerCase();
  if (!termino) return [...candidatos];

  return candidatos.filter((candidato) => {
    const nombreCompleto = `${candidato.nombres} ${candidato.apellidos}`.toLowerCase();
    return candidato.dni.includes(termino) || nombreCompleto.includes(termino);
  });
}
