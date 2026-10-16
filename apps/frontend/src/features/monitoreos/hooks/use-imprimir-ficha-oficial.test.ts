import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const { descargarPdf, toastError } = vi.hoisted(() => ({
  descargarPdf: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('../api/fichas.api', () => ({
  fichasApi: { descargarPdf },
}));
vi.mock('sonner', () => ({ toast: { error: toastError } }));

const { useImprimirFichaOficial } = await import('./use-imprimir-ficha-oficial');

/**
 * «Imprimir / PDF» abre el PDF oficial que genera el backend.
 *
 * La ventana se abre en el instante del clic, antes de esperar al servidor: si
 * se abriera después, el navegador la tomaría por una ventana emergente no
 * pedida y la bloquearía.
 */

const idDeFicha =
  (id: string | null = 'ficha-9') =>
  () =>
    Promise.resolve(id);
const pdf = new Blob(['%PDF'], { type: 'application/pdf' });

describe('useImprimirFichaOficial', () => {
  let ventana: { location: { href: string }; close: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    ventana = { location: { href: '' }, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(ventana as unknown as Window);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pdf-1');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    descargarPdf.mockResolvedValue(pdf);
  });

  afterEach(() => vi.restoreAllMocks());

  it('abre la ventana en el momento del clic, antes de pedir nada al servidor', async () => {
    const { result } = renderHook(() => useImprimirFichaOficial());

    let promesa: Promise<void>;
    act(() => {
      promesa = result.current.imprimir(idDeFicha());
    });

    expect(window.open).toHaveBeenCalledTimes(1);
    expect(descargarPdf).not.toHaveBeenCalled();
    await act(() => promesa);
  });

  it('pregunta qué ficha es y pide el PDF de esa ficha', async () => {
    const obtener = vi.fn(idDeFicha('ficha-9'));
    const { result } = renderHook(() => useImprimirFichaOficial());

    await act(() => result.current.imprimir(obtener));

    expect(obtener).toHaveBeenCalledTimes(1);
    expect(descargarPdf).toHaveBeenCalledWith('ficha-9');
  });

  it('lleva la ventana abierta al PDF', async () => {
    const { result } = renderHook(() => useImprimirFichaOficial());

    await act(() => result.current.imprimir(idDeFicha()));

    expect(ventana.location.href).toBe('blob:pdf-1');
    expect(ventana.close).not.toHaveBeenCalled();
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

    expect(window.open).toHaveBeenCalledTimes(1);
  });

  it('si el servidor falla, cierra la ventana en blanco y avisa con el motivo', async () => {
    descargarPdf.mockRejectedValue(new Error('Gotenberg respondió 503'));
    const { result } = renderHook(() => useImprimirFichaOficial());

    await act(() => result.current.imprimir(idDeFicha()));

    expect(ventana.close).toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('Gotenberg respondió 503'));
    expect(result.current.generando).toBe(false);
  });

  it('si la ficha no está guardada, lo dice y no pide el PDF', async () => {
    const { result } = renderHook(() => useImprimirFichaOficial());

    await act(() => result.current.imprimir(idDeFicha(null)));

    expect(descargarPdf).not.toHaveBeenCalled();
    expect(ventana.close).toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/no está guardada/i));
  });

  it('si el navegador bloquea la ventana, descarga el archivo en su lugar', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { result } = renderHook(() => useImprimirFichaOficial());

    await act(() => result.current.imprimir(idDeFicha()));

    expect(clic).toHaveBeenCalledTimes(1);
    expect(toastError).not.toHaveBeenCalled();
  });
});
