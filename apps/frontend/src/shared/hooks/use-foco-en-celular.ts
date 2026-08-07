import { useEffect, useRef } from 'react';
import { esErrorDeCelular } from '@shared/lib/errores-formulario';

/**
 * Lleva la vista al campo de contacto cuando el servidor lo rechaza.
 *
 * En un formulario largo el campo señalado puede haber quedado fuera de
 * pantalla: sin esto el usuario ve un error y no ve qué corregir. Se enfoca el
 * `input` de adentro, no el contenedor, para que pueda escribir de una.
 *
 * Devuelve la referencia que hay que colgar del contenedor del campo.
 */
export function useFocoEnCelular(serverError?: string | null) {
  const celularRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!esErrorDeCelular(serverError) || !celularRef.current) return;
    celularRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    celularRef.current.querySelector('input')?.focus();
  }, [serverError]);

  return celularRef;
}
