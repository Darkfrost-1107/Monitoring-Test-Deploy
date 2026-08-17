export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Error de una respuesta con estado de fallo, con el cuerpo que la acompañaba.
 *
 * `request` lanzaba un `Error` con el mensaje solamente y descartaba el resto
 * del JSON. El servidor manda datos que la pantalla necesita —cuántos intentos
 * quedan antes de bloquear una cuenta, hasta cuándo dura un bloqueo— y se
 * perdían acá, de modo que ningún consumidor podía usarlos por más que el
 * backend los enviara.
 */
export class ErrorDeApi extends Error {
  /** Estado HTTP de la respuesta. */
  readonly estado: number;
  /** Cuerpo tal como vino, cuando era JSON. */
  readonly cuerpo: Record<string, unknown> | null;

  constructor(mensaje: string, estado: number, cuerpo: Record<string, unknown> | null) {
    super(mensaje);
    this.name = 'ErrorDeApi';
    this.estado = estado;
    this.cuerpo = cuerpo;
  }
}

export async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const reqHeaders = new Headers(init?.headers);
  if (!isFormData && !reqHeaders.has('Content-Type')) {
    reqHeaders.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: reqHeaders,
  });
  if (!response.ok) {
    const errText = await response.text();
    let errMessage = response.statusText;
    let cuerpo: Record<string, unknown> | null = null;

    try {
      const errJson: unknown = JSON.parse(errText);
      if (errJson && typeof errJson === 'object') {
        cuerpo = errJson as Record<string, unknown>;
        const { message, code } = cuerpo as { message?: unknown; code?: unknown };
        if (typeof message === 'string') errMessage = message;
        else if (Array.isArray(message)) errMessage = message.join(', ');
        else if (typeof code === 'string') errMessage = code;
      }
    } catch {
      if (errText) errMessage = errText;
    }

    throw new ErrorDeApi(errMessage || `HTTP ${response.status}`, response.status, cuerpo);
  }
  const text = await response.text();
  if (!text) return null as unknown as T;
  try {
    return JSON.parse(text);
  } catch {
    return text as unknown as T;
  }
}

export async function requestBlob(
  path: string,
  init?: RequestInit,
): Promise<Blob> {
  const reqHeaders = new Headers(init?.headers);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: reqHeaders,
  });
  
  if (!response.ok) {
    const errText = await response.text();
    let errMessage = response.statusText;
    let cuerpo: Record<string, unknown> | null = null;

    try {
      const errJson: unknown = JSON.parse(errText);
      if (errJson && typeof errJson === 'object') {
        cuerpo = errJson as Record<string, unknown>;
        const { message, code } = cuerpo as { message?: unknown; code?: unknown };
        if (typeof message === 'string') errMessage = message;
        else if (typeof code === 'string') errMessage = code;
      }
    } catch {
      if (errText) errMessage = errText;
    }

    throw new ErrorDeApi(errMessage || `HTTP ${response.status}`, response.status, cuerpo);
  }
  
  return await response.blob();
}
