import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@shared/ui/pageHeader';
import { Spinner } from '@shared/ui/Spinner';
import { EditarPlantillaForm } from '@widgets/plantillas';
import type { PlantillaFormState } from '@widgets/plantillas';
import { usePlantilla, useActualizarPlantilla } from '@entities/model-plantillas/use-plantillas-api';
import { NIVELES_ROMANOS } from '@entities/model-plantillas';
import { formatearFechaCorta } from '@shared/lib/fecha/fecha';

export const PlantillaEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: plantilla, isLoading, isError, error } = usePlantilla(id);
  const actualizar = useActualizarPlantilla();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const initialData = useMemo<PlantillaFormState | null>(() => {
    if (!plantilla) return null;
    return {
      tipoMonitoreo: plantilla.tipoMonitoreo,
      anioAcademico: plantilla.anioAcademico,
      baremo: plantilla.baremo,
      niveles: plantilla.niveles,
      desempenos: plantilla.desempenos.map((d) => ({
        ...d,
        preguntaExtra: d.preguntaExtra ?? '',
        rubrica:
          d.rubrica && d.rubrica.length > 0
            ? d.rubrica
            : NIVELES_ROMANOS.map((nivel) => ({ nivel, descripcion: '' })),
      })),
      ejeItems: (plantilla.ejesItems || []).map((item) => ({
        id: item.id,
        numero: item.numero,
        descripcion: item.descripcion,
      })),
    };
  }, [plantilla]);

  const handleSubmit = async (data: PlantillaFormState) => {
    if (!id) return;
    setSubmitError(null);
    try {
      await actualizar.mutateAsync({
        id,
        data: {
          baremo: data.baremo,
          descripcion: `Plantilla modificada el ${formatearFechaCorta(new Date().toISOString())}. Contiene ${data.desempenos.length} desempeños de evaluación.`,
          niveles: data.niveles.map((n, i) => ({
            nivelRomano: n.nivel,
            denominacion: n.denominacion,
            rangoMin: n.rangoMin,
            color: n.color,
            orden: i + 1,
          })),
          desempenos: data.desempenos
            .map((d, i) => ({
              id: d.id,
              nombre: d.nombre,
              descripcionCorta: d.descripcionCorta,
              preguntaExtra: d.preguntaExtra || undefined,
              orden: i + 1,
              aspectos: d.aspectos
                .filter((a) => a.descripcion.trim() !== '')
                .map((a, ai) => ({
                  id: a.id,
                  descripcion: a.descripcion,
                  orden: ai + 1,
                })),
              rubrica: (d.rubrica ?? []).map((r) => ({
                nivelRomano: r.nivel,
                descripcion: r.descripcion,
              })),
            })),
          ejeItems: (data.ejeItems ?? []).map((item) => ({
            numero: item.numero,
            descripcion: item.descripcion,
          })),
        },
      });
      navigate(-1);
    } catch (err) {
      let msg = err instanceof Error ? err.message : 'Error desconocido';
      if (msg.includes('should not be empty')) {
        msg = msg
          .replace(/desempenos\.(\d+)\.rubrica\.(\d+)\.descripcion/g, (_m, d, r) => `Desempeño ${Number(d) + 1} - Rúbrica ${Number(r) + 1}`)
          .replace(/desempenos\.(\d+)\.aspectos\.(\d+)\.descripcion/g, (_m, d, a) => `Desempeño ${Number(d) + 1} - Aspecto ${Number(a) + 1}`)
          .replace(/desempenos\.(\d+)\.nombre/g, (_m, d) => `Desempeño ${Number(d) + 1} (Nombre)`)
          .replace(/ should not be empty/g, ': No debe estar vacío.')
          .split(',')
          .join('\n');
      }
      setSubmitError(msg);
    }
  };

  if (isError) {
    return (
      <div className="p-6 text-destructive font-semibold">
        Error al cargar la plantilla: {error instanceof Error ? error.message : 'Error desconocido'}
      </div>
    );
  }

  if (isLoading || !initialData) {
    return (
      <div className="flex items-center justify-center py-24 gap-3">
        <Spinner />
        <span className="text-sm text-text-muted">Cargando datos de la rúbrica...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1100px] mx-auto w-full animate-in fade-in-0 duration-300">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 rounded-xl bg-surface border border-border text-text-muted hover:text-text hover:bg-bg transition-colors cursor-pointer shadow-sm animate-in zoom-in-95 duration-200"
        >
          <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2.5} />
        </button>
        <div className="flex-1">
          <PageHeader
            title="Modificar Plantilla Establecida"
            description="Modifique las secciones, aspectos de control o puntajes de la ficha seleccionada."
          />
        </div>
      </div>

      {submitError && (
        <div className="border border-rose-200 bg-rose-50 text-rose-700 text-sm rounded-xl p-3 font-semibold whitespace-pre-wrap">
          {submitError}
        </div>
      )}

      <EditarPlantillaForm
        initialData={initialData}
        onCancel={() => navigate(-1)}
        onSubmit={handleSubmit}
        isLoading={actualizar.isPending}
      />
    </div>
  );
};
