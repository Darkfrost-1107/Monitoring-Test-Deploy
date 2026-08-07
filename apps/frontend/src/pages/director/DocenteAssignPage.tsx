import { useNavigate } from 'react-router-dom';
import { Search, AlertCircle, Info } from 'lucide-react';
import { Card } from '@shared/ui/card';
import { FormButton, SectionCard, SelectField } from '@shared/ui/form-controls';
import { useAsignacionDeCargo } from '@features/docentes/hooks/use-asignacion-de-cargo';
import { ConfirmarAsignacion } from '@features/docentes/ui/ConfirmarAsignacion';
import type { CargoAsignable } from '@features/docentes/lib/asignacion-de-cargo';

/**
 * Asignación de un cargo de institución a un docente de aula.
 *
 * Eran 307 líneas con dos efectos, siete estados y el armado del DTO adentro.
 * Uno de los efectos envolvía cada `setState` en un `setTimeout(…, 0)`, sin
 * limpieza y sin motivo.
 */

interface Props {
  targetCargo: CargoAsignable;
  redirectPath: string;
}

export const DocenteAssignPage = ({ targetCargo, redirectPath }: Props) => {
  const navigate = useNavigate();

  const {
    candidatos,
    cargando,
    errorDeCarga,
    docenteId,
    setDocenteId,
    elegido,
    condicion,
    setCondicion,
    cargaHoraria,
    setCargaHoraria,
    guardando,
    error,
    asignar,
  } = useAsignacionDeCargo({
    cargo: targetCargo,
    onAsignado: () => navigate(redirectPath),
  });

  const sinCandidatos = candidatos.length === 0 && !cargando;

  return (
    <div className="flex flex-col w-full gap-6">
      <Card className="w-full bg-surface border border-border rounded-2xl shadow-sm p-6 sm:p-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-text">Asignación de {targetCargo}</h2>
          <p className="text-text-muted text-sm mt-1">
            Seleccione un docente de aula activo de secundaria para asignarle la función de{' '}
            {targetCargo}.
          </p>
        </div>

        {errorDeCarga && <Aviso mensaje={errorDeCarga} />}
        {error && <Aviso mensaje={error} />}

        <div className="flex flex-col gap-6 text-text">
          <SectionCard icon={<Search className="w-5 h-5" />} title="Seleccionar Docente Candidato">
            <SelectField
              label="Docentes de Aula Disponibles"
              required
              value={docenteId}
              onChange={setDocenteId}
              options={candidatos.map((d) => ({
                value: d.id,
                label: `${d.apellidos}, ${d.nombres} (DNI: ${d.dni} — Especialidad: ${
                  d.especialidad || 'no registrada'
                })`,
              }))}
              placeholder={
                cargando
                  ? 'Cargando docentes...'
                  : sinCandidatos
                    ? 'No hay docentes de aula disponibles en Secundaria'
                    : 'Seleccione un docente'
              }
              disabled={cargando || sinCandidatos}
            />

            {sinCandidatos && (
              <div className="mt-4 flex items-start gap-2.5 bg-warning/10 border border-warning/20 rounded-xl p-3.5 text-warning text-xs leading-relaxed">
                <Info className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Nota:</span>{' '}
                  {targetCargo === 'Jefe de Taller'
                    ? 'No hay docentes de aula activos con especialidad EPT. El cargo de Jefe de Taller sólo puede recaer en un docente de Educación para el Trabajo.'
                    : 'Todos los docentes registrados en la institución ya tienen un cargo directivo o de coordinación asignado. Primero registre un nuevo docente como Docente de Aula para poder asignarle este rol.'}
                </div>
              </div>
            )}
          </SectionCard>

          {elegido && (
            <ConfirmarAsignacion
              cargo={targetCargo}
              docente={elegido}
              condicion={condicion}
              onCondicionChange={setCondicion}
              cargaHoraria={cargaHoraria}
              onCargaHorariaChange={setCargaHoraria}
            />
          )}

          <div className="flex justify-end gap-3 mt-2">
            <FormButton
              variant="secondary"
              onClick={() => navigate(redirectPath)}
              disabled={guardando}
            >
              Cancelar
            </FormButton>
            <FormButton onClick={asignar} disabled={guardando || !elegido}>
              {guardando ? 'Guardando...' : 'Confirmar Asignación'}
            </FormButton>
          </div>
        </div>
      </Card>
    </div>
  );
};

const Aviso = ({ mensaje }: { mensaje: string }) => (
  <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive text-sm font-medium mb-5">
    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
    {mensaje}
  </div>
);
