import { useState, useEffect, useMemo, useRef } from 'react';
import { esErrorDeCelular, mensajeDeError } from '@shared/lib/errores-formulario';
import { Briefcase, Search, AlertCircle, Shield, Info } from 'lucide-react';
import { especialistasApi } from '@shared/api/especialistas.api';
import type {
  JefeAreaCreateFormData,
  JefeAreaEditFormData,
} from '@entities/model-jefes-area/validator';
import { jefeAreaCreateSchema, jefeAreaEditSchema } from '@entities/model-jefes-area/validator';
import { CARGA_HORARIA } from '@shared/config/constants';
import { FormButton, SectionCard, SelectField, TextField, DatosPersonalesSection } from '@shared/ui/form-controls';
import type { IEspecialistaResponse } from '@sistema-monitoreo/shared-contracts';

interface Props {
  onCancel: () => void;
  onSubmit: (data: JefeAreaEditFormData | JefeAreaCreateFormData) => void;
  isLoading: boolean;
  initialData?: Partial<JefeAreaEditFormData & JefeAreaCreateFormData>;
  isEdit?: boolean;
  serverError?: string | null;
}

const normalizeNivel = (nivel?: string | null): 'Inicial' | 'Primaria' | 'Secundaria' => {
  if (!nivel) return 'Secundaria';
  const lower = nivel.toLowerCase();
  if (lower === 'inicial') return 'Inicial';
  if (lower === 'primaria') return 'Primaria';
  return 'Secundaria';
};

