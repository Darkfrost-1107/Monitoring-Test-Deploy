import { useCallback, useState } from 'react';
import {
  FORMULARIO_CRONOGRAMA_VACIO,
  aplicarCambioDeAsignacion,
  type FormularioCronograma,
} from '../lib/formulario';

/**
 * Estado del formulario de programación de visitas.
 *
 * Fase 5 de PLAN_REMEDIACION.md. `CronogramaPage` declaraba doce `useState`
 * sueltos para este formulario. Además de la repetición, sus setters obligaban
 * a silenciar `react-hooks/exhaustive-deps` en el efecto que precarga el
 * formulario desde una solicitud: eran demasiados y ninguno estable.
 *
 * Acá los actualizadores se crean una sola vez, de modo que el efecto puede
 * declarar sus dependencias de verdad.
 *
 * Guarda los valores y nada más: el error y el estado de envío pertenecen al
 * guardado, y tenerlos acá dejaba dos estados de error distintos —el que el
 * modal mostraba y el que `reiniciar` limpiaba—.
 */
export function useFormularioCronograma() {
  const [valores, setValores] = useState<FormularioCronograma>(FORMULARIO_CRONOGRAMA_VACIO);

  /** Cambia un campo respetando la cascada modalidad → nivel → asignación. */
  const cambiar = useCallback(
    <K extends keyof FormularioCronograma>(campo: K, valor: FormularioCronograma[K]) => {
      setValores((previo) => aplicarCambioDeAsignacion(previo, campo, valor));
    },
    [],
  );

  /** Carga varios campos de una vez, sin disparar la cascada. */
  const cargar = useCallback((parcial: Partial<FormularioCronograma>) => {
    setValores((previo) => ({ ...previo, ...parcial }));
  }, []);

  const reiniciar = useCallback((parcial: Partial<FormularioCronograma> = {}) => {
    setValores({ ...FORMULARIO_CRONOGRAMA_VACIO, ...parcial });
  }, []);

  return { valores, cambiar, cargar, reiniciar };
}
