import { AlertCircle } from 'lucide-react';
import { SelectField } from '@shared/ui/form-controls';
import type { FormularioCronograma } from '@features/cronogramas/lib/formulario';
import type { Opcion } from '@features/cronogramas/lib/opciones-de-asignacion';
import {
  etiquetaDe,
  type OpcionesDelFormulario,
  type PerfilDelFormulario,
} from './tipos-del-formulario';
import { CampoFijo } from './CampoFijo';

/**
 * La cascada de asignación: modalidad → nivel → especialista e institución.
 *
 * Eran cien líneas dentro de `ModalCronograma`, con tres condicionales
 * anidados por perfil de usuario entremezclados en el mismo bloque.
 */

interface Props {
  form: FormularioCronograma;
  onCambiar: <K extends keyof FormularioCronograma>(
    campo: K,
    valor: FormularioCronograma[K],
  ) => void;
  opciones: OpcionesDelFormulario;
  perfil: PerfilDelFormulario;
}

export const CamposDeAsignacion = ({ form, onCambiar, opciones, perfil }: Props) => {
  const faltaCascada = !form.modalidad || !form.nivel;

  /** Qué decir cuando la lista está vacía, y por qué motivo. */
  const marcador = (vacio: string, lleno: string, cantidad: number) =>
    faltaCascada ? 'Seleccione modalidad y nivel...' : cantidad === 0 ? vacio : lleno;

  return (
    <>
      {!perfil.esDirector && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField
              label="Modalidad Educativa *"
              value={form.modalidad}
              onChange={(valor) => onCambiar('modalidad', valor)}
              placeholder="Seleccionar modalidad..."
              options={opciones.modalidades.map((m) => ({ value: m, label: m }))}
            />
            <SelectField
              label="Nivel Educativo *"
              value={form.nivel}
              onChange={(valor) => onCambiar('nivel', valor)}
              placeholder={form.modalidad ? 'Seleccionar nivel...' : 'Seleccione modalidad primero'}
              options={opciones.niveles.map((n) => ({ value: n, label: n }))}
            />
          </div>

          {faltaCascada && (
            <Aviso>
              Seleccione modalidad y nivel educativo para habilitar la selección de especialista e
              institución.
            </Aviso>
          )}
        </>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          {perfil.esDirector ? (
            perfil.esSecundaria ? (
              <SelectField
                label="Evaluador *"
                value={form.monitorId}
                onChange={(valor) => onCambiar('monitorId', valor)}
                placeholder="Seleccionar evaluador..."
                options={opciones.evaluadores}
                disabled={perfil.esCoordinadorOTaller}
              />
            ) : (
              <CampoFijo
                etiqueta="Evaluador *"
                valor={etiquetaDe(opciones.evaluadores, form.monitorId)}
              />
            )
          ) : (
            <CampoConRecuento
              label="Especialista (filtro por nivel) *"
              value={form.monitorId}
              onChange={(valor) => onCambiar('monitorId', valor)}
              placeholder={marcador(
                'No hay especialistas para este nivel',
                'Seleccionar especialista...',
                opciones.especialistas.length,
              )}
              opciones={opciones.especialistas}
              recuento={
                faltaCascada
                  ? null
                  : `${opciones.especialistas.length} especialista(s) de ${form.modalidad} - ${form.nivel}`
              }
            />
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          {perfil.esDirector ? (
            <CampoFijo
              etiqueta="Institución Educativa *"
              valor={etiquetaDe(opciones.instituciones, form.institucionId)}
            />
          ) : (
            <CampoConRecuento
              label="Institución Educativa (filtro) *"
              value={form.institucionId}
              onChange={(valor) => onCambiar('institucionId', valor)}
              placeholder={marcador(
                'No hay instituciones para este nivel',
                'Seleccionar institución...',
                opciones.instituciones.length,
              )}
              opciones={opciones.instituciones}
              recuento={
                faltaCascada
                  ? null
                  : `${opciones.instituciones.length} institución(es) de ${form.modalidad} - ${form.nivel}`
              }
            />
          )}
        </div>
      </div>
    </>
  );
};

export const Aviso = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-2 bg-primary/5 border border-primary/15 rounded-xl p-3 text-primary text-xs">
    <AlertCircle className="w-4 h-4 shrink-0" />
    <span>{children}</span>
  </div>
);

/** Selector con el recuento de lo que la cascada dejó disponible. */
const CampoConRecuento = ({
  label,
  value,
  onChange,
  placeholder,
  opciones,
  recuento,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  placeholder: string;
  opciones: Opcion[];
  recuento: string | null;
}) => (
  <>
    <SelectField
      label={label}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      options={opciones}
    />
    {recuento && opciones.length > 0 && (
      <span className="text-[10px] text-text-muted pl-1">{recuento}</span>
    )}
  </>
);