export const JefeAreaFormBase = ({
  onCancel,
  onSubmit,
  isLoading,
  initialData,
  isEdit = false,
  serverError,
}: Props) => {
  // --- Estados para modo Edición ---
  const [editForm, setEditForm] = useState<JefeAreaEditFormData>({
    nombres: initialData?.nombres || '',
    apellidos: initialData?.apellidos || '',
    dni: initialData?.dni || '',
    correo: initialData?.correo || '',
    celular: initialData?.celular || '',
    cargaHoraria: initialData?.cargaHoraria || CARGA_HORARIA.JEFE_AREA,
    nivelEducativo: initialData?.nivelEducativo || 'Secundaria',
    activo: initialData?.activo ?? true,
  });

  // --- Estados para modo Creación (Promoción) ---
  const [createForm, setCreateForm] = useState<JefeAreaCreateFormData>({
    nivelEducativo: initialData?.nivelEducativo || 'Secundaria',
    specialistId: '',
  });

  const [specialists, setSpecialists] = useState<IEspecialistaResponse[]>([]);
  const [loadingSpecialists, setLoadingSpecialists] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [takenLevels, setTakenLevels] = useState<string[]>([]);

  // Cargar lista de especialistas aptos para promoción
  useEffect(() => {
    if (isEdit) return;
    const fetchAptos = async () => {
      setLoadingSpecialists(true);
      setFetchError(null);
      try {
        // Obtenemos todos los especialistas activos
        const res = await especialistasApi.findAll({ estado: 'Activo' });
        if (res.ok && res.data) {
          // Filtramos solo los que tienen cargo 'Especialista'
          const filtered = res.data.filter((e) => e.cargo === 'Especialista');
          setSpecialists(filtered);

          // Obtenemos los niveles que ya tienen un Jefe de Área activo
          const jefes = res.data.filter((e) => e.cargo === 'Jefe de Área');
          setTakenLevels(jefes.map((j) => normalizeNivel(j.nivelEducativo)));
        } else {
          setFetchError('No se pudo cargar la lista de especialistas aptos.');
        }
      } catch (err) {
        setFetchError('Error al conectar con el servidor.');
        console.error('Error fetching specialists for promotion:', err);
      } finally {
        setLoadingSpecialists(false);
      }
    };
    fetchAptos();
  }, [isEdit]);

  // Filtrar los especialistas según el nivel seleccionado en el formulario de creación
  const candidates = useMemo(() => {
    return specialists.filter(
      (s) => normalizeNivel(s.nivelEducativo) === createForm.nivelEducativo,
    );
  }, [specialists, createForm.nivelEducativo]);

  // Especialista actualmente seleccionado para promoción
  const selectedSpecialist = useMemo(() => {
    if (isEdit || !createForm.specialistId) return null;
    return candidates.find((c) => c.id === createForm.specialistId) || null;
  }, [isEdit, createForm.specialistId, candidates]);

  // Manejar cambios de nivel en creación (limpia el especialista seleccionado anterior)
  const handleCreateLevelChange = (val: string) => {
    setCreateForm({
      nivelEducativo: val as 'Inicial' | 'Primaria' | 'Secundaria',
      specialistId: '',
    });
  };

  // Validación y envío
  const handleSave = () => {
    setSubmitted(true);

    if (isEdit) {
      const result = jefeAreaEditSchema.safeParse(editForm);
      if (!result.success) return;
      onSubmit(editForm);
    } else {
      const result = jefeAreaCreateSchema.safeParse(createForm);
      if (!result.success || !selectedSpecialist) return;

      // Enviamos toda la información necesaria para realizar el ascenso (incluyendo datos de Persona)
      onSubmit({
        nivelEducativo: createForm.nivelEducativo,
        specialistId: createForm.specialistId,
        nombres: selectedSpecialist.persona.nombres,
        apellidos: selectedSpecialist.persona.apellidos,
        correo: selectedSpecialist.persona.correo || undefined,
        celular: selectedSpecialist.persona.telefono || undefined,
        cargaHoraria: CARGA_HORARIA.JEFE_AREA, // Jefe de Área tiene carga laboral fija de 40 horas
      });
    }
  };

  // Manejadores de cambios para el formulario de edición
  const setEdit = <K extends keyof JefeAreaEditFormData>(
    key: K,
    value: JefeAreaEditFormData[K],
  ) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  // Errores de validación
  const errors: Record<string, string> = {};
  if (isEdit) {
    const res = jefeAreaEditSchema.safeParse(editForm);
    if (!res.success) {
      res.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        if (!errors[path]) errors[path] = issue.message;
      });
    }
  } else {
    const res = jefeAreaCreateSchema.safeParse(createForm);
    if (!res.success) {
      res.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        if (!errors[path]) errors[path] = issue.message;
      });
    }
  }

  const celularRef = useRef<HTMLDivElement>(null);

  // Llevar la vista al campo que el servidor rechazó, que puede haber quedado
  // fuera de pantalla. Se enfoca el input de adentro, no el contenedor.
  useEffect(() => {
    if (!esErrorDeCelular(serverError) || !celularRef.current) return;
    celularRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    celularRef.current.querySelector('input')?.focus();
  }, [serverError]);

  const showError = (key: string) =>
    mensajeDeError(key, { errores: errors, enviado: submitted, serverError });

  // Renderizar modo Edición
  if (isEdit) {
    const celularOk = editForm.celular ? /^9\d{8}$/.test(editForm.celular) : false;

    return (
      <div className="bg-bg p-0 flex flex-col gap-6 text-text animate-in fade-in-0 duration-300">
        <DatosPersonalesSection
          form={editForm}
          onChange={setEdit}
          showError={showError}
          isDniLocked
          celularOk={celularOk}
          celularRef={celularRef}
        />

        <SectionCard icon={<Briefcase className="w-5 h-5" />} title="Detalles del Puesto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px]">
            <SelectField
              label="Nivel Educativo a Cargo"
              required
              disabled
              value={editForm.nivelEducativo}
              onChange={(v) =>
                setEdit('nivelEducativo', v as 'Inicial' | 'Primaria' | 'Secundaria')
              }
              options={[
                { value: 'Inicial', label: 'Inicial' },
                { value: 'Primaria', label: 'Primaria' },
                { value: 'Secundaria', label: 'Secundaria' },
              ]}
              placeholder="Seleccione Nivel"
              error={showError('nivelEducativo')}
            />
            <TextField
              label="Carga Horaria (Horas)"
              required
              disabled
              value="40"
              onChange={() => {}}
              placeholder="40"
            />
          </div>
        </SectionCard>

        <div className="flex justify-end gap-3 mt-2">
          <FormButton variant="secondary" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </FormButton>
          <FormButton onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
          </FormButton>
        </div>
      </div>
    );
  }

  // --- Renderizar modo Creación (Promoción de Especialista) ---
  return (
    <div className="bg-bg p-0 flex flex-col gap-6 text-text animate-in fade-in-0 duration-300">
      {fetchError && (
        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive text-sm font-medium">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {fetchError}
        </div>
      )}

      {/* Sección: Filtro y Selección */}
      <SectionCard icon={<Search className="w-5 h-5" />} title="Filtro y Selección de Especialista">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SelectField
            label="1. Filtrar por Nivel Educativo"
            required
            value={createForm.nivelEducativo}
            onChange={handleCreateLevelChange}
            options={[
              { value: 'Inicial', label: 'Inicial', disabled: takenLevels.includes('Inicial') },
              { value: 'Primaria', label: 'Primaria', disabled: takenLevels.includes('Primaria') },
              { value: 'Secundaria', label: 'Secundaria', disabled: takenLevels.includes('Secundaria') },
            ]}
            placeholder="Seleccione Nivel"
            error={showError('nivelEducativo')}
          />

          <SelectField
            label="2. Seleccionar Especialista Candidato"
            required
            value={createForm.specialistId}
            onChange={(v) => setCreateForm((prev) => ({ ...prev, specialistId: v }))}
            options={candidates.map((c) => ({
              value: c.id,
              label: `${c.persona.apellidos}, ${c.persona.nombres} (DNI: ${c.persona.dni})`,
            }))}
            placeholder={
              loadingSpecialists
                ? 'Cargando especialistas...'
                : candidates.length === 0
                  ? 'No hay candidatos disponibles en este nivel'
                  : 'Seleccione un especialista'
            }
            disabled={loadingSpecialists || candidates.length === 0}
            error={showError('specialistId')}
          />
        </div>

        {candidates.length === 0 && !loadingSpecialists && (
          <div className="mt-4 flex items-start gap-2.5 bg-warning/10 border border-warning/20 rounded-xl p-3.5 text-warning text-xs leading-relaxed">
            <Info className="w-4.5 h-4.5 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Nota:</span> No se encontraron especialistas activos
              con cargo de <strong>Especialista</strong> en el nivel educativo de{' '}
              <strong>{createForm.nivelEducativo}</strong>. Para promover a alguien, primero debe
              estar registrado como Especialista de este nivel.
            </div>
          </div>
        )}
      </SectionCard>

      {/* Sección: Vista Previa y Datos a Confirmar */}
      {selectedSpecialist && (
        <div className="animate-in slide-in-from-bottom-2 duration-300">
          <SectionCard
            icon={<Shield className="w-5 h-5" />}
            title="Confirmar Ascenso a Jefe de Área"
          >
            <div className="p-4 bg-muted/30 border border-border/80 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
              <div>
                <h4 className="text-sm font-bold text-text mb-1">
                  Se promoverá al especialista seleccionado
                </h4>
                <p className="text-xs text-text-muted">
                  Esta acción actualizará su cargo actual a &quot;Jefe de Área&quot; y le otorgará
                  el rol correspondiente en el sistema.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-lg text-primary">
                  Cargo: Jefe de Área
                </span>
                <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 bg-success/10 border border-success/20 rounded-lg text-success">
                  Carga: 40 hrs
                </span>
                <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 bg-secondary/10 border border-secondary/20 rounded-lg text-secondary">
                  Nivel: {createForm.nivelEducativo}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px]">
              <TextField
                label="Nombres y Apellidos"
                disabled
                value={`${selectedSpecialist.persona.nombres} ${selectedSpecialist.persona.apellidos}`}
                onChange={() => {}}
              />
              <TextField
                label="DNI"
                disabled
                value={selectedSpecialist.persona.dni}
                onChange={() => {}}
              />
              <TextField
                label="Correo Electrónico"
                disabled
                value={selectedSpecialist.persona.correo || 'No registrado'}
                onChange={() => {}}
              />
              <TextField
                label="Número de Celular"
                disabled
                value={selectedSpecialist.persona.telefono || 'No registrado'}
                onChange={() => {}}
              />
            </div>
          </SectionCard>
        </div>
      )}

      {/* Botones de Envío */}
      <div className="flex justify-end gap-3 mt-2">
        <FormButton variant="secondary" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </FormButton>
        <FormButton onClick={handleSave} disabled={isLoading || !selectedSpecialist}>
          {isLoading ? 'Guardando...' : 'Confirmar Ascenso'}
        </FormButton>
      </div>
    </div>
  );
};
