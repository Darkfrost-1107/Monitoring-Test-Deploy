import { useState, useEffect, useMemo } from 'react';
import { Compass, PlusCircle, Search, Eye, FileText, X, AlertCircle, LayoutGrid, List, RotateCcw, PowerOff, Trash2 } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { PageHeader } from '@shared/ui/pageHeader';
import { ConfirmModal } from '@shared/ui/ConfirmModal';
import { usePlanesMonitoreo } from '@features/planes-monitoreo/planes-monitoreo-service';
import { TextField, SelectField } from '@shared/ui/form-controls';
import { Card, CardContent } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';
import { useUser } from '@entities/model-user';
import { useScope } from '@shared/auth';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';
import { formatearFecha } from '@shared/lib/fecha/fecha';

// Años académicos generados dinámicamente desde el año actual en adelante,
// para no depender de una lista fija que quede desactualizada cada año nuevo.
const ANIO_ACTUAL = new Date().getFullYear();
const OPCIONES_ANIO = Array.from({ length: 5 }, (_, i) => ANIO_ACTUAL + i).map((a) => ({
  value: String(a),
  label: String(a),
}));

// Cargo del autor que subió el plan (a partir de rolAutorAlCrear).
const CARGO_AUTOR: Record<string, string> = {
  director_ie: 'Director de IE',
  coordinador_pedagogico: 'Coordinador Pedagógico',
  jefe_taller: 'Jefe de Taller',
  jefe_gestion: 'Jefe de Gestión',
};
const labelCargoAutor = (rol?: string): string | null => (rol ? (CARGO_AUTOR[rol] ?? rol) : null);

