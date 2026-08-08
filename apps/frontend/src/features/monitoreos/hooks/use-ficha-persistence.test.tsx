import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFichaPersistence } from './use-ficha-persistence';

/**
 * Pruebas de la recuperación de una ficha ya cerrada.
 *
 * `prepararFichaLlena` sembraba una ficha de demostración —doce aspectos
 * marcados, todos los niveles en III y IV, y un párrafo de observaciones
 * redactado— cuando el backend no tenía ficha para la visita o cuando la
 * consulta fallaba. El evaluador abría eso creyendo que era el monitoreo que
 * alguien levantó. Es el mismo relleno fabricado que se quitó de `ReportesGrid`.
 *
 * El guardia era `FEATURES.apiOnly`, que depende de `VITE_PERSISTENCE_MODE`;
 * esa variable no está puesta en ningún .env ni en el despliegue, así que el
 * modo cae en `hybrid` y el guardia nunca cerraba.
 */

const findByVisita = vi.fn();

vi.mock('@/features/monitoreos/api/fichas.api', () => ({
  fichasApi: { findByVisita: (id: string) => findByVisita(id) as unknown },
}));

const CLAVE = (id: string) => `sistema-monitoreo:ficha-state:${id}`;

const envoltorio = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const preparar = (visitId: string) => {
  const { result } = renderHook(
    () =>
      useFichaPersistence({
        plantillaId: 'pl-1',
        onPersistido: () => {},
        onPlantillaVersionada: () => {},
      }),
    { wrapper: envoltorio },
  );
  return result.current.prepararFichaLlena(visitId);
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('prepararFichaLlena — sin ficha en el backend', () => {
  it('lo declara en vez de fabricar una', async () => {
    findByVisita.mockResolvedValue(null);

    await expect(preparar('v-1')).resolves.toBe('sin-respaldo');
  });

  it('no deja nada escrito en el almacenamiento local', async () => {
    findByVisita.mockResolvedValue(null);

    await preparar('v-1');

    expect(localStorage.getItem(CLAVE('v-1'))).toBeNull();
  });
});

describe('prepararFichaLlena — la consulta que falla', () => {
  it('lo declara en vez de fabricar una', async () => {
    findByVisita.mockRejectedValue(new Error('sin red'));

    await expect(preparar('v-1')).resolves.toBe('error');
  });

  it('no deja nada escrito en el almacenamiento local', async () => {
    findByVisita.mockRejectedValue(new Error('sin red'));

    await preparar('v-1');

    expect(localStorage.getItem(CLAVE('v-1'))).toBeNull();
  });
});

describe('prepararFichaLlena — con ficha en el backend', () => {
  const FICHA = {
    id: 'f-1',
    observaciones: 'Lo observado en el aula.',
    sugerencias: 'Reforzar material concreto.',
    compromisos: 'Aplicar la estrategia.',
    respuestasDesempeno: [],
    respuestasAspecto: [],
    respuestasEjeItem: [],
  };

  it('la deja disponible', async () => {
    findByVisita.mockResolvedValue(FICHA);

    await expect(preparar('v-1')).resolves.toBe('cargada');
  });

  it('escribe lo que vino del backend, no un relleno', async () => {
    findByVisita.mockResolvedValue(FICHA);

    await preparar('v-1');

    const guardado = localStorage.getItem(CLAVE('v-1')) ?? '';
    expect(guardado).toContain('Lo observado en el aula.');
    expect(guardado).not.toContain('adecuada planificación didáctica');
  });

  /** Lo que ya está en curso localmente manda: no se pisa con lo del servidor. */
  it('un borrador local en curso no se consulta ni se pisa', async () => {
    localStorage.setItem(CLAVE('v-1'), '{"generalComments":"Lo que venía escribiendo"}');

    await expect(preparar('v-1')).resolves.toBe('cargada');
    expect(findByVisita).not.toHaveBeenCalled();
    expect(localStorage.getItem(CLAVE('v-1'))).toContain('Lo que venía escribiendo');
  });
});
