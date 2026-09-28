import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { Cronograma } from '@entities/model-cronogramas';
import type { Plantilla } from '@entities/model-plantillas';
import type { DatosFicha } from '../lib/ficha-estado';
import { useFichaPersistence, type PlantillaVersionada } from '../hooks/use-ficha-persistence';
import { LlenarFichaForm } from './LlenarFichaForm';
import { MigracionPlantillaFicha } from './MigracionPlantillaFicha';

/**
 * Página de "llenar ficha".
 *
 * Era un modal (`LlenarFichaForm` con `isOpen`/`onClose`) sobre un fondo
 * oscuro con alto recortado a 90vh: mucha información —criterios, rúbrica,
 * cierre— para una ventana flotante. Pasa a ser una página con su propia
 * ruta, para que use el alto disponible como cualquier otra página del
 * sistema.
 *
 * El calendario y los reportes ya tienen `visit` y `template` resueltos
 * (nombres denormalizados, plantilla aplicable ya elegida) al momento de
 * abrir la ficha: se los pasa por `location.state` en vez de volver a
 * resolverlos acá, lo que exigiría duplicar esa lógica o traer de vuelta la
 * lista completa de cronogramas sólo para sacar uno. Si la página se abre sin
 * ese estado —recargando el navegador, por ejemplo— no hay de dónde
 * traerlos: hoy no existe ningún enlace directo a esta ficha fuera de esos
 * dos orígenes, así que se pide reabrirla desde ahí en vez de inventar una
 * segunda forma de resolver los mismos datos.
 */

interface LlenarFichaLocationState {
  visit?: Cronograma;
  template?: Plantilla;
  initialState?: DatosFicha;
}

export const LlenarFichaPage = () => {
  const { visitaId } = useParams<{ visitaId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const { visit, template, initialState } =
    (location.state as LlenarFichaLocationState | null) ?? {};

  const volver = () => navigate(-1);

  // ILA-0046: la plantilla en uso pasó a Histórico mientras se llenaba la
  // ficha; se ofrece migrar. La misma lógica que ya usaba `CalendarioSidebar`.
  const [migracionContext, setMigracionContext] = useState<PlantillaVersionada | null>(null);

  const { guardarBorrador, finalizar } = useFichaPersistence({
    plantillaId: template?.id,
    onPersistido: volver,
    onPlantillaVersionada: setMigracionContext,
  });

  const descartarMigracion = () => setMigracionContext(null);
  const resolverMigracion = () => {
    descartarMigracion();
    volver();
  };

  if (!visit || !template || visit.id !== visitaId) {
    return (
      <div className="w-full max-w-[600px] mx-auto text-center py-20 bg-surface border border-border rounded-2xl shadow-sm mt-6">
        <h2 className="text-xl font-bold text-text mb-2">No se pudo abrir la ficha</h2>
        <p className="text-text-muted mb-6">
          Volvé a abrirla desde el Calendario o desde Reportes.
        </p>
        <button
          onClick={volver}
          className="px-5 py-2.5 bg-bg border border-border rounded-xl font-semibold text-text hover:bg-muted transition-colors cursor-pointer"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <>
      <LlenarFichaForm
        isOpen
        onClose={volver}
        visit={visit}
        template={template}
        initialState={initialState}
        onSave={guardarBorrador}
        onFinalize={finalizar}
      />

      <MigracionPlantillaFicha
        contexto={migracionContext}
        abierto={migracionContext !== null}
        onDescartar={descartarMigracion}
        onResuelto={resolverMigracion}
      />
    </>
  );
};
