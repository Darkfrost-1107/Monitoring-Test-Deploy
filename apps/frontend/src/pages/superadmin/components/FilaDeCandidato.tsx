import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { Badge } from '@shared/ui/badge';
import { TableCell, TableRow } from '@shared/ui/table';
import type { Candidato } from '../superadmin.api';
import { CARGOS_DESIGNABLES, esRolDesignable, type CargoDesignable } from '../cargos-designables';

/**
 * Una fila del directorio de personal.
 *
 * Eran sesenta líneas dentro del `map` de `SuperadminPanel`, con los colores de
 * la insignia y del botón escritos en ternarios anidados sobre el rol.
 */

const INSIGNIA_NEUTRA = 'bg-slate-50 text-slate-600 border-slate-200';

interface Props {
  candidato: Candidato;
  cargo: CargoDesignable;
  /** ¿Este candidato ya ocupa el cargo que se está designando? */
  yaLoOcupa: boolean;
  /** ¿Ocupa el otro cargo de la dupla y por eso no está disponible? */
  ocupaLaContraparte: boolean;
  designando: boolean;
  bloqueado: boolean;
  onDesignar: () => void;
}

export const FilaDeCandidato = ({
  candidato,
  cargo,
  yaLoOcupa,
  ocupaLaContraparte,
  designando,
  bloqueado,
  onDesignar,
}: Props) => {
  const motivo = yaLoOcupa
    ? 'Ya ocupa este cargo actualmente.'
    : ocupaLaContraparte
      ? `No disponible: ya ejerce como ${candidato.rolActual}.`
      : undefined;

  const insignia = esRolDesignable(candidato.rolCodigo)
    ? CARGOS_DESIGNABLES[candidato.rolCodigo].insignia
    : INSIGNIA_NEUTRA;

  return (
    <TableRow className="hover:bg-muted/30 transition-colors">
      <TableCell className="pl-5 font-semibold text-text">{candidato.dni}</TableCell>
      <TableCell>
        <div className="font-bold text-text text-sm">
          {candidato.nombres} {candidato.apellidos}
        </div>
      </TableCell>
      <TableCell className="text-text-muted text-sm font-medium">
        {candidato.correo || '—'}
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={`text-[0.65rem] py-0.5 px-2.5 uppercase font-bold border ${insignia}`}
        >
          {candidato.rolActual}
        </Badge>
      </TableCell>
      <TableCell className="text-right pr-5">
        <span title={motivo} className="inline-block">
          <Button
            size="sm"
            variant={yaLoOcupa ? 'default' : 'outline'}
            className={`font-semibold cursor-pointer transition-all ${
              yaLoOcupa
                ? cargo.botonDesignado
                : 'text-primary border-primary/20 hover:bg-primary/5 hover:text-primary-hover'
            }`}
            disabled={bloqueado || yaLoOcupa || ocupaLaContraparte}
            onClick={onDesignar}
          >
            {yaLoOcupa ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Designado
              </>
            ) : designando ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                Designando...
              </>
            ) : (
              cargo.accionDesignar
            )}
          </Button>
        </span>
      </TableCell>
    </TableRow>
  );
};
