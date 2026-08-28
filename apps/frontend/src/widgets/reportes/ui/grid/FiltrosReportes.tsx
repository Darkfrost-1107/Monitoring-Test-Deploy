import { Search, Filter, Calendar, Users, FileText, Building2, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { SelectField } from '@/shared/ui/form-controls';
import {
  FILTROS_PERIODO,
  type FiltroPeriodoTipo,
} from '@/features/reportes/lib/filtro-temporal';
import type { FiltroDeInstrumento } from '@/features/reportes/lib/instrumento';

const MODALIDADES = ['EBR', 'EBA', 'EBE', 'CEPTRO'];

const TODOS = 'Todos';

const FILTROS_TIPO = [
  { id: 'Todos', label: 'Todos' },
  { id: 'DOCENTE', label: 'Docente (Regular)' },
  { id: 'DOCENTE_EIB', label: 'Docente EIB' },
  { id: 'DIRECTIVO', label: 'Directivo' },
] as const;

/** Una rúbrica elegible: una plantilla concreta con su rótulo y cuántas fichas tiene. */
export interface OpcionPlantilla {
  id: string;
  label: string;
  /**
   * Detalle completo —nombre, autor, cargo, instrumento—, para el tooltip y la
   * línea que dice qué se está analizando.
   *
   * El rótulo de la píldora se recorta para que entre; sin este detalle, dos
   * fichas de nombre parecido se distinguirían sólo por adivinanza.
   */
  titulo?: string;
  conteo: number;
}

/** Las rúbricas partidas por origen: la oficial UGEL y las que crean las IE. */
export interface GruposDePlantilla {
  ugel: OpcionPlantilla[];
  institucional: OpcionPlantilla[];
}

interface BuscadorProps {
  etiqueta: string;
  marcador: string;
  valor: string;
  onCambiar: (valor: string) => void;
}

const Buscador = ({ etiqueta, marcador, valor, onCambiar }: BuscadorProps) => (
  <div className="space-y-1">
    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block pb-0.5">
      {etiqueta}
    </label>
    <div className="relative">
      <input
        type="text"
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        placeholder={marcador}
        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 text-xs leading-none h-9 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
      />
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
    </div>
  </div>
);

/** Una opción de un grupo segmentado; el conteo es opcional. */
interface OpcionSegmento {
  id: string;
  label: string;
  titulo?: string;
  conteo?: number;
}

/**
 * Grupo de selección única con estilo «segmented control»: los botones viven
 * unidos dentro de una cápsula gris y el activo se resalta. Se lee como una sola
 * decisión (a diferencia de píldoras sueltas), y su rótulo va arriba.
 */
const GrupoSegmentado = ({
  etiqueta,
  icono,
  opciones,
  seleccionada,
  onSeleccionar,
}: {
  etiqueta: string;
  icono: import('react').ReactNode;
  opciones: OpcionSegmento[];
  seleccionada?: string;
  onSeleccionar?: (id: string) => void;
}) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1 px-0.5">
      {icono} {etiqueta}
    </span>
    <div className="inline-flex flex-wrap items-center gap-0.5 rounded-xl bg-slate-100 p-1 border border-slate-200 w-fit">
      {opciones.map((o) => {
        const activo = seleccionada === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onSeleccionar?.(o.id)}
            title={o.titulo}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activo
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
            }`}
          >
            {/* El nombre que le puso su autor puede ser largo: se recorta acá y
                el detalle completo vive en el tooltip y en la línea de abajo. */}
            <span className="truncate max-w-[16rem]">{o.label}</span>
            {o.conteo !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activo ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {o.conteo}
              </span>
            )}
          </button>
        );
      })}
    </div>
  </div>
);

interface FiltrosReportesProps {
  /** Búsqueda por texto (opcional). Si no se pasa `setSearchQuery`, no se muestra. */
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  filterModalidad: string;
  setFilterModalidad: (m: string) => void;
  filterNivel: string;
  setFilterNivel: (n: string) => void;
  filterAnio: string;
  setFilterAnio: (a: string) => void;
  filterTipo?: FiltroDeInstrumento;
  setFilterTipo?: (tipo: FiltroDeInstrumento) => void;
  conteosTipo?: Record<string, number>;
  filtroPeriodo: FiltroPeriodoTipo;
  setFiltroPeriodo: (p: FiltroPeriodoTipo) => void;
  conteosPeriodo?: Record<FiltroPeriodoTipo, number>;
  nivelesDisponibles: string[];
  /**
   * Instituciones para filtrar (opcional). Cuando se pasan, se muestra el
   * selector de Institución, que cascadea con modalidad/nivel: cada nivel y cada
   * institución tienen sus propios docentes.
   */
  filterInstitucion?: string;
  setFilterInstitucion?: (id: string) => void;
  institucionesDisponibles?: { id: string; nombre: string }[];
  /**
   * Rúbricas elegibles agrupadas por origen (opcional). Reemplaza a las píldoras
   * de Tipo: el análisis por criterio sólo es coherente dentro de una misma
   * plantilla, así que se elige una —oficial UGEL o institucional— y nunca se
   * mezclan. Sin «Todas», a propósito.
   */
  gruposDePlantilla?: GruposDePlantilla;
  plantillaSeleccionada?: string;
  onSeleccionarPlantilla?: (id: string) => void;
  /**
   * Por qué no hay rúbricas institucionales, cuando no las hay.
   *
   * Antes se dibujaban tres píldoras en cero —una por cargo— aunque la
   * institución no tuviera ninguna ficha propia. Prometían una estructura que no
   * existe. Una frase que diga qué falta es más honesta y además accionable.
   */
  avisoInstitucional?: string;
  /** Docentes para filtrar (opcional). Cascadea con institución/nivel/modalidad. */
  filterDocente?: string;
  setFilterDocente?: (id: string) => void;
  docentesDisponibles?: { id: string; nombre: string }[];
  /** Nº de monitoreo (1er, 2do, …) opcional. Se muestra si se pasa el setter. */
  filterNumeroVisita?: string;
  setFilterNumeroVisita?: (n: string) => void;
  numerosDeVisitaDisponibles?: number[];
  añosDisponibles: string[];
  isAnyFilterActive: boolean;
  handleClearFilters: () => void;
  /**
   * Si el filtro de año admite «Todos los años».
   *
   * El Análisis de Desempeño exige elegir uno: sus criterios cambian de un año
   * a otro, de modo que agregarlos pone criterios distintos en el mismo eje.
   */
  permitirTodosLosAnios?: boolean;
  /**
   * Si el filtro de Tipo admite «Todos». El Análisis de Desempeño no lo permite:
   * mezclar instrumentos pone rúbricas con distinta cantidad de criterios en el
   * mismo eje. Los reportes que son listas sí lo permiten (default).
   */
  permitirTipoTodos?: boolean;
  /**
   * Fija el ámbito Modalidad/Nivel/Institución. El director de institución mira
   * siempre su propio colegio: esos tres no varían para él, así que llegan
   * precargados y bloqueados y sólo mueve el docente (y período/tipo/año).
   */
  bloquearAmbito?: boolean;
  /** El docente evaluado ve una versión reducida: sólo búsqueda y año. */
  isEvaluatedView: boolean;
}

/**
 * Ámbito fijo (Modalidad · Nivel · Institución) mostrado como contexto de sólo
 * lectura, no como selects deshabilitados: el personal de una I.E. siempre mira
 * su propio colegio, y tres dropdowns grises parecen rotos en vez de fijos.
 */
const ContextoDeAmbito = ({ modalidad, nivel, institucion }: { modalidad: string; nivel: string; institucion: string }) => {
  const partes = [institucion, nivel, modalidad].filter((p) => p && p !== TODOS);
  if (partes.length === 0) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/5 px-3.5 py-2.5">
      <Building2 className="h-4 w-4 text-primary shrink-0" />
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0">
        Ámbito:
      </span>
      <span className="text-xs font-bold text-slate-700 truncate">{partes.join('  ·  ')}</span>
    </div>
  );
};

export const FiltrosReportes = ({
  searchQuery,
  setSearchQuery,
  filterModalidad,
  setFilterModalidad,
  filterNivel,
  setFilterNivel,
  filterAnio,
  setFilterAnio,
  filterTipo,
  setFilterTipo,
  conteosTipo,
  filtroPeriodo,
  setFiltroPeriodo,
  conteosPeriodo,
  nivelesDisponibles,
  filterInstitucion,
  setFilterInstitucion,
  institucionesDisponibles = [],
  gruposDePlantilla,
  plantillaSeleccionada,
  onSeleccionarPlantilla,
  avisoInstitucional,
  filterDocente,
  setFilterDocente,
  docentesDisponibles = [],
  filterNumeroVisita,
  setFilterNumeroVisita,
  numerosDeVisitaDisponibles = [],
  añosDisponibles,
  isAnyFilterActive,
  handleClearFilters,
  isEvaluatedView,
  permitirTodosLosAnios = true,
  permitirTipoTodos = true,
  bloquearAmbito = false,
}: FiltrosReportesProps) => {
  /** La rúbrica que está produciendo los números de la pantalla. */
  const rubricaEnUso = gruposDePlantilla
    ? [...gruposDePlantilla.ugel, ...gruposDePlantilla.institucional].find(
        (o) => o.id === plantillaSeleccionada,
      )
    : undefined;

  const opcionesDeTipo = permitirTipoTodos
    ? FILTROS_TIPO
    : FILTROS_TIPO.filter((t) => t.id !== 'Todos');

  const selectorDeAnio = (
    <SelectField
      label="Año"
      value={filterAnio}
      onChange={setFilterAnio}
      placeholder={permitirTodosLosAnios ? 'Todos los años' : 'Seleccione un año'}
      options={[
        ...(permitirTodosLosAnios ? [{ value: TODOS, label: 'Todos los años' }] : []),
        ...añosDisponibles.map((a) => ({ value: a, label: a })),
      ]}
    />
  );

  return (
    <Card className="p-5 border border-border bg-surface shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
          <Filter className="h-4 w-4 text-primary" />
          <span>Filtros de Reporte</span>
        </div>
        {isAnyFilterActive && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            className="text-xs text-primary hover:text-primary-hover h-8 px-3 rounded-lg cursor-pointer"
          >
            Limpiar Filtros
          </Button>
        )}
      </div>

      {/* Filtros rápidos como controles segmentados: Período (cuándo), y la
          rúbrica (qué se mide) en UGEL / Institucional. Cada grupo es una sola
          decisión, con su rótulo arriba. */}
      <div className="flex flex-wrap items-start gap-x-6 gap-y-4 pt-0.5">
        <GrupoSegmentado
          etiqueta="Período"
          icono={<Calendar className="w-3 h-3 text-primary" />}
          opciones={FILTROS_PERIODO.map((item) => ({
            id: item.id,
            label: item.label,
            conteo: conteosPeriodo ? conteosPeriodo[item.id] : undefined,
          }))}
          seleccionada={filtroPeriodo}
          onSeleccionar={(id) => setFiltroPeriodo(id as FiltroPeriodoTipo)}
        />

        {/* Tipo de instrumento: sólo en las vistas que no eligen plantilla
            concreta (Fichas Completadas). El Análisis usa UGEL/Institucional. */}
        {!isEvaluatedView && setFilterTipo && !gruposDePlantilla && (
          <GrupoSegmentado
            etiqueta="Tipo"
            icono={<Users className="w-3 h-3 text-primary" />}
            opciones={opcionesDeTipo.map((item) => ({
              id: item.id,
              label: item.label,
              conteo: conteosTipo ? conteosTipo[item.id] : undefined,
            }))}
            seleccionada={filterTipo || 'Todos'}
            onSeleccionar={(id) => setFilterTipo(id as FiltroDeInstrumento)}
          />
        )}

        {/* Rúbrica: UGEL (oficial) e Institucional (los clones de las IE). Se
            elige una y el análisis nunca mezcla rúbricas. */}
        {gruposDePlantilla && gruposDePlantilla.ugel.length > 0 && (
          <GrupoSegmentado
            etiqueta="Rúbrica · UGEL"
            icono={<FileText className="w-3 h-3 text-primary" />}
            opciones={gruposDePlantilla.ugel}
            seleccionada={plantillaSeleccionada}
            onSeleccionar={onSeleccionarPlantilla}
          />
        )}
        {gruposDePlantilla && gruposDePlantilla.institucional.length > 0 && (
          <GrupoSegmentado
            etiqueta="Rúbrica · Institucional"
            icono={<FileText className="w-3 h-3 text-primary" />}
            opciones={gruposDePlantilla.institucional}
            seleccionada={plantillaSeleccionada}
            onSeleccionar={onSeleccionarPlantilla}
          />
        )}

        {gruposDePlantilla && gruposDePlantilla.institucional.length === 0 && avisoInstitucional && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1 px-0.5">
              <FileText className="w-3 h-3 text-slate-300" /> Rúbrica · Institucional
            </span>
            <p className="text-[11px] text-slate-500 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 max-w-md leading-relaxed">
              {avisoInstitucional}
            </p>
          </div>
        )}
      </div>

      {/*
        Qué rúbrica están mirando, dicho con todas las letras.
        Todo lo que hay debajo —promedios, gráficos, focos— sale de UNA rúbrica,
        y cuál es se leía sólo por cuál píldora quedó resaltada. Con dos fichas
        de nombre parecido eso no alcanza: el número sale igual de convincente
        con la rúbrica equivocada.
      */}
      {rubricaEnUso && (
        <p className="text-[11px] text-slate-500 -mt-1">
          Analizando{' '}
          <strong className="text-slate-700 font-bold">
            {rubricaEnUso.titulo ?? rubricaEnUso.label}
          </strong>
          <span className="text-slate-400">
            {' '}
            · {rubricaEnUso.conteo}{' '}
            {rubricaEnUso.conteo === 1 ? 'ficha completada' : 'fichas completadas'}
          </span>
        </p>
      )}

      {isEvaluatedView ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Buscador
            etiqueta="Buscar por IE o Especialista"
            marcador="Nombre de la IE o del especialista..."
            valor={searchQuery ?? ''}
            onCambiar={setSearchQuery ?? (() => {})}
          />
          {selectorDeAnio}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Ámbito fijo del personal de I.E.: contexto de sólo lectura. */}
          {bloquearAmbito && (
            <ContextoDeAmbito
              modalidad={filterModalidad}
              nivel={filterNivel}
              institucion={
                institucionesDisponibles.find((i) => i.id === filterInstitucion)?.nombre ?? ''
              }
            />
          )}

          {/* Encabezado del bloque de refinamiento: separa «qué rúbrica / período»
              (arriba) de «afinar el recorte» (abajo). */}
          <div className="flex items-center gap-1.5 pt-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            <SlidersHorizontal className="h-3 w-3 text-primary" />
            Afinar resultados
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {setSearchQuery && (
              <Buscador
                etiqueta="Búsqueda Rápida"
                marcador="IE, especialista o docente..."
                valor={searchQuery ?? ''}
                onCambiar={setSearchQuery}
              />
            )}

            {/* Modalidad/Nivel/Institución sólo se editan cuando el ámbito no está
                fijo; si lo está, viven en la banda de contexto de arriba. */}
            {!bloquearAmbito && (
              <>
                <SelectField
                  label="Modalidad"
                  value={filterModalidad}
                  onChange={setFilterModalidad}
                  placeholder="Todas las modalidades"
                  options={[
                    { value: TODOS, label: 'Todas las modalidades' },
                    ...MODALIDADES.map((m) => ({ value: m, label: m })),
                  ]}
                />

                <SelectField
                  label="Nivel Educativo"
                  value={filterNivel}
                  onChange={setFilterNivel}
                  disabled={filterModalidad === TODOS}
                  placeholder="Todos los niveles"
                  options={[
                    { value: TODOS, label: 'Todos los niveles' },
                    ...nivelesDisponibles.map((n) => ({ value: n, label: n })),
                  ]}
                />

                {setFilterInstitucion && (
                  <SelectField
                    label="Institución Educativa"
                    value={filterInstitucion ?? TODOS}
                    onChange={setFilterInstitucion}
                    disabled={institucionesDisponibles.length === 0}
                    placeholder="Todas las instituciones"
                    options={[
                      { value: TODOS, label: 'Todas las instituciones' },
                      ...institucionesDisponibles.map((i) => ({ value: i.id, label: i.nombre })),
                    ]}
                  />
                )}
              </>
            )}

            {setFilterDocente && (
            <SelectField
              label="Docente"
              value={filterDocente ?? TODOS}
              onChange={setFilterDocente}
              disabled={docentesDisponibles.length === 0}
              placeholder="Todos los docentes"
              options={[
                { value: TODOS, label: 'Todos los docentes' },
                ...docentesDisponibles.map((d) => ({ value: d.id, label: d.nombre })),
              ]}
            />
          )}

          {setFilterNumeroVisita && (
            <SelectField
              label="Nº de Monitoreo"
              value={filterNumeroVisita ?? TODOS}
              onChange={setFilterNumeroVisita}
              disabled={numerosDeVisitaDisponibles.length === 0}
              placeholder="Todos"
              options={[
                { value: TODOS, label: 'Todos' },
                ...numerosDeVisitaDisponibles.map((n) => ({
                  value: String(n),
                  label: `${n}° monitoreo`,
                })),
              ]}
            />
          )}

            {selectorDeAnio}
          </div>
        </div>
      )}
    </Card>
  );
};
