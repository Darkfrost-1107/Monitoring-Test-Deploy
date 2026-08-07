import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Search, AlertCircle, Shield, Info } from 'lucide-react';
import { CARGA_HORARIA } from '@shared/config/constants';
import { fetchDocentes, fetchCargos, updateDocenteRaw } from '@features/docentes/docente-service';
import type { Docente } from '@entities/model-docentes';
import { Card } from '@shared/ui/card';
import {
  FormButton,
  SectionCard,
  SelectField,
  TextField,
} from '@shared/ui/form-controls';
import {
  twoCols,
} from '@shared/ui/form-controls.types';

interface Props {
  targetCargo: 'Coordinador Pedagógico' | 'Jefe de Taller';
  redirectPath: string;
}

export const DocenteAssignPage = ({ targetCargo, redirectPath }: Props) => {
  const navigate = useNavigate();

  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [loadingDocentes, setLoadingDocentes] = useState(false);
  const [cargos, setCargos] = useState<Array<{ id: string; nombre: string }>>([]);
  const [selectedDocenteId, setSelectedDocenteId] = useState('');
  const [condicionLaboral, setCondicionLaboral] = useState('Nombrado');
  const [cargaLaboral, setCargaLaboral] = useState(targetCargo === 'Coordinador Pedagógico' ? 40 : 30);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Cargar docentes y catálogo de cargos
  useEffect(() => {
    const loadData = async () => {
      setLoadingDocentes(true);
      setFetchError(null);
      try {
        const [docentesMapped, cargosRes] = await Promise.all([
          fetchDocentes(),
          fetchCargos(),
        ]);

        // El Jefe de Taller solo puede designarse a docentes de EPT
        // (Educación para el Trabajo); la especialidad puede ser lista por comas.
        const esEPT = (d: Docente) =>
          (d.especialidad ?? '')
            .split(',')
            .map((e) => e.trim().toLowerCase())
            .includes('ept');
        const filtered = docentesMapped.filter(
          (d) =>
            d.activo &&
            d.cargo === 'Docente de Aula' &&
            (targetCargo !== 'Jefe de Taller' || esEPT(d)),
        );
        setDocentes(filtered);

        if (cargosRes.ok && cargosRes.data) {
          setCargos(cargosRes.data);
        } else {
          setFetchError('No se pudo cargar el catálogo de cargos.');
        }
      } catch (err) {
        setFetchError('Error al conectar con el servidor.');
        console.error('Error loading assignment page data:', err);
      } finally {
        setLoadingDocentes(false);
      }
    };

    loadData();
  }, [targetCargo]);

  // Docente actualmente seleccionado
  const selectedDocente = useMemo(() => {
    if (!selectedDocenteId) return null;
    return docentes.find((d) => d.id === selectedDocenteId) || null;
  }, [selectedDocenteId, docentes]);

  // Si cambia el docente seleccionado, actualizar campos
  useEffect(() => {
    if (selectedDocente) {
      // Forzar Nombrado o Destacado si tiene otro tipo (por restricciones del backend)
      const currentCond = selectedDocente.condicion as string;
      if (currentCond === 'Nombrado' || currentCond === 'Destacado') {
        setTimeout(() => setCondicionLaboral(currentCond), 0);
      } else {
        setTimeout(() => setCondicionLaboral('Nombrado'), 0);
      }

      if (targetCargo === 'Coordinador Pedagógico') {
        setTimeout(() => setCargaLaboral(40), 0);
      } else {
        setTimeout(() => setCargaLaboral(selectedDocente.cargaHoraria || CARGA_HORARIA.DOCENTE), 0);
      }
    }
  }, [selectedDocente, targetCargo]);

  const handleAssign = async () => {
    if (!selectedDocente) return;
    setSubmitting(true);
    setError(null);

    try {
      const dbCargo = cargos.find((c) => c.nombre === targetCargo);
      if (!dbCargo) {
        throw new Error(`El cargo "${targetCargo}" no está disponible en la base de datos.`);
      }

      // Convertir la escala magisterial romana a número
      const MAP_ROMAN_TO_INT: Record<string, number> = {
        I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8
      };
      const escalaInt = MAP_ROMAN_TO_INT[selectedDocente.escala] || 1;

      const dto = {
        nombres: selectedDocente.nombres,
        apellidos: selectedDocente.apellidos,
        correo: selectedDocente.correo || undefined,
        telefono: selectedDocente.celular || undefined,
        nivelEducativo: 'Secundaria', // Siempre secundaria para estos cargos
        cursoAsignado: selectedDocente.especialidad || 'General',
        cargoId: dbCargo.id,
        condicionLaboral: condicionLaboral,
        cargaLaboral: Number(cargaLaboral),
        escalaMagisterial: escalaInt,
        institucionId: selectedDocente.institucionId,
        secciones: selectedDocente.secciones?.map((s) => ({
          grado: s.grado,
          seccion: s.seccion,
        })) || [],
      };

      const res = await updateDocenteRaw(selectedDocente.id, dto);
      if (res.ok) {
        navigate(redirectPath);
      } else {
        const errMsg =
          (res.error as { message?: string })?.message || `Error al asignar el cargo de ${targetCargo}.`;
        setError(errMsg);
      }
    } catch (e) {
      const err = e as Error;
      setError(err.message || 'Error al procesar la asignación.');
      console.error('Error making assignment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full gap-6">
      <Card className="w-full bg-surface border border-border rounded-2xl shadow-sm p-6 sm:p-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-text">Asignación de {targetCargo}</h2>
          <p className="text-text-muted text-sm mt-1">
            Seleccione un docente de aula activo de secundaria para asignarle la función de {targetCargo}.
          </p>
        </div>

        {fetchError && (
          <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive text-sm font-medium mb-5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {fetchError}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive text-sm font-medium mb-5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex flex-col gap-6 text-text">
          {/* Selección de Docente */}
          <SectionCard icon={<Search className="w-5 h-5" />} title="Seleccionar Docente Candidato">
            <div className="grid grid-cols-1 gap-5">
              <SelectField
                label="Docentes de Aula Disponibles"
                required
                value={selectedDocenteId}
                onChange={setSelectedDocenteId}
                options={docentes.map((d) => ({
                  value: d.id,
                  label: `${d.apellidos}, ${d.nombres} (DNI: ${d.dni} — Especialidad: ${d.especialidad})`,
                }))}
                placeholder={
                  loadingDocentes
                    ? 'Cargando docentes...'
                    : docentes.length === 0
                      ? 'No hay docentes de aula disponibles en Secundaria'
                      : 'Seleccione un docente'
                }
                disabled={loadingDocentes || docentes.length === 0}
              />
            </div>

            {docentes.length === 0 && !loadingDocentes && (
              <div className="mt-4 flex items-start gap-2.5 bg-warning/10 border border-warning/20 rounded-xl p-3.5 text-warning text-xs leading-relaxed">
                <Info className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Nota:</span> Todos los docentes registrados en la institución ya tienen un cargo directivo o de coordinación asignado. Primero registre un nuevo docente como <strong>Docente de Aula</strong> para poder asignarle este rol.
                </div>
              </div>
            )}
          </SectionCard>

          {/* Confirmación y Datos a Completar */}
          {selectedDocente && (
            <div className="animate-in slide-in-from-bottom-2 duration-300 flex flex-col gap-6">
              <SectionCard icon={<Briefcase className="w-5 h-5" />} title="Detalles de la Asignación">
                <div className="p-4 bg-muted/30 border border-border/80 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                  <div>
                    <h4 className="text-sm font-bold text-text mb-1">
                      Requisitos del Cargo
                    </h4>
                    <p className="text-xs text-text-muted">
                      El cargo de {targetCargo} requiere condición laboral <strong>Nombrado</strong> o <strong>Destacado</strong>.
                      {targetCargo === 'Coordinador Pedagógico' && (
                        <span> La carga horaria se actualizará automáticamente a <strong>40 horas</strong>.</span>
                      )}
                    </p>
                  </div>
                </div>

                <div style={twoCols}>
                  <SelectField
                    label="Condición Laboral en el Cargo"
                    required
                    value={condicionLaboral}
                    onChange={setCondicionLaboral}
                    options={[
                      { value: 'Nombrado', label: 'Nombrado' },
                      { value: 'Destacado', label: 'Destacado' },
                    ]}
                    placeholder="Seleccione Condición"
                  />

                  {targetCargo === 'Coordinador Pedagógico' ? (
                    <TextField
                      label="Carga Horaria Requerida (Horas)"
                      disabled
                      value="40"
                      onChange={() => {}}
                    />
                  ) : (
                    <TextField
                      label="Carga Horaria (Horas)"
                      required
                      value={cargaLaboral.toString()}
                      onChange={(v) => setCargaLaboral(Number(v.replace(/\D/g, '')))}
                      placeholder="Carga horaria en horas"
                    />
                  )}
                </div>
              </SectionCard>

              <SectionCard icon={<Shield className="w-5 h-5" />} title="Confirmar Datos del Docente">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px]">
                  <TextField
                    label="Docente Seleccionado"
                    disabled
                    value={`${selectedDocente.apellidos}, ${selectedDocente.nombres}`}
                    onChange={() => {}}
                  />
                  <TextField
                    label="DNI"
                    disabled
                    value={selectedDocente.dni}
                    onChange={() => {}}
                  />
                  <TextField
                    label="Correo Electrónico"
                    disabled
                    value={selectedDocente.correo || 'No registrado'}
                    onChange={() => {}}
                  />
                  <TextField
                    label="Especialidad"
                    disabled
                    value={selectedDocente.especialidad}
                    onChange={() => {}}
                  />
                </div>
              </SectionCard>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex justify-end gap-3 mt-2">
            <FormButton variant="secondary" onClick={() => navigate(redirectPath)} disabled={submitting}>
              Cancelar
            </FormButton>
            <FormButton onClick={handleAssign} disabled={submitting || !selectedDocente}>
              {submitting ? 'Guardando...' : 'Confirmar Asignación'}
            </FormButton>
          </div>
        </div>
      </Card>
    </div>
  );
};
