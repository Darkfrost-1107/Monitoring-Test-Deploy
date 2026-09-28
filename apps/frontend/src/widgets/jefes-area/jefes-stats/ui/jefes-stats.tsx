import { Users, ShieldCheck, Briefcase } from 'lucide-react';
import type { JefeArea } from '@entities/model-jefes-area';
import { EntityStats } from '@shared/ui/EntityStats';

interface JefesStatsWidgetProps {
  jefes: JefeArea[];
}

export const JefesStatsWidget = ({ jefes }: JefesStatsWidgetProps) => {
  const total = jefes.length;
  const activos = jefes.filter((j) => j.activo).length;
  const inactivos = total - activos;

  return (
    <EntityStats
      columns={3}
      cards={[
        {
          title: 'Total de Responsables de Nivel',
          icon: <Users className="w-5 h-5 text-primary" strokeWidth={2} />,
          value: total,
          trendText: `${activos} Activos / ${inactivos} Inactivos`,
          trendType: 'neutral',
        },
        {
          title: 'Responsables de Nivel Activos',
          icon: <ShieldCheck className="w-5 h-5 text-green-500" strokeWidth={2} />,
          value: activos,
          trendText: 'Personal directivo vigente',
          trendType: 'success',
        },
        {
          title: 'Áreas Cubiertas',
          icon: <Briefcase className="w-5 h-5 text-blue-500" strokeWidth={2} />,
          value: total,
          trendText: 'Sedes y coordinaciones',
          trendType: 'neutral',
        },
      ]}
    />
  );
};
