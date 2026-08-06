import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Briefcase, Plus, Trash2, GraduationCap } from 'lucide-react';
import { CONDICION_LABORAL, ESCALAS_MAGISTERIALES } from '@entities/model-docentes';
import { NIVELES, NIVEL_LABEL } from '@entities/model-instituciones';
import type { DocenteFormData } from '@entities/model-docentes/validator';
import { docenteSchema } from '@entities/model-docentes/validator';
import { CARGA_HORARIA } from '@shared/config/constants';
import { FormButton, SectionCard, SelectField, TextField, twoCols, DatosPersonalesSection } from '@shared/ui/form-controls';
import { ConfirmModal } from '@shared/ui/ConfirmModal';
import { Button } from '@shared/ui/button';
import { useUser } from '@entities/model-user';
import { usePersonForm, extractErrors } from '@shared/hooks/usePersonForm';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';

interface Props {
  onCancel: () => void;
  onSubmit: (data: DocenteFormData) => void;
  isLoading: boolean;
  initialData?: DocenteFormData;
  instituciones: { id: string; nombre: string; nivel?: string }[];
  defaultCargo?: 'Director' | 'Coordinador Pedagógico' | 'Jefe de Taller' | 'Docente de Aula';
  submitLabel?: string;
  serverError?: string | null;
}

const CURSOS_POR_NIVEL: Record<string, string[]> = {
  INICIAL: ['Personal Social', 'Psicomotricidad', 'Comunicación', 'Descubrimiento del Mundo'],
  PRIMARIA: [
    'Comunicación',
    'Matemática',
    'Ciencia y Tecnología',
    'Personal Social',
    'Arte y Cultura',
    'Educación Física',
    'Educación Religiosa',
  ],
  SECUNDARIA: [
    'Comunicación',
    'Matemática',
    'Ciencia y Tecnología',
    'Desarrollo Personal, Ciudadanía y Cívica',
    'Ciencias Sociales',
    'Educación Física',
    'Arte y Cultura',
    'Inglés',
    'Educación Religiosa',
    'Educación para el Trabajo',
  ],
};

/* eslint-disable-next-line react-refresh/only-export-components */
export const GRADOS_POR_NIVEL: Record<string, string[]> = {
  INICIAL: ['3 años', '4 años', '5 años'],
  PRIMARIA: ['1°', '2°', '3°', '4°', '5°', '6°'],
  SECUNDARIA: ['1°', '2°', '3°', '4°', '5°'],
};

const INITIAL_FORM: DocenteFormData = {
  nombres: '',
  apellidos: '',
  dni: '',
  correo: '',
  celular: '',
  nivelEducativo: 'PRIMARIA',
  condicion: 'Nombrado',
  especialidad: '',
  cargaHoraria: CARGA_HORARIA.DOCENTE,
  secciones: [],
  escala: 'I',
  institucionId: '',
  activo: true,
  cargo: 'Director',
};

