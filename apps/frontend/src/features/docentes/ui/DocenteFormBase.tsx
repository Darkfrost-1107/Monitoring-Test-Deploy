import { useState, useMemo, useCallback } from 'react';
import type { DocenteFormData } from '@entities/model-docentes/validator';
import { docenteSchema } from '@entities/model-docentes/validator';
import { CARGA_HORARIA } from '@shared/config/constants';
import { FormButton, DatosPersonalesSection } from '@shared/ui/form-controls';
import { useUser } from '@entities/model-user';
import { usePersonForm } from '@shared/hooks/usePersonForm';
import {
  DATOS_BASICOS_VACIOS,
  datosBasicosDePersona,
  escalaMagisterialARomano,
  especialidadDeDocente,
  opcionesDeInstitucion,
  soloDefinidos,
} from '@shared/lib/persona-formulario';
import { ConfirmarRolAdicional } from '@features/personas/ui/ConfirmarRolAdicional';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';
import { DetallesLaboralesDocente } from './DetallesLaboralesDocente';
import { SeccionesACargo } from './SeccionesACargo';

/**
 * Alta y edición de directores y docentes.
 *
 * Eran 521 líneas. Los catálogos de cada selector se calculaban en funciones
 * anónimas dentro de los props, el bloque de secciones traía sus propios
 * estados y rechazaba en silencio, y el modal de rol adicional estaba copiado
 * palabra por palabra desde los formularios de especialista y director.
 */

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

const FORMULARIO_VACIO: DocenteFormData = {
  nombres: '',
  apellidos: '',
  dni: '',
  correo: '',
  celular: '',
  nivelEducativo: 'PRIMARIA',
  condicion: 'Nombrado',
  especialidad: '',
  especialidadesExtras: [],
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
  const esDirectorDeInstitucion = user?.role === RoleCode.DIRECTOR_INSTITUCION;

  const [form, setForm] = useState<DocenteFormData>(() => {
    if (initialData) return initialData;

    // El personal de la I.E. registra dentro de su propia institución y nivel.
    const propia = esDirectorDeInstitucion ? user?.institucion : undefined;
    const nivelPropio = esDirectorDeInstitucion ? user?.institucionNivel : undefined;

    return {
      ...FORMULARIO_VACIO,
      cargo: defaultCargo,
      condicion: defaultCargo === 'Director' ? 'Designado' : 'Nombrado',
      institucionId: propia ?? '',
      nivelEducativo: (nivelPropio?.toUpperCase() as DocenteFormData['nivelEducativo']) ?? 'PRIMARIA',
    };
  });

  const set = <K extends keyof DocenteFormData>(campo: K, valor: DocenteFormData[K]) =>
    setForm((previo) => ({ ...previo, [campo]: valor }));

  const {
    showError,
    celularRef,
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
    schema: docenteSchema,
    form,
    serverError,
    setPersonaFields: useCallback((persona) => {
      const docente = persona.docente;

      setForm((previo) => ({
        ...previo,
        ...datosBasicosDePersona(persona),
        ...soloDefinidos({
          institucionId: docente?.institucionId,
          especialidad: especialidadDeDocente(docente),
          nivelEducativo: docente?.nivelEducativo?.toUpperCase() as
            | DocenteFormData['nivelEducativo']
            | undefined,
          condicion: docente?.condicionLaboral as DocenteFormData['condicion'] | undefined,
          escala: (docente?.escalaMagisterial
            ? escalaMagisterialARomano(docente.escalaMagisterial, '')
            : undefined) as DocenteFormData['escala'] | undefined,
        }),
      }));
    }, []),
    clearPersonaFields: useCallback(() => {
      setForm((previo) => ({
        ...previo,
        ...DATOS_BASICOS_VACIOS,
        especialidad: '',
        institucionId: '',
      }));
    }, []),
  });

  const opcionesIE = useMemo(
    () => opcionesDeInstitucion(instituciones, persona?.docente?.institucion),
    [instituciones, persona],
  );

  const cambiarCargo = (cargo: DocenteFormData['cargo']) =>
    setForm((previo) => ({
      ...previo,
      cargo,
      // Las condiciones directivas y las docentes son conjuntos distintos:
      // conservar la anterior dejaría un valor fuera del catálogo nuevo.
      condicion: cargo === 'Director' ? 'Designado' : 'Nombrado',
    }));

  const cambiarNivel = (nivelEducativo: DocenteFormData['nivelEducativo']) =>
    setForm((previo) => ({
      ...previo,
      nivelEducativo,
      // Fuera de Secundaria la especialidad es «General»; dentro se elige.
      especialidad: nivelEducativo === 'SECUNDARIA' ? '' : 'General',
      // Las áreas adicionales sólo existen en Secundaria: se descartan al salir.
      especialidadesExtras: nivelEducativo === 'SECUNDARIA' ? (previo.especialidadesExtras ?? []) : [],
    }));

  return (
    <div className="bg-bg p-0 flex flex-col gap-5 text-text animate-in fade-in-0 duration-300">
      <DatosPersonalesSection
        form={form}
        onChange={set}
        showError={showError}
        searchingDni={searchingDni}
        dniOk={dniOk}
        celularOk={/^9\d{8}$/.test(form.celular)}
        isDniLocked={isDniLocked}
        dniBloqueadoPorRol={dniBloqueadoPorRol}
        dniMessage={dniMessage}
        roleCheck={roleCheck}
        celularRef={celularRef}
      />

      <DetallesLaboralesDocente
        form={form}
        onChange={set}
        onCambiarCargo={cambiarCargo}
        onCambiarNivel={cambiarNivel}
        showError={showError}
        bloqueado={dniBloqueadoPorRol}
        esDirectorDeInstitucion={esDirectorDeInstitucion}
        institucionPropia={user?.institucionNombre}
        opcionesDeInstitucion={opcionesIE}
        institucionBloqueada={!!persona?.docente?.institucionId}
      />

      {/* El director de I.E. no tiene grados a cargo. */}
      {form.cargo !== 'Director' && (
        <SeccionesACargo
          nivel={form.nivelEducativo}
          secciones={form.secciones ?? []}
          onCambiar={(secciones) => set('secciones', secciones)}
        />
      )}

      <div className="flex justify-end gap-3 mt-2">
        <FormButton variant="secondary" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </FormButton>
        <FormButton onClick={handleSubmit} disabled={isLoading || dniBloqueadoPorRol}>
          {isLoading ? 'Guardando...' : (submitLabel ?? 'Guardar Director/Docente')}
        </FormButton>
      </div>

      {showRoleConfirm && persona && (
        <ConfirmarRolAdicional
          persona={persona}
          nuevoRol={form.cargo}
          onConfirmar={handleConfirmRole}
          onCancelar={() => setShowRoleConfirm(false)}
        />
      )}
    </div>
  );
};
