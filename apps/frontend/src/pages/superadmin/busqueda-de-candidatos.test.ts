import { describe, it, expect } from 'vitest';
import { candidatosQueCoinciden } from './busqueda-de-candidatos';

/**
 * La búsqueda del directorio de personal del superusuario.
 */

const persona = (over: Partial<Parameters<typeof candidatosQueCoinciden>[0][number]> = {}) => ({
  dni: '12345678',
  nombres: 'Ana',
  apellidos: 'Torres',
  ...over,
});

describe('candidatosQueCoinciden', () => {
  const lista = [
    persona(),
    persona({ dni: '87654321', nombres: 'Luis', apellidos: 'Quispe' }),
  ];

  it('sin búsqueda devuelve a todos', () => {
    expect(candidatosQueCoinciden(lista, '')).toHaveLength(2);
  });

  it('busca por nombres y apellidos sin distinguir mayúsculas', () => {
    expect(candidatosQueCoinciden(lista, 'ANA')).toHaveLength(1);
    expect(candidatosQueCoinciden(lista, 'quispe')).toHaveLength(1);
  });

  it('busca por DNI parcial', () => {
    expect(candidatosQueCoinciden(lista, '1234')).toHaveLength(1);
  });

  /**
   * DEFECTO CORREGIDO. La búsqueda no recortaba espacios pero el estado vacío
   * sí: escribir sólo espacios filtraba a todos y la tabla anunciaba «Aún no
   * hay personal registrado», que es otra cosa —y falsa—.
   */
  it('una búsqueda de sólo espacios no descarta a nadie', () => {
    expect(candidatosQueCoinciden(lista, '   ')).toHaveLength(2);
  });

  it('ignora los espacios alrededor del término', () => {
    expect(candidatosQueCoinciden(lista, '  ana  ')).toHaveLength(1);
  });

  it('encuentra por el apellido dentro del nombre completo', () => {
    expect(candidatosQueCoinciden(lista, 'Ana Torres')).toHaveLength(1);
  });

  it('devuelve la lista vacía cuando nada coincide', () => {
    expect(candidatosQueCoinciden(lista, 'Mendoza')).toEqual([]);
  });
});
