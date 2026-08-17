import { useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import type { SeccionDocente } from '@entities/model-docentes';
import type { ContextoDeAula } from '../../lib/estado-formulario';

/**
 * Tope de estudiantes por aula. Un valor mayor es casi siempre un error de
 * tipeo, y una cifra inflada distorsiona los reportes agregados.
 */
const MAXIMO_ESTUDIANTES = 50;

interface ContextoDeAulaSeccionProps {
  contexto: ContextoDeAula;
  onCambiar: <K extends keyof ContextoDeAula>(campo: K, valor: ContextoDeAula[K]) => void;
  /** Valores tomados de la ficha del docente, para completar de un toque. */
  sugerencias: { areas: string[]; secciones: SeccionDocente[] };
  /** Una ficha ya cerrada se muestra pero no se edita. */
  soloLectura: boolean;
}

const CAMPOS_DE_TEXTO = [
  { clave: 'area', etiqueta: 'Área Curricular', ejemplo: 'Ej. Comunicación' },
  { clave: 'grado', etiqueta: 'Grado', ejemplo: 'Ej. 2°' },
  { clave: 'seccion', etiqueta: 'Sección', ejemplo: 'Ej. A' },
] as const;

const CLASES_CAMPO =
  'w-full h-8 px-2.5 py-1 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary placeholder:text-slate-400 placeholder:font-normal';

/** Dónde ocurrió el monitoreo: área, grado, sección y cuántos estudiantes había. */
export const ContextoDeAulaSeccion = ({
  contexto,
  onCambiar,
  sugerencias,
  soloLectura,
}: ContextoDeAulaSeccionProps) => {
  const [estaPlegado, setEstaPlegado] = useState(false);

  if (soloLectura) {
    return (
      <div className="px-4 sm:px-6 py-1.5 bg-slate-50 border-b border-border/80 text-[11px] font-medium text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>Área: <strong className="text-slate-800 font-semibold">{contexto.area || '-'}</strong></span>
        <span>Grado: <strong className="text-slate-800 font-semibold">{contexto.grado || '-'}</strong></span>
        <span>Sección: <strong className="text-slate-800 font-semibold">{contexto.seccion || '-'}</strong></span>
        <span>Estudiantes: <strong className="text-slate-800 font-semibold">{contexto.alumnos || '-'}</strong></span>
        <span>Est. NEE: <strong className="text-slate-800 font-semibold">{contexto.alumnosNee || '-'}</strong></span>
      </div>
    );
  }

  const hayaSugerencias = sugerencias.areas.length > 0 || sugerencias.secciones.length > 0;

  if (estaPlegado) {
    return (
      <div className="px-4 sm:px-6 py-1.5 bg-white border-b border-border/80 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150">
        <div className="flex flex-wrap items-center gap-x-3 text-[11.5px] text-slate-600 font-medium truncate">
          <span className="font-bold text-primary">Contexto de Aula:</span>
          <span>Área: <strong className="text-slate-800">{contexto.area || '(No especificada)'}</strong></span>
          <span>•</span>
          <span>Grado y Sección: <strong className="text-slate-800">{contexto.grado || '-'} "{contexto.seccion || '-'}"</strong></span>
          <span>•</span>
          <span>Estudiantes: <strong className="text-slate-800">{contexto.alumnos || 0}</strong> {contexto.alumnosNee ? `(NEE: ${contexto.alumnosNee})` : ''}</span>
        </div>
        <button
          type="button"
          onClick={() => setEstaPlegado(false)}
          className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 shrink-0 px-2 py-0.5 rounded hover:bg-primary/5 cursor-pointer"
        >
          <Edit3 className="h-3 w-3" />
          <span>Editar Datos</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border-b border-border/80 px-4 sm:px-6 py-2 transition-all">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
          Datos de la Sesión Observada
        </span>
        <button
          type="button"
          onClick={() => setEstaPlegado(true)}
          className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-100 cursor-pointer"
          title="Plegar para ver más rúbricas"
        >
          <span>Plegar</span>
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 items-end">
        {CAMPOS_DE_TEXTO.map(({ clave, etiqueta, ejemplo }) => (
          <div key={clave} className="space-y-0.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block truncate">
              {etiqueta}
            </label>
            <input
              type="text"
              value={contexto[clave]}
              onChange={(e) => onCambiar(clave, e.target.value)}
              className={CLASES_CAMPO}
              placeholder={ejemplo}
            />
          </div>
        ))}

        <div className="space-y-0.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block truncate">
            N° Estudiantes
          </label>
          <input
            type="number"
            min="0"
            max={MAXIMO_ESTUDIANTES}
            value={contexto.alumnos}
            onChange={(e) => {
              const valor = e.target.value ? Number(e.target.value) : '';
              if (valor !== '' && valor > MAXIMO_ESTUDIANTES) return;
              onCambiar('alumnos', valor);
            }}
            className={CLASES_CAMPO}
            placeholder="0"
          />
        </div>

        <div className="space-y-0.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block truncate">
            Est. NEE (Opc.)
          </label>
          <input
            type="number"
            min="0"
            value={contexto.alumnosNee}
            onChange={(e) => onCambiar('alumnosNee', e.target.value ? Number(e.target.value) : '')}
            className={CLASES_CAMPO}
            placeholder="0"
          />
        </div>
      </div>

      {hayaSugerencias && (
        <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          {sugerencias.areas.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Sugerencias Área:</span>
              {sugerencias.areas.map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => {
                    onCambiar('area', area);
                    toast.success(`Se sugirió el área ${area}`);
                  }}
                  className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-200 text-emerald-700 font-bold transition-all cursor-pointer shadow-2xs text-[10.5px]"
                >
                  {area}
                </button>
              ))}
            </div>
          )}

          {sugerencias.secciones.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Grado/Sección:</span>
              {sugerencias.secciones.map((sec, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onCambiar('grado', sec.grado);
                    onCambiar('seccion', sec.seccion);
                    toast.success(`Se sugirió ${sec.grado} - Sección ${sec.seccion}`);
                  }}
                  className="px-2 py-0.5 rounded bg-primary/10 hover:bg-primary hover:text-white border border-primary/20 text-primary font-bold transition-all cursor-pointer shadow-2xs text-[10.5px]"
                >
                  {sec.grado} - {sec.seccion}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
