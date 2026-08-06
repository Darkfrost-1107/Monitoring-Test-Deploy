import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Eye,
  Trash2,
  Calendar,
  List,
  BarChart3,
  FileText,
  RefreshCw,
  Copy,
  Edit,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@shared/ui/button';
import { ConfirmModal } from '@shared/ui/ConfirmModal';
import { Card } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';
import { Spinner } from '@shared/ui/Spinner';
import { SelectField } from '@shared/ui/form-controls';
import { type Plantilla } from '@entities/model-plantillas';
import { useUser } from '@entities/model-user';
import { useScope } from '@shared/auth';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';
import {
  usePlantillasList,
  useCambiarEstadoPlantilla,
  useEliminarPlantilla,
  useDuplicarPlantilla,
  useCountFichasPlantilla,
} from '@entities/model-plantillas/use-plantillas-api';
import { PlantillaPreviewModal } from './PlantillaPreviewModal';

const TIPO_OPTIONS = [
  { value: 'Todos', label: 'Todos los tipos' },
  { value: 'Monitoreo Docente', label: 'Monitoreo Docente' },
  { value: 'Monitoreo Directivo', label: 'Monitoreo Directivo' },
];

const ESTADO_OPTIONS = [
  { value: 'Todos', label: 'Todos los estados' },
  { value: 'Vigente', label: 'Vigente' },
  { value: 'Borrador', label: 'Borrador' },
  { value: 'Historico', label: 'Histórico' },
];

interface PlantillasCatalogProps {
  institucionId?: string;
}

