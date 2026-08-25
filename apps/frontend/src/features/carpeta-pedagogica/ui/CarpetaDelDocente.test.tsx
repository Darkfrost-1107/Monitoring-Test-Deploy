import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ICarpetaPedagogicaResponse } from '@sistema-monitoreo/shared-contracts';
import { CarpetaDelDocente } from './CarpetaDelDocente';
import { carpetaPedagogicaApi } from '@shared/api/carpeta-pedagogica.api';

/**
 * Carpeta pedagógica vista por quien monitorea.
 *
 * Lo que se fija acá es que la ausencia de carpeta se muestre como un HECHO
 * declarado y no como una pantalla en blanco. Para el especialista, «este
 * docente no registró su portafolio» es información del monitoreo, no una falla
 * de la aplicación: si la pantalla no lo dice, el especialista no sabe si el
 * docente no cargó nada o si el sistema no cargó nada.
 *
 * Y que el año consultado sea el de la VISITA: una visita de 2026 evalúa el
 * portafolio de 2026, aunque se abra la ficha dos años después.
 */

vi.mock('@shared/api/carpeta-pedagogica.api', () => ({
  carpetaPedagogicaApi: { deDocente: vi.fn() },
}));

const URL_CARPETA = 'https://drive.google.com/drive/folders/1nsUuFd8N_Xjw8NkAQYT93tIOj66PwpOe';

const conRespuesta = (respuesta: ICarpetaPedagogicaResponse) => {
  vi.mocked(carpetaPedagogicaApi.deDocente).mockResolvedValue(respuesta);
};

const montar = (props: { docenteId: string; anio: number }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CarpetaDelDocente {...props} />
    </QueryClientProvider>,
  );
};

beforeEach(() => vi.clearAllMocks());

describe('CarpetaDelDocente', () => {
  it('consulta el año de la visita, no el año en curso', async () => {
    conRespuesta({ carpeta: null });

    montar({ docenteId: 'doc-1', anio: 2026 });

    await screen.findByText(/no registró/i);
    expect(carpetaPedagogicaApi.deDocente).toHaveBeenCalledWith('doc-1', 2026);
  });

  it('ofrece abrir la carpeta cuando el docente la registró', async () => {
    conRespuesta({
      carpeta: {
        id: 'cp-1',
        docenteId: 'doc-1',
        anioEscolar: 2026,
        url: URL_CARPETA,
        descripcion: 'Portafolio completo del año',
        actualizadoEn: '2026-03-20T10:00:00.000Z',
        actualizadoPor: 'Rosa Parra',
      },
    });

    montar({ docenteId: 'doc-1', anio: 2026 });

    const enlace = await screen.findByRole('link', { name: /Abrir carpeta en Drive/i });
    expect(enlace).toHaveAttribute('href', URL_CARPETA);
    expect(enlace).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText('Portafolio completo del año')).toBeInTheDocument();
  });

  it('declara la ausencia con el año, en vez de dejar la pantalla vacía', async () => {
    // Para el especialista esto es un dato del monitoreo, no un error.
    conRespuesta({ carpeta: null });

    montar({ docenteId: 'doc-1', anio: 2026 });

    expect(await screen.findByText(/no registró su carpeta pedagógica para 2026/i)).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('distingue una falla de consulta de una ausencia de carpeta', async () => {
    // Si no se separan, el especialista podría anotar «no tiene portafolio»
    // cuando en realidad la consulta nunca llegó.
    vi.mocked(carpetaPedagogicaApi.deDocente).mockRejectedValue(new Error('sin red'));

    montar({ docenteId: 'doc-1', anio: 2026 });

    expect(await screen.findByText(/No se pudo consultar/i)).toBeInTheDocument();
    expect(screen.queryByText(/no registró/i)).toBeNull();
  });
});
