import { Users, GraduationCap, ShieldAlert } from 'lucide-react';
import type { Docente } from '@entities/model-docentes';
import { EntityStats } from '@shared/ui/EntityStats';
import { useUser } from '@entities/model-user';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';

interface Props {
  docentes: Docente[];
}

export const DocentesStatsWidget = ({ docentes }: Props) => {
  const { user } = useUser();
  const isDirectorIe = user?.role === RoleCode.DIRECTOR_INSTITUCION;

  const total = docentes.length || 1;
  const nombrados = docentes.filter((d) => d.condicion === 'Nombrado').length;
  const contratados = docentes.filter((d) => d.condicion === 'Contratado').length;
  const porcentajeNombrados = Math.round((nombrados / total) * 100);

  if (isDirectorIe) {
    const activos = docentes.filter((d) => d.activo).length;
    return (
      <EntityStats
        columns={3}
        className="animate-in fade-in-0 duration-300"
        cards={[
          {
            title: 'Total de Docentes',
            icon: <Users className="w-5 h-5 text-primary" strokeWidth={2} />,
            value: docentes.length,
            progressValue: Math.round((activos / total) * 100),
            trendText: `${activos} Activos / ${docentes.length - activos} Inactivos`,
          },
          {
            title: 'Docentes Nombrados',
            icon: <GraduationCap className="w-5 h-5 text-green-500" strokeWidth={2} />,
            value: nombrados,
            progressValue: porcentajeNombrados,
            trendText: `${porcentajeNombrados}% con estabilidad laboral`,
          },
          {
            title: 'Docentes Contratados',
            icon: <ShieldAlert className="w-5 h-5 text-amber-500" strokeWidth={2} />,
            value: contratados,
            trendText: 'Contratos temporales vigentes',
            trendType: 'warning',
          },
        ]}
      />
    );
  }

  const directores = docentes.filter((d) => d.cargo === 'Director').length;
  const coordinadores = docentes.filter((d) => d.cargo === 'Coordinador Pedagógico').length;
  const directivosTotal = directores + coordinadores;

  return (
    <EntityStats
      columns={3}
      cards={[
        {
          title: 'Total de Personal',
          icon: <Users className="w-5 h-5 text-primary" strokeWidth={2} />,
          value: docentes.length,
          progressValue: porcentajeNombrados,
          trendText: `${nombrados} Nombrados / ${contratados} Contratados`,
        },
        {
          title: 'Personal Directivo',
          icon: <GraduationCap className="w-5 h-5 text-green-500" strokeWidth={2} />,
          value: directivosTotal,
          progressValue: Math.round((directivosTotal / total) * 100),
          trendText: `${directores} Directores / ${coordinadores} Coor.`,
        },
        {
          title: 'Contratados en Espera / Otros',
          icon: <ShieldAlert className="w-5 h-5 text-amber-500" strokeWidth={2} />,
          value: contratados,
          trendText: 'Requieren renovación oportuna',
          trendType: 'warning',
        },
      ]}
    />
  );
};
