import { BadgeCheck, Users, Briefcase } from 'lucide-react';
import { EntityStats } from '@shared/ui/EntityStats';
import type { Candidato } from '../superadmin.api';
import type { CargoDesignable } from '../cargos-designables';

/**
 * Quién ocupa hoy cada cargo de la dupla directiva y cuánta gente hay elegible.
 *
 * Eran cuarenta líneas de arreglo dentro de `SuperadminPanel`, con los mismos
 * ternarios sobre el cargo repetidos en cada tarjeta.
 */

interface Props {
  cargo: CargoDesignable;
  contraparte: CargoDesignable;
  enElCargo?: Candidato;
  enLaContraparte?: Candidato;
  elegibles: number;
}

const nombreDe = (candidato: Candidato) => `${candidato.nombres} ${candidato.apellidos}`;

export const ResumenDeDesignaciones = ({
  cargo,
  contraparte,
  enElCargo,
  enLaContraparte,
  elegibles,
}: Props) => (
  <EntityStats
    columns={3}
    cards={[
      {
        title: `${cargo.nombreCorto} Actual`,
        value: enElCargo ? nombreDe(enElCargo) : 'Sin designar',
        icon: (
          <BadgeCheck
            className={`w-5 h-5 ${enElCargo ? 'text-emerald-500' : 'text-danger'}`}
            strokeWidth={2}
          />
        ),
        trendText: enElCargo ? enElCargo.correo || 'Designación activa' : 'Cargo vacante',
        trendType: enElCargo ? 'success' : 'danger',
        valueClassName: 'text-xl',
      },
      {
        title: 'Especialistas Elegibles',
        value: elegibles,
        icon: <Users className="w-5 h-5 text-primary" strokeWidth={2} />,
        trendText: 'Disponibles para designación',
        trendType: 'neutral',
      },
      {
        title: contraparte.nombre,
        value: enLaContraparte ? nombreDe(enLaContraparte) : 'Sin designar',
        icon: <Briefcase className="w-5 h-5 text-amber-500" strokeWidth={2} />,
        trendText: enLaContraparte ? 'Dupla directiva activa' : 'Cargo de contraparte vacante',
        trendType: enLaContraparte ? 'warning' : 'neutral',
        valueClassName: 'text-xl',
      },
    ]}
  />
);
