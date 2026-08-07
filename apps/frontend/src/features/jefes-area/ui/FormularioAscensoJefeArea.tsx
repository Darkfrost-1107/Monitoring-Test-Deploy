import { useState, useMemo } from 'react';
import { Search, AlertCircle, Shield, Info } from 'lucide-react';
import { FormButton, SectionCard, SelectField, TextField } from '@shared/ui/form-controls';
import { mensajeDeError } from '@shared/lib/errores-formulario';
import { extractErrors } from '@shared/hooks/usePersonForm';
import { CARGA_HORARIA } from '@shared/config/constants';
import { jefeAreaCreateSchema } from '@entities/model-jefes-area/validator';
import type { JefeAreaCreateFormData } from '@entities/model-jefes-area/validator';
import { useEspecialistasActivos } from '../hooks/use-especialistas-activos';
import { candidatosDelNivel, opcionesDeNivel, type NivelJefeArea } from '../lib/niveles-jefe-area';

/**
 * Ascenso de un especialista a Jefe de Área.
 *
 * No se registra a nadie nuevo: se promueve a alguien que ya está en la plana,
 * del mismo nivel educativo. Por eso el formulario no pide datos personales —
 * los muestra para confirmar— y lo único que se elige es el nivel y la persona.
 */

/** Lo que el ascenso le manda al servicio, con los datos de la persona ya resueltos. */
export interface DatosDeAscenso extends JefeAreaCreateFormData {
  nombres: string;
  apellidos: string;
  correo?: string;
  celular?: string;
  cargaHoraria: number;
}

interface Props {
  isLoading: boolean;
  serverError?: string | null;
  onSubmit: (data: DatosDeAscenso) => void;
  onCancel: () => void;
}

