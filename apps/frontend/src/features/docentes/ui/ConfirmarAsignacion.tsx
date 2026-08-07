import { Briefcase, Shield } from 'lucide-react';
import { SectionCard, SelectField, TextField } from '@shared/ui/form-controls';
import { twoCols } from '@shared/ui/form-controls.types';
import type { Docente } from '@entities/model-docentes';
import {
  CONDICIONES_DEL_CARGO,
  cargaHorariaDelCargo,
  type CargoAsignable,
  type CondicionDelCargo,
} from '../lib/asignacion-de-cargo';

/**
 * Los dos bloques que aparecen una vez elegido el docente: lo que se va a
 * cambiar y lo que se confirma sin editar.
 */

interface Props {
  cargo: CargoAsignable;
  docente: Docente;
  condicion: CondicionDelCargo;
  onCondicionChange: (condicion: CondicionDelCargo) => void;
  cargaHoraria: number;
  onCargaHorariaChange: (horas: number) => void;
}

export const ConfirmarAsignacion = ({
  cargo,
  docente,
  condicion,
  onCondicionChange,
  cargaHoraria,
  onCargaHorariaChange,
}: Props) => {
  const cargaFija = cargo === 'Coordinador Pedagógico';

  return (
    <div className="animate-in slide-in-from-bottom-2 duration-300 flex flex-col gap-6">
      <SectionCard icon={<Briefcase className="w-5 h-5" />} title="Detalles de la Asignación">
        <div className="p-4 bg-muted/30 border border-border/80 rounded-xl mb-5">
          <h4 className="text-sm font-bold text-text mb-1">Requisitos del Cargo</h4>
          <p className="text-xs text-text-muted">
            El cargo de {cargo} requiere condición laboral <strong>Nombrado</strong> o{' '}
            <strong>Destacado</strong>.
            {cargaFija && (
              <span>
                {' '}
                La carga horaria se actualizará automáticamente a{' '}
                <strong>{cargaHorariaDelCargo(cargo, null)} horas</strong>.
              </span>
            )}
          </p>
        </div>

        <div style={twoCols}>
          <SelectField
            label="Condición Laboral en el Cargo"
            required
            value={condicion}
            onChange={(v) => onCondicionChange(v as CondicionDelCargo)}
            options={CONDICIONES_DEL_CARGO.map((c) => ({ value: c, label: c }))}
            placeholder="Seleccione Condición"
          />

          {cargaFija ? (
            <TextField
              label="Carga Horaria Requerida (Horas)"
              disabled
              value={String(cargaHoraria)}
              onChange={() => {}}
            />
          ) : (
            <TextField
              label="Carga Horaria (Horas)"
              required
              value={String(cargaHoraria)}
              onChange={(v) => onCargaHorariaChange(Number(v.replace(/\D/g, '')))}
              placeholder="Carga horaria en horas"
            />
          )}
        </div>
      </SectionCard>

      <SectionCard icon={<Shield className="w-5 h-5" />} title="Confirmar Datos del Docente">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px]">
          <DatoConfirmado
            label="Docente Seleccionado"
            value={`${docente.apellidos}, ${docente.nombres}`}
          />
          <DatoConfirmado label="DNI" value={docente.dni} />
          <DatoConfirmado label="Correo Electrónico" value={docente.correo || 'No registrado'} />
          <DatoConfirmado label="Especialidad" value={docente.especialidad || 'No registrada'} />
        </div>
      </SectionCard>
    </div>
  );
};

/** Dato que se muestra para confirmar, no para editar. */
const DatoConfirmado = ({ label, value }: { label: string; value: string }) => (
  <TextField label={label} disabled value={value} onChange={() => {}} />
);
