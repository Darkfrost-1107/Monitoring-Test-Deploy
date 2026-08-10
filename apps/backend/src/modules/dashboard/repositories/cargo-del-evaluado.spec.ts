import { esDirectorEnEjercicio } from './cargo-del-evaluado.js';

/**
 * En «Requieren atención» el cargo se deducía del tipo de ficha. Un director en
 * ejercicio con una ficha docente cargada —que es lo que había en los datos—
 * aparecía etiquetado como DOCENTE.
 */
describe('esDirectorEnEjercicio', () => {
  it('lo es quien tiene una designación de Director abierta', () => {
    expect(esDirectorEnEjercicio({ docenteCargos: [{ id: 'dc-1' }] })).toBe(true);
  });

  it('no lo es quien no tiene ninguna', () => {
    expect(esDirectorEnEjercicio({ docenteCargos: [] })).toBe(false);
  });

  /**
   * La consulta ya filtra por `fechaFin: null`, así que una designación cerrada
   * no llega hasta acá: el cesado se cuenta como docente, que es lo que pasa a
   * ser.
   */
  it('el cesado no llega con designaciones y por lo tanto no lo es', () => {
    expect(esDirectorEnEjercicio({ docenteCargos: [] })).toBe(false);
  });
});
