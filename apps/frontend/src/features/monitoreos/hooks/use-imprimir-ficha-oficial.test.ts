import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const { descargarPdf, toastError, toastLoading, toastSuccess } = vi.hoisted(() => ({
  descargarPdf: vi.fn(),
  toastError: vi.fn(),
  toastLoading: vi.fn().mockReturnValue('toast-1'),
  toastSuccess: vi.fn(),
}));

vi.mock('../api/fichas.api', () => ({
  fichasApi: { descargarPdf },
}));
vi.mock('sonner', () => ({
  toast: {
    error: toastError,
    loading: toastLoading,
    success: toastSuccess,
  },
}));

const { useImprimirFichaOficial } = await import('./use-imprimir-ficha-oficial');

const idDeFicha =
  (id: string | null = 'ficha-9') =>
  () =>
    Promise.resolve(id);
const pdf = new Blob(['%PDF'], { type: 'application/pdf' });

describe('useImprimirFichaOficial', () => {
  let clicSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    clicSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pdf-1');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    descargarPdf.mockResolvedValue(pdf);
  });

  afterEach(() => vi.restoreAllMocks());

  it('pregunta qué ficha es y pide el PDF de esa ficha', async () => {
    const obtener = vi.fn(idDeFicha('ficha-9'));
    const { result } = renderHook(() => useImprimirFichaOficial());

    await act(() => result.current.imprimir(obtener));

    expect(obtener).toHaveBeenCalledTimes(1);
    expect(descargarPdf).toHaveBeenCalledWith('ficha-9');
  });

  it('descarga el archivo PDF directamente vía enlace simulado', async () => {
    const { result } = renderHook(() => useImprimirFichaOficial());

    await act(() => result.current.imprimir(idDeFicha('ficha-12345')));

    expect(clicSpy).toHaveBeenCalledTimes(1);
    expect(toastSuccess).toHaveBeenCalledWith(
      expect.stringContaining('descargado'),
      expect.anything(),
    );
  });

  it('indica que está generando mientras espera, y deja de indicarlo al terminar', async () => {
    let terminar: (b: Blob) => void = () => {};
    descargarPdf.mockReturnValue(new Promise<Blob>((r) => (terminar = r)));
    const { result } = renderHook(() => useImprimirFichaOficial());

    let promesa: Promise<void>;
    act(() => {
      promesa = result.current.imprimir(idDeFicha());
    });
    await waitFor(() => expect(result.current.generando).toBe(true));

    terminar(pdf);
    await act(() => promesa);

    expect(result.current.generando).toBe(false);
  });

  it('ignora un segundo clic mientras ya está generando', async () => {
    descargarPdf.mockReturnValue(new Promise<Blob>(() => {}));
    const { result } = renderHook(() => useImprimirFichaOficial());

    act(() => {
      void result.current.imprimir(idDeFicha());
    });
    await waitFor(() => expect(result.current.generando).toBe(true));
    act(() => {
      void result.current.imprimir(idDeFicha());
    });

    expect(descargarPdf).toHaveBeenCalledTimes(1);
  });

  it('si el servidor falla, avisa con el motivo y limpia el estado', async () => {
    descargarPdf.mockRejectedValue(new Error('Gotenberg respondió 503'));
    const { result } = renderHook(() => useImprimirFichaOficial());

    await act(() => result.current.imprimir(idDeFicha()));

    expect(toastError).toHaveBeenCalledWith(
      expect.stringContaining('Gotenberg respondió 503'),
      expect.anything(),
    );
    expect(result.current.generando).toBe(false);
  });

  it('si la ficha no está guardada, lo dice y no pide el PDF', async () => {
    const { result } = renderHook(() => useImprimirFichaOficial());

    await act(() => result.current.imprimir(idDeFicha(null)));

    expect(descargarPdf).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith(
      expect.stringMatching(/no está guardada/i),
      expect.anything(),
    );
  });
});

