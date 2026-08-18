import { separarAutonotificacion } from './autonotificacion.helper.js';

/**
 * Nadie recibe una alerta sobre sí mismo. El caso: el director de la I.E. es el
 * directivo señalado, así que el destinatario coincide con el docente de la
 * alerta y no debe notificársele.
 */
describe('separarAutonotificacion', () => {
  const director = { docenteId: 'doc-director', nombre: 'Director' };
  const jefeArea = { docenteId: null, nombre: 'Jefe de Area' };

  it('omite al destinatario que es el propio senalado', () => {
    const { notificables, omitidosPorSerElMismo } = separarAutonotificacion(
      [director],
      'doc-director',
    );

    expect(notificables).toHaveLength(0);
    expect(omitidosPorSerElMismo).toEqual([director]);
  });

  it('notifica al destinatario cuando el senalado es otra persona', () => {
    const { notificables, omitidosPorSerElMismo } = separarAutonotificacion([director], 'doc-otro');

    expect(notificables).toEqual([director]);
    expect(omitidosPorSerElMismo).toHaveLength(0);
  });

  it('deja pasar a los destinatarios sin docente asociado', () => {
    // El Jefe de Area no es un docente: nunca es el senalado.
    const { notificables } = separarAutonotificacion([jefeArea], 'doc-director');

    expect(notificables).toEqual([jefeArea]);
  });

  it('separa una lista mixta', () => {
    const { notificables, omitidosPorSerElMismo } = separarAutonotificacion(
      [director, jefeArea],
      'doc-director',
    );

    expect(notificables).toEqual([jefeArea]);
    expect(omitidosPorSerElMismo).toEqual([director]);
  });

  /** Sin senalado en la alerta no hay a quien comparar: se notifica a todos. */
  it('notifica a todos si la alerta no trae docente senalado', () => {
    expect(separarAutonotificacion([director, jefeArea], undefined).notificables).toEqual([
      director,
      jefeArea,
    ]);
    expect(separarAutonotificacion([director], null).notificables).toEqual([director]);
  });
});
