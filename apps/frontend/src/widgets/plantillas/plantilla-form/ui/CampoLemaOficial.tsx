import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { TextField } from '@shared/ui/form-controls';
import { estadoDelCampoLema } from '@features/plantillas/lib/campo-lema';

/**
 * Lema oficial del año académico dentro del formulario de plantilla.
 *
 * Lo fija un decreto supremo cada enero y es el mismo para todo el país: es
 * propiedad del año, no de la plantilla. Por eso la primera plantilla del año
 * lo carga y las siguientes lo muestran ya cargado, en solo lectura, para que
 * registrar una segunda plantilla no pise el encabezado de todas las fichas.
 *
 * No consulta nada: el formulario es quien conoce el año y resuelve el valor
 * vigente. Acá sólo se decide cómo se muestra.
 */

interface Props {
  anioAcademico: number;
  /** Valor vigente del campo, ya resuelto por el formulario. */
  lema: string;
  /** Lo que el año tiene guardado, o nulo si todavía no se cargó. */
  lemaGuardado: string | null;
  cargando: boolean;
  onChange: (lema: string) => void;
}

export const CampoLemaOficial = ({
  anioAcademico,
  lema,
  lemaGuardado,
  cargando,
  onChange,
}: Props) => {
  const [corrigiendo, setCorrigiendo] = useState(false);

  const estado = estadoDelCampoLema({ lemaGuardado, cargando, corrigiendo });

  if (estado.modo === 'cargando') {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-text">Lema oficial del año</label>
        <div className="h-9 rounded-md bg-muted/40 animate-pulse" />
      </div>
    );
  }

  if (estado.modo === 'lectura') {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-text">
          Lema oficial del año {anioAcademico}
        </label>
        <p className="text-sm text-text italic border border-border rounded-md px-3 py-2 bg-muted/20">
          &laquo;{estado.lemaGuardado}&raquo;
        </p>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[0.7rem] text-text-muted">
            Ya cargado. Se aplica a todas las plantillas de {anioAcademico}.
          </span>
          <button
            type="button"
            onClick={() => setCorrigiendo(true)}
            className="flex items-center gap-1 text-[0.7rem] font-semibold text-primary hover:underline shrink-0"
          >
            <Pencil className="w-3 h-3" />
            Corregir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <TextField
        label={`Lema oficial del año ${anioAcademico}`}
        required
        value={lema}
        onChange={onChange}
        placeholder="Año de..."
      />
      <span className="text-[0.7rem] text-text-muted">
        {estado.modo === 'correccion'
          ? `Corregir cambia el encabezado de todas las fichas de ${anioAcademico}.`
          : `Texto exacto del decreto supremo. Se aplica a todas las plantillas de ${anioAcademico}.`}
      </span>
    </div>
  );
};
