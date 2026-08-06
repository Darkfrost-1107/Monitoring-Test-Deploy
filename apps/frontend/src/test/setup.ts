import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Desmonta el árbol de React entre tests para evitar fugas de estado/DOM.
afterEach(() => {
  cleanup();
});

// ── Polyfills para componentes de Radix UI en jsdom ──────────────────────
// jsdom no implementa estas APIs; Radix (menús, popovers) las invoca al abrir.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
// ── localStorage ──────────────────────────────────────────────────────────
// Este jsdom no expone `localStorage` ni en `window` ni como global, y Node lo
// ofrece sólo de forma experimental tras `--localstorage-file`. Sin este
// polyfill, cualquier código que persista sesión —`UserProvider`, entre otros—
// falla al importarse, que es la razón por la que esos módulos no tenían
// cobertura: no era que nadie hubiese escrito las pruebas, era que el entorno
// no podía ejecutarlas.
if (typeof globalThis.localStorage === 'undefined') {
  class AlmacenEnMemoria implements Storage {
    private datos = new Map<string, string>();

    get length(): number {
      return this.datos.size;
    }
    clear(): void {
      this.datos.clear();
    }
    getItem(clave: string): string | null {
      return this.datos.get(clave) ?? null;
    }
    key(indice: number): string | null {
      return [...this.datos.keys()][indice] ?? null;
    }
    removeItem(clave: string): void {
      this.datos.delete(clave);
    }
    setItem(clave: string, valor: string): void {
      this.datos.set(clave, String(valor));
    }
  }

  const almacen = new AlmacenEnMemoria();
  Object.defineProperty(globalThis, 'localStorage', { value: almacen, writable: true });
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', { value: almacen, writable: true });
  }
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
