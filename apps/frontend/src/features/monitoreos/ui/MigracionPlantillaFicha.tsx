import { ModalMigracionPlantilla } from './ModalMigracionPlantilla';
import type { PlantillaVersionada } from '../hooks/use-ficha-persistence';

interface MigracionPlantillaFichaProps {
  /** Datos del rechazo por plantilla versionada. `null` cierra el flujo. */
  contexto: PlantillaVersionada | null;
  abierto: boolean;
  /** Descarta la migración. Deja abierto el formulario de ficha que la originó. */
  onDescartar: () => void;
  /**
   * La migración se resolvió, ya sea migrando o siguiendo con la versión
   * anterior. Cierra también el formulario de ficha.
   */
  onResuelto: () => void;
}

/**
 * Flujo de migración cuando la plantilla en uso pasó a Histórico (ILA-0046).
 *
 * Las dos salidas que resuelven —migrar y seguir con la versión anterior—
 * terminan en el mismo reseteo, que estaba escrito dos veces en
 * `CalendarioSidebar`. Descartar es distinto y se mantiene separado: devuelve al
 * formulario sin cerrarlo, que es el comportamiento original.
 *
 * Vive en `features/monitoreos` (y no en `widgets/calendario`, donde estaba
 * antes) porque lo reutiliza también `LlenarFichaPage`: un widget no puede
 * depender de otro, y esto ya no es propio del calendario.
 */
export const MigracionPlantillaFicha = ({
  contexto,
  abierto,
  onDescartar,
  onResuelto,
}: MigracionPlantillaFichaProps) => {
  if (!contexto) return null;

  const migrar = async () => {
    const { fichasApi } = await import('../api/fichas.api');
    const ficha = await fichasApi.findByVisita(contexto.visitId);
    if (ficha && contexto.plantillaVigenteId) {
      await fichasApi.migrarPlantilla(ficha.id, contexto.plantillaVigenteId);
    }
    onResuelto();
  };

  return (
    <ModalMigracionPlantilla
      isOpen={abierto}
      onClose={onDescartar}
      fichaId={contexto.visitId}
      plantillaActualId=""
      plantillaNuevaId={contexto.plantillaVigenteId ?? ''}
      plantillaNuevaNombre={contexto.plantillaVigenteNombre}
      onMigrar={migrar}
      onFinalizarConV1={async () => onResuelto()}
    />
  );
};
