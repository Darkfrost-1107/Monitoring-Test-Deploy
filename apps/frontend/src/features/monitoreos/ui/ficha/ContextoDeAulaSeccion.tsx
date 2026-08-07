import { toast } from 'sonner';
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
  { clave: 'area', etiqueta: 'Área Curricular', ejemplo: 'Ej. Matemática' },
  { clave: 'grado', etiqueta: 'Grado', ejemplo: 'Ej. 1er Grado' },
  { clave: 'seccion', etiqueta: 'Sección', ejemplo: 'Ej. A' },
] as const;

const CLASES_CAMPO = 'w-full p-2 border border-slate-300 rounded-lg text-sm bg-white';

/** Dónde ocurrió el monitoreo: área, grado, sección y cuántos estudiantes había. */
export const ContextoDeAulaSeccion = ({
  contexto,
  onCambiar,
  sugerencias,
  soloLectura,
}: ContextoDeAulaSeccionProps) => {
  if (soloLectura) {
    return (
      <div className="px-6 py-3 bg-slate-50 border-b border-border text-xs font-bold text-slate-600 grid grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          Área: <span className="text-slate-800">{contexto.area || '-'}</span>
        </div>
        <div>
          Grado: <span className="text-slate-800">{contexto.grado || '-'}</span>
        </div>
        <div>
          Sección: <span className="text-slate-800">{contexto.seccion || '-'}</span>
        </div>
        <div>
          Estudiantes: <span className="text-slate-800">{contexto.alumnos || '-'}</span>
        </div>
        <div>
          Est. NEE: <span className="text-slate-800">{contexto.alumnosNee || '-'}</span>
        </div>
      </div>
    );
  }

  const hayaSugerencias = sugerencias.areas.length > 0 || sugerencias.secciones.length > 0;

  return (
    <div className="bg-slate-50 border-b border-border">
      <div className="px-6 pt-4 pb-2 text-sm grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
        {CAMPOS_DE_TEXTO.map(({ clave, etiqueta, ejemplo }) => (
          <div key={clave} className="space-y-1">
            <label className="text-xs font-bold text-slate-500">{etiqueta}</label>
            <input
              type="text"
              value={contexto[clave]}
              onChange={(e) => onCambiar(clave, e.target.value)}
              className={CLASES_CAMPO}
              placeholder={ejemplo}
            />
          </div>
        ))}

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500">Nro Estudiantes</label>
          <input
            type="number"
            min="0"
            max={MAXIMO_ESTUDIANTES}
            value={contexto.alumnos}
            onChange={(e) => {
              const valor = e.target.value ? Number(e.target.value) : '';
              // Por encima del tope se ignora la pulsación: el campo no cambia.
              if (valor !== '' && valor > MAXIMO_ESTUDIANTES) return;
              onCambiar('alumnos', valor);
            }}
            className={CLASES_CAMPO}
            placeholder="0"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500">Est. NEE (Opcional)</label>
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
        <div className="px-6 pb-3 pt-1 grid grid-cols-2 gap-x-6 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
          {sugerencias.areas.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-slate-500 font-semibold w-full">Área sugerida:</span>
              {sugerencias.areas.map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => {
                    onCambiar('area', area);
                    toast.success(`Se sugirió el área ${area}`);
                  }}
                  className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-200 text-emerald-700 font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  {area}
                </button>
              ))}
            </div>
          )}

          {sugerencias.secciones.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-slate-500 font-semibold w-full">Grado y Sección sugeridos:</span>
              {sugerencias.secciones.map((sec, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onCambiar('grado', sec.grado);
                    onCambiar('seccion', sec.seccion);
                    toast.success(`Se sugirió ${sec.grado} - Sección ${sec.seccion}`);
                  }}
                  className="px-2.5 py-1 rounded bg-primary-light hover:bg-primary-hover hover:text-white border border-primary/20 text-primary font-bold transition-all cursor-pointer shadow-sm active:scale-95"
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
