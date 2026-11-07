import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupPwaAutoUpdate } from './pwa-update';
import * as chunkReload from './chunk-reload';

describe('setupPwaAutoUpdate', () => {
  let reloadSpy: ReturnType<typeof vi.spyOn>;
  let mockRegistration: { update: ReturnType<typeof vi.fn> };
  let originalServiceWorker: unknown;

  beforeEach(() => {
    reloadSpy = vi.spyOn(chunkReload, 'reloadForNewVersion').mockImplementation(() => {});
    mockRegistration = {
      update: vi.fn().mockResolvedValue(undefined),
    };
    originalServiceWorker = (navigator as unknown as { serviceWorker?: unknown }).serviceWorker;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'serviceWorker', {
      value: originalServiceWorker,
      configurable: true,
      writable: true,
    });
  });

  it('no falla ni registra listeners si serviceWorker no está soportado en navigator', () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    expect(() => setupPwaAutoUpdate()).not.toThrow();
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('en la primera visita (sin controlador previo), el primer controllerchange no dispara recarga', () => {
    const listeners: Record<string, () => void> = {};
    const mockSw = {
      controller: null,
      addEventListener: vi.fn((event: string, cb: () => void) => {
        listeners[event] = cb;
      }),
      ready: Promise.resolve(mockRegistration),
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockSw,
      configurable: true,
      writable: true,
    });

    setupPwaAutoUpdate();

    // Disparar controllerchange en la primera instalación
    listeners.controllerchange?.();

    expect(reloadSpy).not.toHaveBeenCalled();

    // Un segundo controllerchange (nueva versión futura) sí debe disparar recarga
    listeners.controllerchange?.();
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('si ya existía un controlador previo, controllerchange dispara reloadForNewVersion de inmediato', () => {
    const listeners: Record<string, () => void> = {};
    const mockSw = {
      controller: { state: 'activated' },
      addEventListener: vi.fn((event: string, cb: () => void) => {
        listeners[event] = cb;
      }),
      ready: Promise.resolve(mockRegistration),
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockSw,
      configurable: true,
      writable: true,
    });

    setupPwaAutoUpdate();

    listeners.controllerchange?.();

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('solicita actualización proactiva (registration.update) al estar listo y al pasar a visible', async () => {
    const docListeners: Record<string, () => void> = {};
    const addDocListenerSpy = vi
      .spyOn(document, 'addEventListener')
      .mockImplementation((event: string, cb: unknown) => {
        docListeners[event] = cb as () => void;
      });

    const mockSw = {
      controller: null,
      addEventListener: vi.fn(),
      ready: Promise.resolve(mockRegistration),
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockSw,
      configurable: true,
      writable: true,
    });

    setupPwaAutoUpdate();

    await Promise.resolve(); // esperar a que resuelva ready

    expect(mockRegistration.update).toHaveBeenCalledTimes(1);

    // Simular que el usuario regresa a la app desde segundo plano
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    docListeners.visibilitychange?.();

    expect(mockRegistration.update).toHaveBeenCalledTimes(2);

    addDocListenerSpy.mockRestore();
  });
});
