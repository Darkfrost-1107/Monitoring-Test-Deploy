import { Search } from 'lucide-react';
import { ESTADOS_VISITA } from '@sistema-monitoreo/shared-contracts';
import { Card } from '@shared/ui/card';
import { SelectField, TextField } from '@shared/ui/form-controls';

/** Estado de los filtros del listado. */
export interface FiltrosListado {
  evaluador: string;
  docente: string;
  institucion: string;
  tipo: string;
  estado: string;
}

interface BarraFiltrosProps {
  filtros: FiltrosListado;
  onCambiar: <K extends keyof FiltrosListado>(campo: K, valor: string) => void;
  /** Instituciones presentes en los datos, para el selector. */
  instituciones: string[];
  /**
   * El director trabaja dentro de un solo colegio: no filtra por institución
   * —tendría una sola opción— y en cambio busca por docente evaluado.
   */
  esDirector: boolean;
}

const OPCIONES_TIPO = [
  { value: 'Todos', label: 'Todos los tipos' },
  { value: 'DOCENTE', label: 'DOCENTE' },
  { value: 'DIRECTIVO', label: 'DIRECTIVO' },
];

/** Derivadas del contrato: un estado nuevo aparece solo, sin tocar esta lista. */
const OPCIONES_ESTADO = [
  { value: 'Todos', label: 'Todos los estados' },
  ...ESTADOS_VISITA.map((estado) => ({ value: estado, label: estado })),
];

const LUPA = <Search className="w-[18px] h-[18px] text-text-muted" />;

/** Filtros del listado de cronogramas. */
export const BarraFiltros = ({
  filtros,
  onCambiar,
  instituciones,
  esDirector,
}: BarraFiltrosProps) => (
  <Card className="border border-border bg-surface shadow-sm rounded-2xl p-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {esDirector ? (
        <>
          <TextField
            label="Docente Evaluado"
            value={filtros.docente}
            onChange={(valor) => onCambiar('docente', valor)}
            placeholder="Buscar docente..."
            adornment={LUPA}
          />
          <TextField
            label="Evaluador"
            value={filtros.evaluador}
            onChange={(valor) => onCambiar('evaluador', valor)}
            placeholder="Buscar evaluador..."
            adornment={LUPA}
          />
        </>
      ) : (
        <>
          <TextField
            label="Especialista"
            value={filtros.evaluador}
            onChange={(valor) => onCambiar('evaluador', valor)}
            placeholder="Buscar especialista..."
            adornment={LUPA}
          />
          <SelectField
            label="Institución"
            value={filtros.institucion}
            onChange={(valor) => onCambiar('institucion', valor)}
            placeholder="Seleccionar institución..."
            options={[
              { value: 'Todos', label: 'Todas las instituciones' },
              ...instituciones.map((nombre) => ({ value: nombre, label: nombre })),
            ]}
          />
        </>
      )}

      <SelectField
        label="Tipo de Monitoreo"
        value={filtros.tipo}
        onChange={(valor) => onCambiar('tipo', valor)}
        placeholder="Seleccionar tipo..."
        options={OPCIONES_TIPO}
      />

      <SelectField
        label="Estado"
        value={filtros.estado}
        onChange={(valor) => onCambiar('estado', valor)}
        placeholder="Seleccionar estado..."
        options={OPCIONES_ESTADO}
      />
    </div>
  </Card>
);
