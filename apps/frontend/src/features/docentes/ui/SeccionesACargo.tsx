import { useState } from 'react';
import { Plus, Trash2, GraduationCap, AlertCircle } from 'lucide-react';
import { SectionCard, SelectField, TextField } from '@shared/ui/form-controls';
import { Button } from '@shared/ui/button';
import { agregarSeccion, gradosDelNivel, type SeccionACargo } from '../lib/grados-y-secciones';

/**
 * Los grados y secciones que tiene a cargo un docente de aula.
 *
 * Eran sesenta líneas dentro de `DocenteFormBase`, con dos estados propios y un
 * manejador que rechazaba en silencio: sección de más de una letra, grado
 * vacío o duplicado salían todos por el mismo `return` mudo.
 */

interface Props {
  nivel: string;
  secciones: SeccionACargo[];
  onCambiar: (secciones: SeccionACargo[]) => void;
}

export const SeccionesACargo = ({ nivel, secciones, onCambiar }: Props) => {
  const grados = gradosDelNivel(nivel);

  // El grado se reinicia con el nivel, ajustándolo durante el render en vez de
  // en un efecto con `setTimeout`, que es como estaba.
  const [nivelSembrado, setNivelSembrado] = useState(nivel);
  const [grado, setGrado] = useState(() => grados[0] ?? '');
  const [letra, setLetra] = useState('');
  const [motivo, setMotivo] = useState<string | null>(null);

  if (nivelSembrado !== nivel) {
    setNivelSembrado(nivel);
    setGrado(grados[0] ?? '');
    setMotivo(null);
  }

  const anadir = () => {
    const resultado = agregarSeccion(secciones, grado, letra);

    if (!resultado.ok) {
      setMotivo(resultado.motivo ?? null);
      return;
    }

    setMotivo(null);
    onCambiar(resultado.secciones ?? secciones);
    setLetra('');
  };

  const quitar = (id?: string) => {
    if (!id) return;
    onCambiar(secciones.filter((s) => s.id !== id));
  };

  return (
    <SectionCard icon={<GraduationCap className="w-5 h-5" />} title="Grados y Secciones Asignadas">
      <div className="flex flex-col md:flex-row gap-3 items-end max-w-md mb-2">
        <div className="w-full md:w-1/2">
          <SelectField
            label="Grado"
            value={grado}
            onChange={(v) => {
              setGrado(v);
              setMotivo(null);
            }}
            options={grados.map((g) => ({ value: g, label: g }))}
            placeholder="Seleccione Grado"
          />
        </div>
        <div className="w-full md:w-1/3">
          <TextField
            label="Sección"
            value={letra}
            onChange={(v) => {
              setLetra(v.slice(0, 1));
              setMotivo(null);
            }}
            placeholder="Ej. A"
          />
        </div>
        <Button
          type="button"
          onClick={anadir}
          className="flex items-center justify-center gap-1.5 h-9 font-semibold bg-primary text-white hover:bg-primary-hover px-4 rounded-lg cursor-pointer w-full md:w-auto"
        >
          <Plus className="w-4 h-4" />
          Añadir
        </Button>
      </div>

      {motivo && (
        <div className="flex items-center gap-1.5 text-xs text-destructive font-medium mb-3">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {motivo}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-2">
        {secciones.map((seccion) => (
          <div
            key={seccion.id}
            className="flex items-center gap-2 bg-muted/50 border border-border px-3 py-1.5 rounded-xl text-sm font-medium text-text"
          >
            <span>
              {seccion.grado} &laquo;{seccion.seccion}&raquo;
            </span>
            <button
              type="button"
              onClick={() => quitar(seccion.id)}
              aria-label={`Quitar ${seccion.grado} ${seccion.seccion}`}
              className="text-text-muted hover:text-destructive transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {secciones.length === 0 && (
          <span className="text-xs text-text-muted italic">
            No se han asignado grados ni secciones aún.
          </span>
        )}
      </div>
    </SectionCard>
  );
};