export const FormularioAscensoJefeArea = ({
  isLoading,
  serverError,
  onSubmit,
  onCancel,
}: Props) => {
  const { especialistas, ocupados, nivelInicial, cargando, error } = useEspecialistasActivos(true);

  // El nivel elegido a mano gana sobre el sugerido; mientras nadie elija, se
  // sigue al primero libre, que sólo se conoce después de cargar la plana.
  const [nivelElegido, setNivelElegido] = useState<NivelJefeArea | null>(null);
  const [specialistId, setSpecialistId] = useState('');
  const [enviado, setEnviado] = useState(false);

  const nivel = nivelElegido ?? nivelInicial;
  const sinNivelesLibres = !cargando && nivelInicial === null;

  const candidatos = useMemo(
    () => (nivel ? candidatosDelNivel(especialistas, nivel) : []),
    [especialistas, nivel],
  );

  const elegido = useMemo(
    () => candidatos.find((c) => c.id === specialistId) ?? null,
    [candidatos, specialistId],
  );

  const errores = extractErrors(jefeAreaCreateSchema.safeParse({ nivelEducativo: nivel, specialistId }));
  const showError = (campo: string) => mensajeDeError(campo, { errores, enviado, serverError });

  const cambiarNivel = (valor: string) => {
    setNivelElegido(valor as NivelJefeArea);
    // El candidato pertenece al nivel anterior: dejarlo puesto enviaría a
    // alguien que ya no figura en la lista.
    setSpecialistId('');
  };

  const guardar = () => {
    setEnviado(true);
    if (!nivel || !elegido || Object.keys(errores).length > 0) return;

    onSubmit({
      nivelEducativo: nivel,
      specialistId,
      nombres: elegido.persona.nombres,
      apellidos: elegido.persona.apellidos,
      correo: elegido.persona.correo || undefined,
      celular: elegido.persona.telefono || undefined,
      cargaHoraria: CARGA_HORARIA.JEFE_AREA,
    });
  };

  return (
    <div className="bg-bg p-0 flex flex-col gap-6 text-text animate-in fade-in-0 duration-300">
      {error && <AvisoDeError mensaje={error} />}

      {sinNivelesLibres && (
        <AvisoDeError mensaje="Los tres niveles educativos ya tienen un Jefe de Área activo. Para nombrar a otro, primero debe desactivar al vigente del nivel correspondiente." />
      )}

      <SectionCard icon={<Search className="w-5 h-5" />} title="Filtro y Selección de Especialista">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SelectField
            label="1. Filtrar por Nivel Educativo"
            required
            value={nivel ?? ''}
            onChange={cambiarNivel}
            options={opcionesDeNivel(ocupados)}
            placeholder={cargando ? 'Cargando niveles...' : 'Seleccione Nivel'}
            disabled={cargando || sinNivelesLibres}
            error={showError('nivelEducativo')}
          />

          <SelectField
            label="2. Seleccionar Especialista Candidato"
            required
            value={specialistId}
            onChange={setSpecialistId}
            options={candidatos.map((c) => ({
              value: c.id,
              label: `${c.persona.apellidos}, ${c.persona.nombres} (DNI: ${c.persona.dni})`,
            }))}
            placeholder={
              cargando
                ? 'Cargando especialistas...'
                : candidatos.length === 0
                  ? 'No hay candidatos disponibles en este nivel'
                  : 'Seleccione un especialista'
            }
            disabled={cargando || candidatos.length === 0}
            error={showError('specialistId')}
          />
        </div>

        {nivel && candidatos.length === 0 && !cargando && (
          <div className="mt-4 flex items-start gap-2.5 bg-warning/10 border border-warning/20 rounded-xl p-3.5 text-warning text-xs leading-relaxed">
            <Info className="w-4.5 h-4.5 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Nota:</span> No se encontraron especialistas activos
              con cargo de <strong>Especialista</strong> en el nivel educativo de{' '}
              <strong>{nivel}</strong>. Para promover a alguien, primero debe estar registrado como
              Especialista de este nivel.
            </div>
          </div>
        )}
      </SectionCard>

      {elegido && nivel && (
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
                  Esta acción actualizará su cargo actual a &quot;Jefe de Área&quot; y le otorgará el
                  rol correspondiente en el sistema.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Etiqueta tono="primary">Cargo: Jefe de Área</Etiqueta>
                <Etiqueta tono="success">Carga: {CARGA_HORARIA.JEFE_AREA} hrs</Etiqueta>
                <Etiqueta tono="secondary">Nivel: {nivel}</Etiqueta>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px]">
              <CampoDeConfirmacion
                label="Nombres y Apellidos"
                value={`${elegido.persona.nombres} ${elegido.persona.apellidos}`}
              />
              <CampoDeConfirmacion label="DNI" value={elegido.persona.dni} />
              <CampoDeConfirmacion
                label="Correo Electrónico"
                value={elegido.persona.correo || 'No registrado'}
              />
              <CampoDeConfirmacion
                label="Número de Celular"
                value={elegido.persona.telefono || 'No registrado'}
              />
            </div>
          </SectionCard>
        </div>
      )}

      <div className="flex justify-end gap-3 mt-2">
        <FormButton variant="secondary" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </FormButton>
        <FormButton onClick={guardar} disabled={isLoading || !elegido}>
          {isLoading ? 'Guardando...' : 'Confirmar Ascenso'}
        </FormButton>
      </div>
    </div>
  );
};

const AvisoDeError = ({ mensaje }: { mensaje: string }) => (
  <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive text-sm font-medium">
    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
    {mensaje}
  </div>
);

const TONOS = {
  primary: 'bg-primary/10 border-primary/20 text-primary',
  success: 'bg-success/10 border-success/20 text-success',
  secondary: 'bg-secondary/10 border-secondary/20 text-secondary',
} as const;

const Etiqueta = ({
  tono,
  children,
}: {
  tono: keyof typeof TONOS;
  children: React.ReactNode;
}) => (
  <span
    className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 border rounded-lg ${TONOS[tono]}`}
  >
    {children}
  </span>
);

/** Dato que se muestra para confirmar, no para editar. */
const CampoDeConfirmacion = ({ label, value }: { label: string; value: string }) => (
  <TextField label={label} disabled value={value} onChange={() => {}} />
);