export const DocenteFormBase = ({
  onCancel,
  onSubmit,
  isLoading,
  initialData,
  instituciones,
  defaultCargo = 'Director',
  submitLabel,
  serverError,
}: Props) => {
  const { user } = useUser();
  console.log('User context in DocenteFormBase:', user);
  const isDirectorIe = user?.role === RoleCode.DIRECTOR_INSTITUCION;

  const [form, setForm] = useState<DocenteFormData>(() => {
    if (initialData) return initialData;

    let initialInstId = '';
    let initialNivel: DocenteFormData['nivelEducativo'] = 'PRIMARIA';

    if (isDirectorIe && user?.institucion) {
      initialInstId = user.institucion;
      if (user.institucionNivel) {
        initialNivel = user.institucionNivel.toUpperCase() as DocenteFormData['nivelEducativo'];
      }
    }

    return {
      ...INITIAL_FORM,
      cargo: defaultCargo,
      condicion: defaultCargo === 'Director' ? 'Designado' : 'Nombrado',
      institucionId: initialInstId,
      nivelEducativo: initialNivel,
    };
  });

  const [selectedGrado, setSelectedGrado] = useState(() => {
    const defaultGrados = GRADOS_POR_NIVEL[form.nivelEducativo] || [];
    return defaultGrados[0] || '';
  });
  const [selectedSeccion, setSelectedSeccion] = useState('');

  useEffect(() => {
    const defaultGrados = GRADOS_POR_NIVEL[form.nivelEducativo] || [];
    setTimeout(() => setSelectedGrado(defaultGrados[0] || ''), 0);
  }, [form.nivelEducativo]);

  const set = <K extends keyof DocenteFormData>(key: K, value: DocenteFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const errors = useMemo(() => extractErrors(docenteSchema.safeParse(form)), [form]);

  const {
    submitted,
    persona,
    searchingDni,
    isDniLocked,
    dniMessage,
    dniBloqueadoPorRol,
    showRoleConfirm,
    setShowRoleConfirm,
    handleSubmit,
    handleConfirmRole,
    dniOk,
    roleCheck,
  } = usePersonForm({
    dni: form.dni,
    isNew: !initialData,
    rolObjetivo: form.cargo === 'Director' ? 'director' : 'docente',
    onValidSubmit: () => onSubmit(form),
    isLoading,
    errors,
    setPersonaFields: useCallback((persona) => {
      setForm((prev) => {
        const next = { ...prev };
        next.nombres = persona.nombres;
        next.apellidos = persona.apellidos;
        next.correo = persona.correo ?? '';
        next.celular = persona.telefono ?? '';
        if (persona.docente) {
          if (persona.docente.institucionId) {
            next.institucionId = persona.docente.institucionId;
          }
          if (persona.docente.especialidad) {
            next.especialidad = persona.docente.especialidad;
          } else if (persona.docente.cursoAsignado) {
            next.especialidad = persona.docente.cursoAsignado;
          }
          if (persona.docente.nivelEducativo) next.nivelEducativo = persona.docente.nivelEducativo.toUpperCase() as DocenteFormData['nivelEducativo'];
          if (persona.docente.condicionLaboral) next.condicion = persona.docente.condicionLaboral as DocenteFormData['condicion'];
          if (persona.docente.escalaMagisterial) {
            const mapIntToRoman: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII' };
            next.escala = (mapIntToRoman[persona.docente.escalaMagisterial] || '') as DocenteFormData['escala'];
          }
        }
        return next;
      });
    }, []),
    clearPersonaFields: useCallback(() => {
      set('nombres', '');
      set('apellidos', '');
      set('correo', '');
      set('celular', '');
      set('especialidad', '');
      set('institucionId', '');
    }, []),
  });

  const showError = (key: keyof DocenteFormData) => {
    if (key === 'celular' && esErrorCelular) return serverError ?? '';
    return submitted ? errors[key] : '';
  };

  const opcionesIE = useMemo(() => {
    const list = instituciones.map((i) => ({ value: i.id, label: i.nombre }));
    if (persona?.docente?.institucion) {
      const exists = list.some(i => i.value === persona.docente!.institucion!.id);
      if (!exists) {
        list.push({ value: persona.docente!.institucion!.id, label: persona.docente!.institucion!.nombre });
      }
    }
    return list;
  }, [instituciones, persona]);

  const handleAddSeccion = () => {
    const cleanGrado = selectedGrado.trim();
    const cleanSeccion = selectedSeccion.trim().toUpperCase();
    if (!cleanGrado || !cleanSeccion) return;
    if (cleanSeccion.length !== 1) return;

    const currentSecciones = form.secciones || [];
    const exists = currentSecciones.some(
      (s) =>
        s.grado.toLowerCase() === cleanGrado.toLowerCase() &&
        s.seccion.toLowerCase() === cleanSeccion.toLowerCase(),
    );
    if (exists) return;

    set('secciones', [
      ...currentSecciones,
      {
        id: globalThis.crypto?.randomUUID?.() ?? String(Math.random()),
        grado: cleanGrado,
        seccion: cleanSeccion,
      },
    ]);
    setSelectedSeccion('');
  };

  const handleRemoveSeccion = (id?: string) => {
    if (!id) return;
    const currentSecciones = form.secciones || [];
    set(
      'secciones',
      currentSecciones.filter((s) => s.id !== id),
    );
  };

  const celularRef = useRef<HTMLDivElement>(null);
  const esErrorCelular = serverError?.toLowerCase().includes('celular') || serverError?.toLowerCase().includes('teléfono');

  useEffect(() => {
    if (esErrorCelular && celularRef.current) {
      celularRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      celularRef.current.querySelector('input')?.focus();
    }
  }, [esErrorCelular]);

  const celularOk = /^9\d{8}$/.test(form.celular);

  return (
    <div className="bg-bg p-0 flex flex-col gap-5 text-text animate-in fade-in-0 duration-300">
      {/* Sección 1: Datos Personales Unificados */}
      <DatosPersonalesSection
        form={form}
        onChange={set}
        showError={showError}
        searchingDni={searchingDni}
        dniOk={dniOk}
        celularOk={celularOk}
        isDniLocked={isDniLocked}
        dniBloqueadoPorRol={dniBloqueadoPorRol}
        dniMessage={dniMessage}
        roleCheck={roleCheck}
        celularRef={celularRef}
      />

      {/* Sección 2: Datos Laborales */}
      <SectionCard icon={<Briefcase className="w-5 h-5" />} title="Detalles Laborales">
        <div style={twoCols}>
          <div className="w-full">
            {isDirectorIe ? (
              <div className="flex flex-col gap-1 w-full">
                <label className="text-xs font-bold text-text-muted">
                  Institución de Destino (I.E.)
                </label>
                <div className="flex items-center h-9 px-3 rounded-lg border border-border bg-muted/30 text-text font-medium text-sm">
                  {user?.institucionNombre || 'I.E. No Asignada'}
                </div>
              </div>
            ) : (
              <SelectField
                label="Institución de Destino (I.E.)"
                required
                value={form.institucionId}
                onChange={(v) => set('institucionId', v)}
                options={opcionesIE}
                placeholder="Seleccione la I.E."
                error={showError('institucionId')}
                disabled={isDirectorIe || dniBloqueadoPorRol || !!persona?.docente?.institucionId}
              />
            )}
          </div>
          <SelectField
            label="Cargo / Rol"
            required
            value={form.cargo}
            onChange={(v) => {
              const newCargo = v as DocenteFormData['cargo'];
              setForm((prev) => ({
                ...prev,
                cargo: newCargo,
                condicion: newCargo === 'Director' ? 'Designado' : 'Nombrado',
              }));
            }}
            options={(() => {
              const isSecundary = form.nivelEducativo === 'SECUNDARIA';
              const opts = isSecundary
                ? [
                    { value: 'Coordinador Pedagógico', label: 'Coordinador Pedagógico' },
                    { value: 'Jefe de Taller', label: 'Jefe de Taller' },
                    { value: 'Docente de Aula', label: 'Docente de Aula' },
                  ]
                : [
                    { value: 'Docente de Aula', label: 'Docente de Aula' },
                  ];
              if (form.cargo === 'Director') {
                opts.unshift({ value: 'Director', label: 'Director' });
              }
              return opts;
            })()}
            placeholder="Seleccione Cargo"
            error={showError('cargo')}
            disabled={dniBloqueadoPorRol}
          />
        </div>
        <div style={{ ...twoCols, marginTop: 18 }}>
          <SelectField
            label="Condición Laboral"
            required
            value={form.condicion}
            onChange={(v) => set('condicion', v as DocenteFormData['condicion'])}
            options={(() => {
              if (form.cargo === 'Director') {
                return ['Designado', 'Encargado', 'Por Función'].map((c) => ({
                  value: c,
                  label: c,
                }));
              }
              return CONDICION_LABORAL.map((c) => ({ value: c, label: c }));
            })()}
            placeholder="Seleccione Condición"
            error={showError('condicion')}
            disabled={dniBloqueadoPorRol}
          />
          <SelectField
            label="Escala Magisterial"
            required
            value={form.escala}
            onChange={(v) => set('escala', v as DocenteFormData['escala'])}
            options={ESCALAS_MAGISTERIALES}
            placeholder="Seleccione Escala"
            error={showError('escala')}
            disabled={dniBloqueadoPorRol}
          />
        </div>
        <div style={{ ...twoCols, marginTop: 18 }}>
          {isDirectorIe ? (
            <div className="flex flex-col gap-1 w-full">
              <label className="text-xs font-bold text-text-muted">Nivel Educativo</label>
              <div className="flex items-center h-9 px-3 rounded-lg border border-border bg-muted/30 text-text font-medium text-sm">
                {NIVEL_LABEL[form.nivelEducativo]}
              </div>
            </div>
          ) : (
            <SelectField
              label="Nivel Educativo"
              required
              value={form.nivelEducativo}
              onChange={(v) => {
                const nextNivel = v as DocenteFormData['nivelEducativo'];
                setForm((prev) => ({
                  ...prev,
                  nivelEducativo: nextNivel,
                  especialidad: nextNivel === 'SECUNDARIA' ? '' : 'General',
                }));
              }}
              options={NIVELES.map((n) => ({ value: n, label: NIVEL_LABEL[n] }))}
              placeholder="Seleccione Nivel"
              error={showError('nivelEducativo')}
              disabled={dniBloqueadoPorRol}
            />
          )}
          <SelectField
            label="Especialidad / Mención"
            required={form.nivelEducativo === 'SECUNDARIA'}
            value={form.especialidad || ''}
            onChange={(v) => set('especialidad', v)}
            options={(() => {
              if (form.nivelEducativo === 'PRIMARIA') {
                return ['General', 'PIP', 'Educación Física'].map((c) => ({ value: c, label: c }));
              }
              if (form.nivelEducativo === 'INICIAL') {
                return [{ value: 'General', label: 'General' }];
              }
              const rawCourses = CURSOS_POR_NIVEL['SECUNDARIA'] || [];
              const coursesList = [...rawCourses];
              if (form.especialidad && !coursesList.includes(form.especialidad)) {
                coursesList.push(form.especialidad);
              }
              return coursesList.map((c) => ({ value: c, label: c }));
            })()}
            placeholder="Seleccione Especialidad"
            error={showError('especialidad')}
            disabled={dniBloqueadoPorRol}
          />
        </div>
        <div style={{ marginTop: 18, maxWidth: 'calc(50% - 9px)', minWidth: 240 }}>
          <TextField
            label="Carga Horaria Semanal (Horas)"
            required
            value={String(form.cargaHoraria)}
            onChange={(v) => set('cargaHoraria', Number(v.replace(/\D/g, '')))}
            placeholder="Ej. 30"
            error={showError('cargaHoraria')}
            disabled={dniBloqueadoPorRol}
          />
        </div>
      </SectionCard>

      {/* Sección 3: Secciones y Grados (Relevante para Docentes de Aula) */}
      {form.cargo !== 'Director' && (
        <SectionCard
          icon={<GraduationCap className="w-5 h-5" />}
          title="Grados y Secciones Asignadas"
        >
          <div className="flex flex-col md:flex-row gap-3 items-end max-w-md mb-4">
            <div className="w-full md:w-1/2">
              <SelectField
                label="Grado"
                value={selectedGrado}
                onChange={setSelectedGrado}
                options={(GRADOS_POR_NIVEL[form.nivelEducativo] || []).map((g: string) => ({
                  value: g,
                  label: g,
                }))}
                placeholder="Seleccione Grado"
              />
            </div>
            <div className="w-full md:w-1/3">
              <TextField
                label="Sección"
                value={selectedSeccion}
                onChange={(v) => setSelectedSeccion(v.slice(0, 1))}
                placeholder="Ej. A"
              />
            </div>
            <Button
              type="button"
              onClick={handleAddSeccion}
              className="flex items-center justify-center gap-1.5 h-9 font-semibold bg-primary text-white hover:bg-primary-hover px-4 rounded-lg cursor-pointer w-full md:w-auto"
            >
              <Plus className="w-4 h-4" />
              Añadir
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(form.secciones || []).map((sec) => (
              <div
                key={sec.id}
                className="flex items-center gap-2 bg-muted/50 border border-border px-3 py-1.5 rounded-xl text-sm font-medium text-text"
              >
                <span>
                  {sec.grado} "{sec.seccion}"
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveSeccion(sec.id)}
                  className="text-text-muted hover:text-destructive transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {(form.secciones || []).length === 0 && (
              <span className="text-xs text-text-muted italic">
                No se han asignado grados ni secciones aún.
              </span>
            )}
          </div>
        </SectionCard>
      )}

      {/* Botones de Envío */}
      <div className="flex justify-end gap-3 mt-2">
        <FormButton variant="secondary" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </FormButton>
        <FormButton
          onClick={handleSubmit}
          disabled={isLoading || dniBloqueadoPorRol}
        >
          {isLoading ? 'Guardando...' : submitLabel || 'Guardar Director/Docente'}
        </FormButton>
      </div>

      {showRoleConfirm && persona && (
        <ConfirmModal
          title="Confirmar creación con rol adicional"
          message={
            <div className="text-xs text-slate-600 leading-relaxed space-y-2">
              <p>
                La persona <strong>{persona.nombres} {persona.apellidos}</strong> (DNI {persona.dni}) ya está registrada en el sistema.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-md p-2.5 text-amber-800">
                <p className="font-semibold">Roles actuales:</p>
                <ul className="list-disc list-inside mt-1 text-[0.72rem]">
                  {persona.roles.esDirector && <li>Director de I.E.</li>}
                  {persona.roles.esCoordinadorPedagogico && <li>Coordinador Pedagógico</li>}
                  {persona.roles.esJefeTaller && <li>Jefe de Taller</li>}
                  {persona.roles.esDocenteAula && <li>Docente de Aula</li>}
                  {persona.roles.esEspecialista && <li>{persona.roles.especialistaCargoActivo} ({persona.roles.especialistaNivelEducativo})</li>}
                </ul>
              </div>
              <p>
                Se creará un nuevo registro como <strong>{form.cargo}</strong> además de los roles existentes. ¿Desea continuar?
              </p>
            </div>
          }
          confirmLabel="Sí, crear con rol adicional"
          cancelLabel="Cancelar"
          onConfirm={handleConfirmRole}
          onCancel={() => setShowRoleConfirm(false)}
        />
      )}
    </div>
  );
};
