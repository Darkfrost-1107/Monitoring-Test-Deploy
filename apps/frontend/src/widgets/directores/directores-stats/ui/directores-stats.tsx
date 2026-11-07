import { Users, BadgeCheck, UserCog, Briefcase } from 'lucide-react';
import type { Docente } from '@entities/model-docentes';
import { EntityStats } from '@shared/ui/EntityStats';

interface Props {
  directores: Docente[];
  titlePrefix?: string;
}

export const DirectoresStatsWidget = ({ directores, titlePrefix = 'Directores' }: Props) => {
  const total = directores.length;
  const designados = directores.filter((d) => d.condicion === 'Designado').length;
  const encargados = directores.filter((d) => d.condicion === 'Encargado').length;
  const porFuncion = directores.filter((d) => d.condicion === 'Por Función').length;

  return (
    <EntityStats
      columns={4}
      cards={[
        {
          title: `Total ${titlePrefix}`,
          icon: <Users className="w-5 h-5 text-primary" strokeWidth={2} />,
          value: total,
          trendText: `${total} registrados en el padrón`,
        },
        {
          title: 'Designados',
          icon: <BadgeCheck className="w-5 h-5 text-green-500" strokeWidth={2} />,
          value: designados,
          trendText: 'Con plaza asignada',
          trendType: 'success',
        },
        {
          title: 'Encargados',
          icon: <UserCog className="w-5 h-5 text-amber-500" strokeWidth={2} />,
          value: encargados,
          trendText: 'Encargatura vigente',
          trendType: 'warning',
        },
        {
          title: 'Por Función',
          icon: <Briefcase className="w-5 h-5 text-blue-500" strokeWidth={2} />,
          value: porFuncion,
          trendText: 'Designado por función',
        },
      ]}
    />
  );
};
