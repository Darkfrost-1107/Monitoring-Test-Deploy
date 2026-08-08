import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';
import type { Cronograma } from '@entities/model-cronogramas';
import type { Plantilla } from '@entities/model-plantillas';
import { validarCierreDeFicha } from '../lib/validacion-ficha';
import { aDatosFicha, type EstadoFormularioFicha } from '../lib/estado-formulario';

/**
 * Guardar el borrador y cerrar la ficha.
 *
 * El motivo por el que una ficha todavía no se puede cerrar se devuelve como
 * estado, no como `alert()`: había que descartarlo para ir a buscar lo que
 * faltaba, y al descartarlo el motivo desaparecía. En una ficha de cinco
 * desempeños con sus aspectos, eso es pedirle al evaluador que lo memorice.
 */

interface Opciones {
  /** Nulos mientras el modal está cerrado: el hook corre igual y no hace nada. */
  visit?: Cronograma | null;
  template?: Plantilla | null;
  estado: EstadoFormularioFicha;
  onSave?: (visitId: string, datos: ReturnType<typeof aDatosFicha>) => void;
  onFinalize?: (visitId: string, datos: ReturnType<typeof aDatosFicha>) => void;
}

export function useAccionesDeFicha({ visit, template, estado, onSave, onFinalize }: Opciones) {
  /** Motivo por el que la ficha todavía no se puede cerrar. */
  const [faltaParaCerrar, setFaltaParaCerrar] = useState<string | null>(null);

  const guardarBorrador = () => {
    if (!visit) return;
    onSave?.(visit.id, aDatosFicha(estado, visit.tipo));
  };

  const finalizar = () => {
    if (!visit || !template) return;

    // Las cinco condiciones de cierre viven en `lib/validacion-ficha.ts`, con
    // cobertura propia; acá sólo se informa la primera que falte.
    const falta = validarCierreDeFicha(template, estado);
    if (falta) {
      setFaltaParaCerrar(falta);
      return;
    }

    setFaltaParaCerrar(null);
    onFinalize?.(visit.id, aDatosFicha(estado, visit.tipo));

    toast.success('Ficha finalizada con éxito', {
      description:
        'El PDF oficial se está generando y enviando por correo al docente evaluado de forma automática.',
      duration: 6000,
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    });
  };

  return {
    guardarBorrador,
    finalizar,
    faltaParaCerrar,
    olvidarFalta: () => setFaltaParaCerrar(null),
  };
}
