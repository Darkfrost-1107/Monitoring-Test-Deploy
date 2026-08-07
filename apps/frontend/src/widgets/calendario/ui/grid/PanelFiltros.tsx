import { Filter } from 'lucide-react';
import { ESTADOS_VISITA } from '@sistema-monitoreo/shared-contracts';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { SelectField } from '@/shared/ui/form-controls';
import { SIN_FILTRAR, type PerfilDeFiltrado } from '../../model/filtros';
import type { EstadoFiltrosCalendario } from '../../model/use-filtros-calendario';

/** Valores que el usuario elige de una lista fija, no derivada de los datos. */
const OPCIONES_TIPO = [
  { value: SIN_FILTRAR, label: 'Todos los tipos' },
  { value: 'DOCENTE', label: 'Monitoreo a Docentes' },
  { value: 'DIRECTIVO', label: 'Monitoreo a Directivos' },
];

const OPCIONES_NRO_VISITA = [
  { value: SIN_FILTRAR, label: 'Todos los números' },
  { value: '01', label: 'Monitoreo 01' },
  { value: '02', label: 'Monitoreo 02' },
  { value: '03', label: 'Monitoreo 03' },
  { value: '04', label: 'Monitoreo 04' },
];

/** Derivadas del contrato: un estado nuevo aparece solo, sin tocar esta lista. */
const OPCIONES_ESTADO = [
  { value: SIN_FILTRAR, label: 'Todos los estados' },
  ...ESTADOS_VISITA.map((estado) => ({ value: estado, label: estado })),
];

/** Listas que se derivan de las visitas cargadas, no de una constante. */
export interface OpcionesDeFiltro {
  especialistas: string[];
  modalidades: string[];
  niveles: string[];
}

interface PanelFiltrosProps {
  filtros: EstadoFiltrosCalendario;
  opciones: OpcionesDeFiltro;
  perfil: PerfilDeFiltrado;
  /**
   * Nombre a mostrar en lugar del selector de especialista, para quien sólo ve
   * sus propias visitas y por tanto no tiene nada que elegir.
   */
  especialistaFijo?: string;
}

/** Antepone la opción «todos» a una lista derivada de los datos. */
const conOpcionTodos = (valores: string[], etiquetaTodos: string) => [
  { value: SIN_FILTRAR, label: etiquetaTodos },
  ...valores.map((valor) => ({ value: valor, label: valor })),
];

/**
 * Filtros de búsqueda del calendario.
 *
 * Presentación pura sobre el estado de `useFiltrosCalendario`. Cada perfil ve
 * un juego distinto de controles: el director de institución trabaja dentro de
 * un solo colegio, donde modalidad y nivel no discriminan nada, y en cambio
 * necesita número de visita y estado. La UGEL cruza instituciones y es al revés.
 */
export const PanelFiltros = ({
  filtros,
  opciones,
  perfil,
  especialistaFijo,
}: PanelFiltrosProps) => {
  const { valores, cambiar } = filtros;

  const selectorTipo = (
    <SelectField
      label="Tipo de Monitoreo"
      value={valores.tipo}
      onChange={(val) => cambiar('tipo', val)}
      placeholder="Seleccione tipo"
      options={OPCIONES_TIPO}
    />
  );

  const selectorEspecialista = (
    <SelectField
      label="Especialista Responsable"
      value={valores.especialista}
      onChange={(val) => cambiar('especialista', val)}
      placeholder="Seleccione especialista"
      options={conOpcionTodos(opciones.especialistas, 'Todos los especialistas')}
    />
  );

  return (
    <Card className="p-5 border border-border bg-surface shadow-sm">
      <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
        <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
          <Filter className="h-4 w-4 text-primary" />
          <span>Filtros de Búsqueda</span>
        </div>
        {filtros.hayActivo && (
          <Button
            variant="outline"
            size="sm"
            onClick={filtros.limpiar}
            className="text-xs text-primary hover:text-primary-hover h-8 cursor-pointer"
          >
            Limpiar Filtros
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {perfil === 'director' ? (
          <>
            {selectorTipo}
            {selectorEspecialista}
            <SelectField
              label="Número de Monitoreo"
              value={valores.nroVisita}
              onChange={(val) => cambiar('nroVisita', val)}
              placeholder="Seleccione Nº de visita"
              options={OPCIONES_NRO_VISITA}
            />
            <SelectField
              label="Estado de Monitoreo"
              value={valores.estado}
              onChange={(val) => cambiar('estado', val)}
              placeholder="Seleccione estado"
              options={OPCIONES_ESTADO}
            />
          </>
        ) : (
          <>
            <SelectField
              label="Modalidad"
              value={valores.modalidad}
              onChange={(val) => cambiar('modalidad', val)}
              placeholder="Seleccione modalidad"
              options={conOpcionTodos(opciones.modalidades, 'Todas las modalidades')}
            />
            <SelectField
              label="Nivel Educativo"
              value={valores.nivel}
              onChange={(val) => cambiar('nivel', val)}
              placeholder="Seleccione nivel"
              options={conOpcionTodos(opciones.niveles, 'Todos los niveles')}
            />

            {especialistaFijo ? (
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block pb-0.5">
                  Especialista Asignado
                </label>
                <div className="bg-slate-50 border border-slate-200 text-slate-700 font-bold px-3 py-2.5 rounded-lg text-sm shadow-inner leading-none h-10 flex items-center">
                  {especialistaFijo}
                </div>
              </div>
            ) : (
              selectorEspecialista
            )}

            {selectorTipo}
          </>
        )}
      </div>
    </Card>
  );
};