export const PlantillasCatalog = ({ institucionId }: PlantillasCatalogProps = {}) => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { isInstitution, isMonitorCampo } = useScope();
  const isDirector = user?.role === RoleCode.DIRECTOR_INSTITUCION;

  const { data: plantillas = [], isLoading, isError, error, refetch } = usePlantillasList({ institucionId });
  const cambiarEstado = useCambiarEstadoPlantilla();
  const eliminar = useEliminarPlantilla();
  const duplicar = useDuplicarPlantilla();

  const [searchParams] = useSearchParams();
  const filtroUrl = searchParams.get('filtro');

  const visiblePlantillas = useMemo(() => {
    let result = plantillas;

    if (institucionId) {
      result = result.filter((p) => p.ieId === institucionId);
    } else if (isDirector) {
      result = result.filter(
        (p) =>
          !p.creadoPorRole ||
          p.creadoPorRole === 'jefe_gestion' ||
          (p.creadoPorRole === 'director_ie' && p.ieId === user?.institucion),
      );
    } else if (user?.role === RoleCode.JEFE_GESTION) {
      result = plantillas;
      // Monitores de campo del lado de la institución: sólo ven la plantilla
      // de su propia I.E.
    } else if (isMonitorCampo && isInstitution) {
      result = result.filter(
        (p) => p.creadoPorRole === 'director_ie' && p.ieId === user?.institucion,
      );
    } else {
      result = result.filter((p) => !p.creadoPorRole || p.creadoPorRole === 'jefe_gestion');
    }

    if (filtroUrl === 'ugel') {
      result = result.filter(p => !p.creadoPorRole || p.creadoPorRole === 'jefe_gestion');
    } else if (filtroUrl === 'ie') {
      result = result.filter(p => p.creadoPorRole === 'director_ie');
    }

    return result;
  }, [plantillas, isDirector, isInstitution, isMonitorCampo, user, institucionId, filtroUrl]);

  const [searchText, setSearchText] = useState('');
  const [filterTipo, setFilterTipo] = useState('Todos');
  const [filterEstado, setFilterEstado] = useState('Todos');
  const [filterAnio, setFilterAnio] = useState('Todos');

  const [previewTemplate, setPreviewTemplate] = useState<Plantilla | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const [duplicateTemplate, setDuplicateTemplate] = useState<Plantilla | null>(null);
  const [duplicateYear, setDuplicateYear] = useState<number>(new Date().getFullYear());
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);

  const [statusTemplate, setStatusTemplate] = useState<Plantilla | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const { data: deleteInfo, isLoading: isLoadingDeleteInfo } = useCountFichasPlantilla(deleteTemplateId);

  const deleteTarget = useMemo(
    () => (deleteTemplateId ? plantillas.find((p) => p.id === deleteTemplateId) ?? null : null),
    [deleteTemplateId, plantillas],
  );

  const isDeleteDestructive =
    deleteTarget?.estado === 'Historico' && (deleteInfo?.count ?? 0) > 0;

  const aniosDisponibles = useMemo(() => {
    const years = new Set(visiblePlantillas.map((p) => p.anioAcademico));
    return Array.from(years).sort((a, b) => b - a);
  }, [visiblePlantillas]);

  const filteredPlantillas = useMemo(() => {
    return visiblePlantillas.filter((p) => {
      if (
        searchText &&
        !p.tipoMonitoreo.toLowerCase().includes(searchText.toLowerCase()) &&
        !p.descripcion.toLowerCase().includes(searchText.toLowerCase()) &&
        !(p.institucionNombre || '').toLowerCase().includes(searchText.toLowerCase())
      ) {
        return false;
      }
      if (filterTipo !== 'Todos' && p.tipoMonitoreo !== filterTipo) {
        return false;
      }
      if (filterEstado !== 'Todos' && p.estado !== filterEstado) {
        return false;
      }
      if (filterAnio !== 'Todos' && p.anioAcademico !== Number(filterAnio)) {
        return false;
      }
      return true;
    });
  }, [visiblePlantillas, searchText, filterTipo, filterEstado, filterAnio]);

  const handleClearFilters = () => {
    setSearchText('');
    setFilterTipo('Todos');
    setFilterEstado('Todos');
    setFilterAnio('Todos');
  };

  const isAnyFilterActive =
    searchText !== '' || filterTipo !== 'Todos' || filterEstado !== 'Todos' || filterAnio !== 'Todos';

  const handleDeleteConfirm = async () => {
    if (!deleteTemplateId) return;
    setDeleteError(null);
    setDeleteSuccess(null);
    try {
      const result = await eliminar.mutateAsync(deleteTemplateId);
      setDeleteSuccess(
        `Plantilla eliminada. Fichas removidas: ${result.deletedFichas}. Evidencias removidas: ${result.deletedEvidencias}.`,
      );
      setDeleteTemplateId(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar la plantilla.';
      setDeleteError(msg);
    }
  };

  const handleDuplicateClick = (plantilla: Plantilla) => {
    if (!user) return;
    setDuplicateTemplate(plantilla);
    setDuplicateYear(new Date().getFullYear());
    setDuplicateError(null);
  };

  const handleDuplicateConfirm = async () => {
    if (!duplicateTemplate) return;
    setDuplicateError(null);
    try {
      await duplicar.mutateAsync({ 
        id: duplicateTemplate.id,
        anioAcademico: duplicateYear
      });
      setDuplicateTemplate(null);
      setGlobalSuccess(`Plantilla duplicada para el año ${duplicateYear}`);
      setGlobalError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al duplicar la plantilla.';
      setDuplicateError(msg);
    }
  };

  const handleToggleEstadoClick = (plantilla: Plantilla) => {
    setStatusTemplate(plantilla);
    setStatusError(null);
  };

  const handleToggleEstadoConfirm = async () => {
    if (!statusTemplate) return;
    
    const nextEstado: Plantilla['estado'] =
      statusTemplate.estado === 'Borrador'
        ? 'Vigente'
        : statusTemplate.estado === 'Vigente'
          ? 'Historico'
          : 'Borrador';
    
    setStatusError(null);
    setGlobalError(null);
    setGlobalSuccess(null);
    
    try {
      await cambiarEstado.mutateAsync({ id: statusTemplate.id, estado: nextEstado });
      setGlobalSuccess(`Estado cambiado a ${nextEstado}`);
      setStatusTemplate(null);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Error al cambiar el estado.');
    }
  };

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      const [y, m, d] = dateStr.split('-');
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col w-full gap-6 animate-in fade-in duration-300">
      <Card className="p-4 border border-border bg-surface shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Buscar Plantilla
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por tipo, descripción..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary focus:bg-surface transition-all shadow-inner"
              />
            </div>
          </div>

          {!institucionId && !isDirector && (
            <div className="w-full md:w-60">
              <SelectField
                label="Tipo de Ficha"
                value={filterTipo}
                onChange={(val) => setFilterTipo(val)}
                placeholder="Todos los tipos"
                options={TIPO_OPTIONS}
              />
            </div>
          )}

          <div className="w-full md:w-44">
            <SelectField
              label="Estado"
              value={filterEstado}
              onChange={(val) => setFilterEstado(val)}
              placeholder="Todos los estados"
              options={ESTADO_OPTIONS}
            />
          </div>

          <div className="w-full md:w-36">
            <SelectField
              label="Año Académico"
              value={filterAnio}
              onChange={(val) => setFilterAnio(val)}
              placeholder="Todos los años"
              options={[
                { value: 'Todos', label: 'Todos los años' },
                ...aniosDisponibles.map((y) => ({ value: String(y), label: String(y) })),
              ]}
            />
          </div>

          {isAnyFilterActive && (
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="text-xs font-semibold text-primary border-slate-200 hover:bg-slate-50 h-10 w-full md:w-auto cursor-pointer"
            >
              Limpiar
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => refetch()}
            className="text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50 h-10 w-full md:w-auto cursor-pointer"
            title="Recargar plantillas"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Recargar
          </Button>
        </div>
      </Card>

      {isError && (
        <div className="text-center py-12 border border-rose-200 rounded-2xl bg-rose-50/50">
          <p className="text-rose-700 font-semibold text-sm">
            No se pudieron cargar las plantillas: {error instanceof Error ? error.message : 'Error desconocido'}
          </p>
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="mt-3 text-xs"
          >
            Reintentar
          </Button>
        </div>
      )}

      {globalError && (
        <div className="p-4 border border-rose-200 rounded-lg bg-rose-50 mb-4 flex justify-between items-start">
          <p className="text-rose-700 text-sm font-semibold">{globalError}</p>
          <button onClick={() => setGlobalError(null)} className="text-rose-500 hover:text-rose-700">✕</button>
        </div>
      )}

      {globalSuccess && (
        <div className="p-4 border border-emerald-200 rounded-lg bg-emerald-50 mb-4 flex justify-between items-start">
          <p className="text-emerald-700 text-sm font-semibold">{globalSuccess}</p>
          <button onClick={() => setGlobalSuccess(null)} className="text-emerald-500 hover:text-emerald-700">✕</button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner />
          <span className="ml-3 text-sm text-text-muted">Cargando plantillas...</span>
        </div>
      ) : !isError && filteredPlantillas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {!!duplicateTemplate && (
            <ConfirmModal
              title="Clonar Plantilla"
              confirmLabel="Clonar"
              cancelLabel="Cancelar"
              onConfirm={handleDuplicateConfirm}
              onCancel={() => setDuplicateTemplate(null)}
              danger={false}
              message={
                <div className="space-y-4 text-left">
                  <p className="text-sm text-gray-600">
                    Se creará una copia en estado <strong className="text-gray-900">Borrador</strong> de la plantilla seleccionada.
                  </p>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-700">Año Académico Destino</label>
                    <input
                      type="number"
                      min="2000"
                      max="2100"
                      value={duplicateYear}
                      onChange={(e) => setDuplicateYear(Number(e.target.value))}
                      className="px-3 py-2 border rounded-md"
                    />
                  </div>
                  {duplicateError && (
                    <div className="text-sm text-red-600 font-semibold bg-red-50 p-2 rounded-md">
                      Error: {duplicateError}
                    </div>
                  )}
                </div>
              }
            />
          )}

          {!!statusTemplate && (
            <ConfirmModal
              title="Confirmar Cambio de Estado"
              confirmLabel="Cambiar Estado"
              cancelLabel="Cancelar"
              onConfirm={handleToggleEstadoConfirm}
              onCancel={() => setStatusTemplate(null)}
              danger={false}
              message={
                <div className="space-y-4 text-left">
                  <p className="text-sm text-slate-600">
                    ¿Estás seguro de que deseas cambiar el estado de la plantilla{' '}
                    <strong>{statusTemplate.descripcion}</strong> de{' '}
                    <strong>{statusTemplate.estado}</strong> a{' '}
                    <strong>
                      {statusTemplate.estado === 'Borrador'
                        ? 'Vigente'
                        : statusTemplate.estado === 'Vigente'
                          ? 'Historico'
                          : 'Borrador'}
                    </strong>?
                  </p>
                  {statusTemplate.estado === 'Vigente' && (
                    <p className="text-xs text-rose-600 font-medium">
                      Nota: Al pasar a Histórico, esta plantilla no podrá volver a ser Vigente.
                    </p>
                  )}
                  {statusError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                      <p className="text-xs text-rose-700 font-semibold">
                        Error: {statusError}
                      </p>
                    </div>
                  )}
                </div>
              }
            />
          )}

          {filteredPlantillas.map((plantilla) => {
            const isDocente = plantilla.tipoMonitoreo === 'Monitoreo Docente';
            const isGeneral = !plantilla.creadoPorRole || plantilla.creadoPorRole === 'jefe_gestion';

            // Personal del lado de la institución educativa.
            const isSchoolStaffUser = isInstitution;

            const canManage = isSchoolStaffUser
              ? (user?.role === RoleCode.DIRECTOR_INSTITUCION && plantilla.creadoPorRole === 'director_ie' && plantilla.ieId === user?.institucion) ||
                (plantilla.creadoPorId === user?.id && plantilla.ieId === user?.institucion)
              : isGeneral;

            const canCloneDirector =
              isMonitorCampo &&
              isInstitution &&
              plantilla.creadoPorRole === 'director_ie' &&
              plantilla.ieId === user?.institucion &&
              plantilla.creadoPorId !== user?.id;

            return (
              <Card
                key={plantilla.id}
                className="bg-surface border border-border rounded-2xl p-5 hover:shadow-md transition-all duration-300 flex flex-col gap-5 group relative h-full"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 border-slate-200 text-slate-600 bg-slate-50">
                        Año {plantilla.anioAcademico}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-bold px-2 py-0.5 border shadow-sm line-clamp-1 break-all max-w-[180px] leading-tight ${
                          isGeneral
                            ? 'bg-slate-50 text-slate-600 border-slate-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}
                        title={isGeneral ? 'UGEL' : plantilla.institucionNombre || 'Mi I.E.'}
                      >
                        {isGeneral ? 'UGEL' : plantilla.institucionNombre || 'Mi I.E.'}
                      </Badge>
                    </div>
                    <Badge
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border shadow-sm ${
                        plantilla.estado === 'Vigente'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : plantilla.estado === 'Borrador'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {plantilla.estado}
                    </Badge>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-800 tracking-tight leading-snug group-hover:text-primary transition-colors">
                    {plantilla.tipoMonitoreo} {plantilla.anioAcademico}
                  </h3>

                  <div className="inline-flex">
                    <span className="text-[9px] font-black tracking-wide uppercase px-2 py-0.5 rounded border bg-primary-light border-primary/10 text-primary">
                      {isDocente ? 'Ficha Docente' : 'Ficha Directiva'}
                    </span>
                  </div>

                  <p className="text-xs text-text-muted leading-relaxed line-clamp-3 pt-1">
                    {plantilla.descripcion}
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-3.5 space-y-2 text-[11px] text-slate-500 font-semibold">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <span>Registrada:</span>
                    </span>
                    <span className="text-slate-800">{formatShortDate(plantilla.fechaCreacion)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <List className="h-3.5 w-3.5 text-primary" />
                      <span>Desempeños / Criterios:</span>
                    </span>
                    <span className="text-slate-800 font-bold">{plantilla.desempenos.length} evaluados</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <BarChart3 className="h-3.5 w-3.5 text-primary" />
                      <span>Calificación:</span>
                    </span>
                    <span className="text-slate-800">
                      Baremo {plantilla.baremo} ({plantilla.baremo === 'Vigente' ? '0-20' : '%'})
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Button
                    onClick={() => setPreviewTemplate(plantilla)}
                    className="w-full justify-center bg-primary hover:bg-primary-hover text-white font-bold text-xs py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Ver Estructura</span>
                  </Button>

                  {isDirector && isGeneral ? (
                    <button
                      onClick={() => handleDuplicateClick(plantilla)}
                      disabled={duplicar.isPending}
                      className="w-full justify-center border border-dashed border-primary text-primary hover:bg-primary-light text-[10px] font-extrabold uppercase py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      title="Copiar y personalizar para mi I.E."
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copiar para mi I.E.</span>
                    </button>
                  ) : (
                    <>
                      {canManage && (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => navigate(`/plantillas/${plantilla.id}/editar`)}
                            className="w-full justify-center border border-slate-200 text-slate-600 hover:bg-slate-50 text-[10px] font-extrabold uppercase py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Modificar contenido"
                          >
                            <Edit className="h-3.5 w-3.5 text-primary" />
                            <span>Modificar Plantilla</span>
                          </button>
                          
                          <button
                            onClick={() => handleDuplicateClick(plantilla)}
                            disabled={duplicar.isPending}
                            className="w-full justify-center border border-slate-200 text-slate-600 hover:bg-slate-50 text-[10px] font-extrabold uppercase py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                            title="Duplicar plantilla"
                          >
                            <Copy className="h-3.5 w-3.5 text-primary" />
                            <span>Clonar Plantilla</span>
                          </button>

                          {plantilla.estado !== 'Historico' && (
                            <button
                              onClick={() => handleToggleEstadoClick(plantilla)}
                              disabled={cambiarEstado.isPending}
                              className="w-full justify-center border border-slate-200 text-slate-600 hover:bg-slate-50 text-[10px] font-extrabold uppercase py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                              title="Cambiar Estado"
                            >
                              <AlertCircle className="h-3.5 w-3.5 text-primary" />
                              <span>Cambiar Estado</span>
                            </button>
                          )}

                          <button
                            onClick={() => setDeleteTemplateId(plantilla.id)}
                            className="w-full justify-center border border-rose-100 text-rose-600 hover:bg-rose-50 text-[10px] font-extrabold uppercase py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Eliminar Plantilla"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Eliminar Plantilla</span>
                          </button>
                        </div>
                      )}
                      
                      {!canManage && canCloneDirector && (
                        <button
                          onClick={() => handleDuplicateClick(plantilla)}
                          disabled={duplicar.isPending}
                          className="w-full justify-center border border-dashed border-primary text-primary hover:bg-primary-light text-[10px] font-extrabold uppercase py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                          title="Clonar plantilla del director"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span>Clonar Plantilla del Director</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        !isError && (
          <div className="text-center py-24 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <FileText className="h-14 w-14 text-slate-300 mx-auto stroke-1 mb-4" />
            <h3 className="text-slate-700 font-bold text-base">No se encontraron plantillas</h3>
            <p className="text-text-muted text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
              No existen plantillas de monitoreo que coincidan con los filtros seleccionados en este momento. Intente modificando los parámetros.
            </p>
          </div>
        )
      )}

      {previewTemplate && (
        <PlantillaPreviewModal
          plantilla={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      )}

      {deleteSuccess && (
        <div className="border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl p-3 animate-in fade-in">
          {deleteSuccess}
        </div>
      )}

      {deleteTemplateId && (
        <ConfirmModal
          title={
            isDeleteDestructive
              ? 'Eliminar plantilla histórica y todos sus monitoreos'
              : 'Eliminar plantilla de monitoreo'
          }
          message={
            <div className="text-xs text-slate-600 leading-relaxed block space-y-2">
              {isLoadingDeleteInfo ? (
                <p>Cargando información de monitoreos asociados...</p>
              ) : isDeleteDestructive ? (
                <>
                  <p>
                    La plantilla <strong>{deleteTarget?.tipoMonitoreo} {deleteTarget?.anioAcademico}</strong> está en estado{' '}
                    <strong>Histórico</strong> y tiene <strong>{deleteInfo?.count}</strong> ficha(s) de monitoreo asociada(s).
                  </p>
                  <p>
                    Al confirmar, se eliminarán <strong>permanentemente</strong>:
                  </p>
                  <ul className="list-disc list-inside pl-2 text-slate-700">
                    <li>La plantilla de monitoreo</li>
                    <li>{deleteInfo?.count} ficha(s) de monitoreo y todas sus respuestas (desempeños, aspectos, ejes/items)</li>
                    <li>Los archivos de evidencia asociados</li>
                  </ul>
                  <p className="text-rose-600 font-semibold pt-1">
                    Esta acción no se puede deshacer.
                  </p>
                </>
              ) : (
                <p>
                  Esta acción eliminará de forma lógica la plantilla seleccionada del catálogo. No se podrán programar nuevos
                  monitoreos asociados a esta ficha.
                </p>
              )}
              {deleteError && (
                <p className="text-rose-600 font-semibold">{deleteError}</p>
              )}
            </div>
          }
          confirmLabel={
            eliminar.isPending
              ? 'Eliminando...'
              : isDeleteDestructive
                ? 'Sí, eliminar todo'
                : 'Eliminar plantilla'
          }
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setDeleteTemplateId(null);
            setDeleteError(null);
          }}
          danger
        />
      )}
    </div>
  );
};
