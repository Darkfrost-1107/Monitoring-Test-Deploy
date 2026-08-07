import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@shared/ui/pageHeader';
import { PlantillaForm, type PlantillaFormState } from '@widgets/plantillas';
import { plantillasApi } from '@entities/model-plantillas/api/plantillas.api';
import { useQueryClient } from '@tanstack/react-query';
import { ConfirmModal } from '@shared/ui/ConfirmModal';
import { formatearFechaCorta } from '@shared/lib/fecha/fecha';

const toBackendTipo = (tipo: string): 'DOCENTE' | 'DIRECTIVO' =>
  tipo.toUpperCase().includes('DIRECTIVO') ? 'DIRECTIVO' : 'DOCENTE';

export const PlantillaCreatePage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingArchive, setPendingArchive] = useState<{ plantillas: { id: string; anioAcademico: number; tipoMonitoreo: string }[]; data: PlantillaFormState; backendTipo: 'DOCENTE' | 'DIRECTIVO' } | null>(null);

  const handleSubmit = async (data: PlantillaFormState) => {
    setIsSaving(true);
    setSubmitError(null);

    const backendTipo = toBackendTipo(data.tipoMonitoreo);

    try {
      const existing = await plantillasApi.findAll({
        tipoMonitoreo: backendTipo,
        anioAcademico: Number(data.anioAcademico),
        estado: 'Vigente',
      });
      if (existing && existing.length > 0) {
        setPendingArchive({
          plantillas: existing.map((p) => ({ id: p.id, anioAcademico: p.anioAcademico, tipoMonitoreo: p.tipoMonitoreo })),
          data,
          backendTipo,
        });
        setIsSaving(false);
        return;
      }

      await executeCreate(data, backendTipo, []);
    } catch (err) {
      console.error('[plantilla] Error al crear:', err);
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
      setIsSaving(false);
    }
  };

  const executeCreate = async (data: PlantillaFormState, backendTipo: 'DOCENTE' | 'DIRECTIVO', toArchive: { id: string }[]) => {
    try {
      for (const old of toArchive) {
        await plantillasApi.cambiarEstado(old.id, 'Historico');
      }

      const created = await plantillasApi.create({
        tipoMonitoreo: backendTipo,
        anioAcademico: Number(data.anioAcademico),
        baremo: data.baremo,
        descripcion: `Plantilla registrada el ${formatearFechaCorta(new Date().toISOString())}. Contiene ${data.desempenos.length} desempeños de evaluación.`,
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
      });

      await plantillasApi.cambiarEstado(created.id, 'Vigente');

      qc.invalidateQueries({ queryKey: ['plantillas'] });

      setPendingArchive(null);
      setIsSaving(false);
      navigate(-1);
    } catch (err) {
      console.error('[plantilla] Error al crear:', err);
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
      setIsSaving(false);
    }
  };

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
            title="Registrar Nueva Plantilla"
            description="Complete los campos para dar de alta una plantilla de ficha de monitoreo."
          />
        </div>
      </div>

      {submitError && (
        <div className="border border-rose-200 bg-rose-50 text-rose-700 text-sm rounded-xl p-3 font-semibold whitespace-pre-wrap">
          {submitError}
        </div>
      )}

      <PlantillaForm onCancel={() => navigate(-1)} onSubmit={handleSubmit} isSaving={isSaving} />

      {pendingArchive && (
        <ConfirmModal
          title="Archivar plantilla vigente existente"
          message={
            <span className="text-xs text-slate-600 leading-relaxed block">
              Ya existe {pendingArchive.plantillas.length} plantilla(s) vigente(s) de tipo{' '}
              <strong>{pendingArchive.plantillas[0]?.tipoMonitoreo}</strong> para el año{' '}
              <strong>{pendingArchive.plantillas[0]?.anioAcademico}</strong>. Si continúa, la(s) plantilla(s)
              vigente(s) pasará(n) a estado <strong>Histórico</strong> y la nueva plantilla quedará como
              Vigente. ¿Desea continuar?
            </span>
          }
          confirmLabel="Sí, archivar y crear"
          cancelLabel="Cancelar"
          onConfirm={() => {
            if (pendingArchive) {
              setIsSaving(true);
              executeCreate(pendingArchive.data, pendingArchive.backendTipo, pendingArchive.plantillas);
            }
          }}
          onCancel={() => setPendingArchive(null)}
        />
      )}
    </div>
  );
};
