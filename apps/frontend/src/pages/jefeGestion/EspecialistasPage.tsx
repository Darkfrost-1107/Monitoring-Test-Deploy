import { useState, useEffect } from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { PageHeader } from '@shared/ui/pageHeader';
import { Spinner } from '@shared/ui/Spinner';
import { useNavigate } from 'react-router-dom';

import { FilterEspecialistas } from '@features/especialistas';
import { EspecialistasStatsWidget, EspecialistasTableWidget } from '@widgets/especialistas';
import { fetchEspecialistas } from '@features/especialistas/especialista-service';
import type { Especialista } from '@entities/model-especialistas';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';

/**
 * Quiénes tienen registro de especialista pero no son especialistas de la UGEL.
 *
 * Dos grupos distintos, por dos razones distintas:
 *
 * ── Personal de institución ──
 * Coordinador pedagógico, jefe de taller, director de I.E. y docente llevan un
 * registro de especialista sólo para poder monitorear dentro de su propio
 * colegio.
 *
 * ── Conducción de la UGEL ──
 * El Director de UGEL y el Jefe de Gestión se registran en el padrón con cargo
 * «Especialista» —el cargo describe su plaza y el rol su función— y por eso caían
 * en este listado mientras ocupaban su puesto. Ocupan un cargo de conducción, no
 * una plaza de acompañamiento: al ser relevados vuelven a aparecer acá si su rol
 * pasa a ser especialista.
 */
const ROLES_QUE_NO_SON_ESPECIALISTA_UGEL: readonly string[] = [
  RoleCode.COORDINADOR_PEDAGOGICO,
  RoleCode.JEFE_TALLER,
  RoleCode.DIRECTOR_INSTITUCION,
  RoleCode.DOCENTE,
  RoleCode.DIRECTOR_UGEL,
  RoleCode.JEFE_GESTION,
];

export const EspecialistasPage = () => {
  const navigate = useNavigate();
  const [especialistas, setEspecialistas] = useState<Especialista[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEspecialistas = async () => {
    setLoading(true);
    const mapped = await fetchEspecialistas({ cargo: 'Especialista' });
    const filtered = mapped.filter(
      (esp) =>
        esp.cargo === 'Especialista' && !ROLES_QUE_NO_SON_ESPECIALISTA_UGEL.includes(esp.rolCode ?? ''),
    );
    setEspecialistas(filtered);
    setLoading(false);
  };

  useEffect(() => {
    Promise.resolve().then(() => loadEspecialistas());
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex flex-col justify-center items-center gap-3">
        <Spinner />
        <span className="text-text-muted text-sm font-medium">Cargando especialistas...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-6">
      <PageHeader
        title="Gestión de Especialistas"
        description="Padrón oficial de especialistas de monitoreo pedagógico de la jurisdicción."
        action={
          <Button
            onClick={() => navigate('/especialistas/nuevo')}
            className="flex items-center gap-2 font-bold cursor-pointer bg-primary hover:bg-primary-hover text-white"
          >
            <PlusCircle className="w-[18px] h-[18px]" strokeWidth={2} />
            Registrar Especialista
          </Button>
        }
      />

      {/* 1. Indicadores de Estado */}
      <EspecialistasStatsWidget especialistas={especialistas} />

      {/* 2. Barra de Filtros */}
      <FilterEspecialistas />

      {/* 3. Tabla de Datos */}
      <EspecialistasTableWidget
        especialistas={especialistas}
        setEspecialistas={setEspecialistas}
        onView={(esp) => navigate(`/especialistas/${esp.id}`)}
      />
    </div>
  );
};
