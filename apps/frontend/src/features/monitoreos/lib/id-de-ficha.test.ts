import { describe, it, expect, vi } from 'vitest';
import { idDeFicha } from './id-de-ficha';

/**
 * De qué ficha se trata. La pantalla de la ficha se abre con dos tipos de id: desde
 * el Calendario es el de la VISITA; desde el listado de Reportes, el de la FICHA.
 * Buscar «la ficha de la visita» con un id que ya es de ficha no encuentra nada, y
 * el PDF de una ficha existente se negaba con «todavía no está guardada».
 */

const visita = { id: 'visita-1' };
const fichaDelListado = { id: 'ficha-7', nivelLogro: 'LOGRO_ESPERADO' };
const informativa = { id: 'ficha-8', nivelLogro: null };

describe('idDeFicha', () => {
  it('si la fila ya es una ficha, su id es el de la ficha y no busca nada', async () => {
    const buscar = vi.fn();

    expect(await idDeFicha(fichaDelListado, 'plantilla-1', buscar)).toBe('ficha-7');
    expect(buscar).not.toHaveBeenCalled();
  });

  it('si es una visita, busca su ficha por visita y plantilla', async () => {
    const buscar = vi.fn().mockResolvedValue({ id: 'ficha-3' });

    expect(await idDeFicha(visita, 'plantilla-1', buscar)).toBe('ficha-3');
    expect(buscar).toHaveBeenCalledWith('visita-1', 'plantilla-1');
  });

  it('una visita sin ficha todavía devuelve null', async () => {
    expect(await idDeFicha(visita, 'plantilla-1', vi.fn().mockResolvedValue(null))).toBeNull();
  });

  it('una ficha con nivel de logro nulo (instrumento informativo) sigue siendo una ficha', async () => {
    const buscar = vi.fn();

    expect(await idDeFicha(informativa, 'plantilla-1', buscar)).toBe('ficha-8');
    expect(buscar).not.toHaveBeenCalled();
  });
});