export const PlanMonitoreoAnualPage = () => {
  const { user } = useUser();
  // Personal del lado de la institución educativa: su plan por defecto es el de
  // la I.E., no el de la UGEL.
  const { isInstitution } = useScope();
  const isSchoolStaffUser = isInstitution;
  const isJefeGestion = user?.role === RoleCode.JEFE_GESTION;
  const defaultEntity = isSchoolStaffUser ? 'IE' : 'UGEL';

  const canEditPlan = (plan: { tipoEntidad: string }) => {
    if (isJefeGestion && plan.tipoEntidad === 'IE') return false;
    return true;
  };

  // --- Estados de Vista ---
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // --- Estados de Filtro ---
  const [search, setSearch] = useState('');
  const [anioAcademico, setAnioAcademico] = useState('Todos');
  const [tipoEntidad, setTipoEntidad] = useState(defaultEntity);
  const [estado, setEstado] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);

  // --- Estados de Modales ---
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);
  const [deletePlanHardId, setDeletePlanHardId] = useState<string | null>(null);

  // --- Estados de Formulario de Subida ---
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadYear, setUploadYear] = useState(new Date().getFullYear().toString());
  const [uploadEntity, setUploadEntity] = useState<'UGEL' | 'IE'>(defaultEntity);
  const [uploadEstado, setUploadEstado] = useState<'Activo' | 'Inactivo'>('Activo');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [localUploadError, setLocalUploadError] = useState<string | null>(null);
  const [localToggleError, setLocalToggleError] = useState<string | null>(null);
  const [localHardDeleteError, setLocalHardDeleteError] = useState<string | null>(null);

  // Sincronizar tipo de entidad según el rol cargado de forma síncrona durante el render
  const [prevDefaultEntity, setPrevDefaultEntity] = useState(defaultEntity);
  if (defaultEntity !== prevDefaultEntity) {
    setTipoEntidad(defaultEntity);
    setUploadEntity(defaultEntity);
    setPrevDefaultEntity(defaultEntity);
  }

  // --- Hook de Servicio ---
  const {
    planes,
    loading,
    error,
    actionLoading,
    fetchPlanes,
    uploadPlan,
    toggleEstado,
    hardDeletePlan,
    viewPlanPdf,
  } = usePlanesMonitoreo();

  // --- Cargar datos con filtros ---
  const activeFilters = useMemo(() => {
    return {
      search: search.trim() || undefined,
      anioAcademico: anioAcademico !== 'Todos' ? Number(anioAcademico) : undefined,
      tipoEntidad: tipoEntidad !== 'Todos' ? tipoEntidad : undefined,
      estado: estado !== 'Todos' ? estado : undefined,
    };
  }, [search, anioAcademico, tipoEntidad, estado]);

  useEffect(() => {
    fetchPlanes(activeFilters);
  }, [fetchPlanes, activeFilters]);

  // Resetear paginación síncronamente cuando cambian los filtros
  const [prevFilters, setPrevFilters] = useState(activeFilters);
  if (JSON.stringify(activeFilters) !== JSON.stringify(prevFilters)) {
    setCurrentPage(1);
    setPrevFilters(activeFilters);
  }

  // --- Paginación básica (6 elementos por página) ---
  const itemsPerPage = 6;
  const totalPages = Math.ceil(planes.length / itemsPerPage) || 1;
  const paginatedPlanes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return planes.slice(startIndex, startIndex + itemsPerPage);
  }, [planes, currentPage]);

  const displayedRange = useMemo(() => {
    if (planes.length === 0) return 'Mostrando 0 registros';
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, planes.length);
    return `Mostrando ${start} a ${end} de ${planes.length} registros`;
  }, [planes.length, currentPage]);

  // --- Manejo de Subida ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalUploadError(null);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        setLocalUploadError('El archivo debe ser en formato PDF.');
        setUploadFile(null);
      } else if (file.size > 10 * 1024 * 1024) {
        setLocalUploadError('El archivo no debe exceder los 10MB.');
        setUploadFile(null);
      } else {
        setUploadFile(file);
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    setLocalUploadError(null);

    if (!uploadTitle.trim() || !uploadFile) {
      return;
    }

    const res = await uploadPlan({
      file: uploadFile,
      titulo: uploadTitle.trim(),
      anioAcademico: Number(uploadYear),
      tipoEntidad: uploadEntity,
      estado: uploadEstado,
    });

    if (res.success) {
      // Limpiar y cerrar modal
      setUploadTitle('');
      setUploadFile(null);
      setUploadEstado('Activo');
      setFormSubmitted(false);
      setShowUploadModal(false);
    }
  };

  // --- Manejo de Eliminado Lógico ---
  const handleDeleteConfirm = async () => {
    if (!deletePlanId) return;
    setLocalToggleError(null);
    const res = await toggleEstado(deletePlanId);
    if (res.success) {
      setDeletePlanId(null);
    } else {
      setLocalToggleError(res.error || 'Error al cambiar estado.');
    }
  };

  // --- Manejo de Eliminado Físico ---
  const handleHardDeleteConfirm = async () => {
    if (!deletePlanHardId) return;
    setLocalHardDeleteError(null);
    const res = await hardDeletePlan(deletePlanHardId);
    if (res.success) {
      setDeletePlanHardId(null);
    } else {
      setLocalHardDeleteError(res.error || 'Error al eliminar plan.');
    }
  };

  // --- Formateador de Fecha ---
  const formatDate = (dateString: string) =>
    formatearFecha(dateString, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

  return (
    <div className="flex flex-col w-full gap-6 animate-in fade-in-0 duration-300">
      {/* ── Cabecera ── */}
      <PageHeader
        title="Gestión de Plan de Monitoreo"
        description="Repositorio centralizado de planes de monitoreo en formato PDF. Revise el historial y el estado actual de las planificaciones."
        action={
          <Button
            onClick={() => {
              setLocalUploadError(null);
              setFormSubmitted(false);
              setShowUploadModal(true);
            }}
            className="flex items-center gap-2 font-bold cursor-pointer bg-primary hover:bg-primary/90 text-white transition-colors"
          >
            <PlusCircle className="w-[18px] h-[18px]" strokeWidth={2} />
            Registrar Plan de Monitoreo
          </Button>
        }
      />

      {/* ── Filtros ── */}
      <Card className="border border-border bg-surface shadow-sm rounded-2xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TextField
            label="Buscar por Título"
            value={search}
            onChange={setSearch}
            placeholder="Ej. Plan Anual 2024..."
            adornment={<Search className="w-[18px] h-[18px] text-text-muted" />}
          />
          <SelectField
            label="Año Académico"
            value={anioAcademico}
            onChange={setAnioAcademico}
            placeholder="Seleccionar año..."
            options={[{ value: 'Todos', label: 'Todos' }, ...OPCIONES_ANIO]}
          />
          <SelectField
            label="Estado"
            value={estado}
            onChange={setEstado}
            placeholder="Seleccionar estado..."
            options={[
              { value: 'Todos', label: 'Todos' },
              { value: 'Activo', label: 'Activo' },
              { value: 'Inactivo', label: 'Inactivo' },
            ]}
          />
        </div>
      </Card>

      {/* ── Cuadrícula de Contenido ── */}
      {loading ? (
        <div className="w-full h-[350px] flex flex-col justify-center items-center gap-3">
          <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-primary"></div>
          <span className="text-text-muted text-sm font-medium">Cargando planes de monitoreo...</span>
        </div>
      ) : planes.length === 0 ? (
        <Card className="border border-dashed border-border py-16 flex flex-col justify-center items-center gap-3 text-center bg-surface/50 rounded-2xl">
          <div className="w-14 h-14 bg-muted/60 text-text-muted/60 rounded-full flex items-center justify-center">
            <Compass className="w-8 h-8" strokeWidth={1.5} />
          </div>
          <h3 className="text-sm font-bold text-text">No se encontraron planes</h3>
          <p className="text-xs text-text-muted max-w-sm px-4">
            No hay ningún documento de monitoreo que coincida con los criterios de búsqueda o filtros actuales.
          </p>
        </Card>
      ) : (
        <>
          {/* Barra de título de la sección y selector de vista */}
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Documentos de Monitoreo
            </span>
            <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/80 gap-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-surface text-primary shadow-xs'
                    : 'text-text-muted hover:text-text'
                }`}
                title="Vista Cuadrícula"
              >
                <LayoutGrid className="w-[15px] h-[15px]" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-surface text-primary shadow-xs'
                    : 'text-text-muted hover:text-text'
                }`}
                title="Vista Lista"
              >
                <List className="w-[15px] h-[15px]" />
              </button>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in-50 duration-200">
              {paginatedPlanes.map((plan) => (
                <Card
                  key={plan.id}
                  className={`border border-border/80 shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden flex ${
                    plan.estado === 'Inactivo' ? 'opacity-70 bg-surface/50 grayscale-[20%]' : 'bg-surface'
                  }`}
                >
                  <CardContent className="p-4 w-full flex gap-4 items-start">
                    {/* Vista Previa / Icono de PDF */}
                    <div className="w-[95px] h-[115px] bg-muted/40 border border-border/80 rounded-xl flex flex-col items-center justify-center gap-1.5 shrink-0 select-none">
                      <FileText className="w-9 h-9 text-destructive/80" />
                      <span className="text-[9px] font-extrabold tracking-wider text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                        PDF
                      </span>
                    </div>

                    {/* Metadata y Título */}
                    <div className="flex-1 flex flex-col min-w-0 min-h-[115px] gap-0.5">
                      <div className="flex items-center gap-2 mb-1 shrink-0">
                        <span className="text-xs font-bold text-text-muted">{plan.anioAcademico}</span>
                        <Badge
                          variant={plan.tipoEntidad === 'UGEL' ? 'default' : 'secondary'}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            plan.tipoEntidad === 'UGEL'
                              ? 'bg-blue-500/10 text-blue-600 border border-blue-500/25'
                              : 'bg-muted/70 text-text-muted border border-border'
                          }`}
                        >
                          {plan.tipoEntidad}
                        </Badge>
                        <Badge
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            plan.estado === 'Activo'
                              ? 'bg-green-500/10 text-green-600 border border-green-500/25'
                              : 'bg-destructive/10 text-destructive border border-destructive/25'
                          }`}
                        >
                          {plan.estado}
                        </Badge>
                      </div>

                      <h4
                        className="text-sm font-bold text-text leading-snug line-clamp-2"
                        title={plan.titulo}
                      >
                        {plan.titulo}
                      </h4>

                      <span className="text-[11px] text-text-muted shrink-0">
                        Registrado: {formatDate(plan.createdAt)}
                      </span>
                      {labelCargoAutor(plan.rolAutorAlCrear) && (
                        <span className="text-[11px] text-text-muted shrink-0">
                          Subido por:{' '}
                          <span className="font-semibold text-text">
                            {labelCargoAutor(plan.rolAutorAlCrear)}
                            {plan.autorNombre ? ` — ${plan.autorNombre}` : ''}
                          </span>
                        </span>
                      )}

                      {/* Acciones */}
                      <div className="flex items-center gap-2 mt-2.5 shrink-0">
                        <Button
                          variant="ghost"
                          onClick={() => viewPlanPdf(plan.id)}
                          disabled={actionLoading}
                          className="inline-flex items-center justify-center gap-1.5 text-xs font-bold px-3.5 py-1.5 bg-primary hover:bg-primary/95 text-white rounded-lg h-8 transition-colors select-none border-none"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver
                        </Button>
                        {canEditPlan(plan) && (
                          <>
                            {plan.estado === 'Activo' ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setLocalToggleError(null); setDeletePlanId(plan.id); }}
                                className="h-8 w-8 text-text-muted hover:text-destructive hover:bg-destructive/15 transition-colors rounded-lg cursor-pointer"
                                title="Desactivar Plan"
                              >
                                <PowerOff className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setLocalToggleError(null); setDeletePlanId(plan.id); }}
                                className="h-8 w-8 text-text-muted hover:text-primary hover:bg-primary/15 transition-colors rounded-lg cursor-pointer"
                                title="Reactivar Plan"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setLocalHardDeleteError(null); setDeletePlanHardId(plan.id); }}
                              className="h-8 w-8 text-text-muted hover:text-destructive hover:bg-destructive/15 transition-colors rounded-lg cursor-pointer"
                              title="Eliminar por completo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3.5 animate-in fade-in-50 duration-200">
              {paginatedPlanes.map((plan) => (
                <Card
                  key={plan.id}
                  className={`border border-border/80 shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden ${
                    plan.estado === 'Inactivo' ? 'opacity-70 bg-surface/50 grayscale-[20%]' : 'bg-surface'
                  }`}
                >
                  <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Mini PDF Icon */}
                      <div className="w-10 h-12 bg-muted/40 border border-border/80 rounded-xl flex flex-col items-center justify-center shrink-0 select-none">
                        <FileText className="w-5 h-5 text-destructive/80" />
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        <h4
                          className="text-sm font-bold text-text truncate max-w-[280px] sm:max-w-[400px] md:max-w-[550px] lg:max-w-[700px] leading-snug"
                          title={plan.titulo}
                        >
                          {plan.titulo}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2.5 mt-1 text-[11px] text-text-muted">
                          <span className="font-bold">{plan.anioAcademico}</span>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <Badge
                            variant={plan.tipoEntidad === 'UGEL' ? 'default' : 'secondary'}
                            className={`text-[9px] font-bold px-1.5 py-0 rounded ${
                              plan.tipoEntidad === 'UGEL'
                                ? 'bg-blue-500/10 text-blue-600 border border-blue-500/25'
                                : 'bg-muted/70 text-text-muted border border-border'
                            }`}
                          >
                            {plan.tipoEntidad}
                          </Badge>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <Badge
                            className={`text-[9px] font-bold px-1.5 py-0 rounded ${
                              plan.estado === 'Activo'
                                ? 'bg-green-500/10 text-green-600 border border-green-500/25'
                                : 'bg-destructive/10 text-destructive border border-destructive/25'
                            }`}
                          >
                            {plan.estado}
                          </Badge>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span>Registrado: {formatDate(plan.createdAt)}</span>
                          {labelCargoAutor(plan.rolAutorAlCrear) && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-border" />
                              <span>
                                Subido por:{' '}
                                <span className="font-semibold text-text">
                                  {labelCargoAutor(plan.rolAutorAlCrear)}
                                  {plan.autorNombre ? ` — ${plan.autorNombre}` : ''}
                                </span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <Button
                        variant="ghost"
                        onClick={() => viewPlanPdf(plan.id)}
                        disabled={actionLoading}
                        className="inline-flex items-center justify-center gap-1.5 text-xs font-bold px-4 py-1.5 bg-primary hover:bg-primary/95 text-white rounded-lg h-8 transition-colors select-none border-none"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver
                      </Button>
                      {canEditPlan(plan) && (
                        <>
                          {plan.estado === 'Activo' ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setLocalToggleError(null); setDeletePlanId(plan.id); }}
                              className="h-8 w-8 text-text-muted hover:text-destructive hover:bg-destructive/15 transition-colors rounded-lg cursor-pointer"
                              title="Desactivar Plan"
                            >
                              <PowerOff className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setLocalToggleError(null); setDeletePlanId(plan.id); }}
                              className="h-8 w-8 text-text-muted hover:text-primary hover:bg-primary/15 transition-colors rounded-lg cursor-pointer"
                              title="Reactivar Plan"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setLocalHardDeleteError(null); setDeletePlanHardId(plan.id); }}
                            className="h-8 w-8 text-text-muted hover:text-destructive hover:bg-destructive/15 transition-colors rounded-lg cursor-pointer"
                            title="Eliminar por completo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* ── Paginación ── */}
          <div className="flex items-center justify-between border-t border-border/80 pt-4 mt-2 shrink-0">
            <span className="text-xs text-text-muted font-medium">{displayedRange}</span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0 cursor-pointer rounded-lg border-border"
              >
                &lt;
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={`h-8 w-8 p-0 cursor-pointer rounded-lg ${
                    page === currentPage
                      ? 'bg-primary text-white border-primary'
                      : 'border-border text-text-muted hover:text-text'
                  }`}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0 cursor-pointer rounded-lg border-border"
              >
                &gt;
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ── Modal de Subida de Plan de Monitoreo ── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200">
          <div className="bg-surface border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-bold text-text">Registrar Plan de Monitoreo</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 hover:bg-muted text-text-muted hover:text-text rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-5 flex flex-col gap-4">
              {(localUploadError || error) && (
                <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-3.5 text-destructive text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>{localUploadError || error}</div>
                </div>
              )}

              <TextField
                label="Título del Plan *"
                value={uploadTitle}
                onChange={setUploadTitle}
                placeholder="Ej. Plan Anual de Monitoreo UGEL 2024"
                error={formSubmitted && !uploadTitle.trim() ? 'El título es obligatorio' : ''}
              />

              <div className="grid grid-cols-2 gap-4">
                <SelectField
                  label="Año Académico *"
                  value={uploadYear}
                  onChange={setUploadYear}
                  placeholder="Seleccionar año..."
                  options={OPCIONES_ANIO}
                />
                <SelectField
                  label="Tipo de Entidad *"
                  value={uploadEntity}
                  onChange={(v) => setUploadEntity(v as 'UGEL' | 'IE')}
                  placeholder="Seleccionar tipo..."
                  disabled={true}
                  options={[
                    { value: 'UGEL', label: 'UGEL' },
                    { value: 'IE', label: 'IE' },
                  ]}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <SelectField
                  label="Estado Inicial"
                  value={uploadEstado}
                  placeholder="Seleccione un estado"
                  onChange={(v) => setUploadEstado(v as 'Activo' | 'Inactivo')}
                  options={[
                    { value: 'Activo', label: 'Activo' },
                    { value: 'Inactivo', label: 'Inactivo' },
                  ]}
                />
              </div>

              {/* Subida de Archivo */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-text-muted">Documento PDF (Máx. 10MB) *</label>
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                    uploadFile
                      ? 'border-green-500/40 bg-green-500/5'
                      : formSubmitted && !uploadFile
                      ? 'border-destructive/40 bg-destructive/5'
                      : 'border-border hover:bg-muted/40'
                  }`}
                  onClick={() => document.getElementById('pdf-file-input')?.click()}
                >
                  <FileText className={`w-8 h-8 ${uploadFile ? 'text-green-500' : 'text-text-muted'}`} />
                  {uploadFile ? (
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-text line-clamp-1 px-4">{uploadFile.name}</span>
                      <span className="text-[10px] text-text-muted">{(uploadFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-text">Seleccione un archivo PDF</span>
                      <span className="text-[10px] text-text-muted">Haga clic para buscar en su equipo</span>
                    </div>
                  )}
                  <input
                    id="pdf-file-input"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                {formSubmitted && !uploadFile && (
                  <span className="text-xs text-destructive mt-0.5">El archivo PDF es obligatorio</span>
                )}
              </div>

              {/* Acciones */}
              <div className="flex justify-end gap-3 mt-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUploadModal(false)}
                  disabled={actionLoading}
                  className="cursor-pointer border-border"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-primary hover:bg-primary/95 text-white font-bold cursor-pointer transition-colors"
                >
                  {actionLoading ? 'Guardando...' : 'Guardar Plan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal de Confirmación para Desactivación / Reactivación ── */}
      {deletePlanId && (() => {
        const selectedPlan = planes.find(p => p.id === deletePlanId);
        const isReactivating = selectedPlan?.estado === 'Inactivo';
        return (
          <ConfirmModal
            title={isReactivating ? '¿Desea reactivar el Plan de Monitoreo?' : '¿Desea desactivar el Plan de Monitoreo?'}
            message={
              <div className="flex flex-col gap-3">
                <p className="text-sm text-text-muted mt-2">
                  {isReactivating ? (
                    <span>Esta acción cambiará el estado de este plan de monitoreo a <strong>Activo</strong> y estará disponible para todos los usuarios.</span>
                  ) : (
                    <span>Esta acción cambiará el estado de este plan de monitoreo a <strong>Inactivo</strong>. Ya no estará activo pero seguirá visible para reactivación.</span>
                  )}
                </p>
                {localToggleError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                    <p className="text-xs text-rose-700 font-semibold">{localToggleError}</p>
                  </div>
                )}
              </div>
            }
            confirmLabel={
              actionLoading 
                ? (isReactivating ? 'Reactivando...' : 'Desactivando...') 
                : (isReactivating ? 'Reactivar Plan' : 'Desactivar Plan')
            }
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeletePlanId(null)}
            danger={!isReactivating}
          />
        );
      })()}
      {/* ── Modal de Confirmación para Eliminado Físico ── */}
      {deletePlanHardId && (() => {
        return (
          <ConfirmModal
            title="¿Eliminar definitivamente el Plan de Monitoreo?"
            message={
              <div className="flex flex-col gap-3">
                <span className="font-bold text-destructive">
                  ¡Atención! Esta acción no se puede deshacer.
                </span>
                <span>
                  El plan de monitoreo será borrado completamente de la base de datos, siempre y cuando no tenga visitas (cronogramas) o plantillas asociadas.
                </span>
                {localHardDeleteError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                    <p className="text-xs text-rose-700 font-semibold">{localHardDeleteError}</p>
                  </div>
                )}
              </div>
            }
            confirmLabel={actionLoading ? 'Eliminando...' : 'Eliminar Permanentemente'}
            onConfirm={handleHardDeleteConfirm}
            onCancel={() => setDeletePlanHardId(null)}
            danger={true}
          />
        );
      })()}
    </div>
  );
};
