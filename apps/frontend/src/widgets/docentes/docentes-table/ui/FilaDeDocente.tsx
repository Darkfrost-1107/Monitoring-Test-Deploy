import { TableCell, TableRow } from '@shared/ui/table';
import { Badge } from '@shared/ui/badge';
import { FastActions } from '@shared/ui/FastActions';
import type { Docente } from '@entities/model-docentes';

/**
 * Una fila del padrón de docentes.
 *
 * Eran cincuenta líneas dentro del `map` de la tabla, con las condiciones de
 * cada acción escritas en línea dentro de los props de `FastActions`.
 */

export interface AccionesDeFila {
  onVer: () => void;
  onEditar?: () => void;
  onReactivar?: () => void;
  onFinalizar?: () => void;
  onAsignar?: () => void;
  /** Rótulo del botón de baja: depende de si el cargo se finaliza o el docente se desactiva. */
  rotuloFinalizar: string;
}

interface Props {
  docente: Docente;
  cargoFinalizado: boolean;
  acciones: AccionesDeFila;
}

export const FilaDeDocente = ({ docente, cargoFinalizado, acciones }: Props) => (
  <TableRow className="hover:bg-muted/30 transition-colors">
    <TableCell className="font-semibold pl-5 text-text">{docente.dni}</TableCell>
    <TableCell>
      <div className="font-bold text-text">
        {docente.apellidos}, {docente.nombres}
      </div>
    </TableCell>
    <TableCell className="text-text text-sm">{docente.correo || '—'}</TableCell>
    <TableCell className="text-text text-sm">{docente.celular || '—'}</TableCell>
    <TableCell>
      <div className="text-xs font-medium text-text">{docente.condicion || '—'}</div>
      <div className="text-[0.65rem] text-text-muted mt-0.5">
        Escala: {docente.escala ?? 'no registrada'}
      </div>
    </TableCell>
    <TableCell>
      <div className="flex flex-wrap gap-1">
        {(docente.secciones ?? []).map((seccion) => (
          <Badge
            key={seccion.id ?? `${seccion.grado}-${seccion.seccion}`}
            variant="outline"
            className="text-[0.7rem] py-0.5 px-2.5 font-bold bg-muted/40 text-text border-border"
          >
            {seccion.grado} &laquo;{seccion.seccion}&raquo;
          </Badge>
        ))}
        {(docente.secciones ?? []).length === 0 && (
          <span className="text-xs text-text-muted italic">Sin asignar</span>
        )}
      </div>
    </TableCell>
    <TableCell>
      {cargoFinalizado ? (
        <Badge className="bg-slate-100 text-slate-600 border-slate-200">Cargo Finalizado</Badge>
      ) : (
        <Badge
          className={
            docente.activo
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }
        >
          {docente.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      )}
    </TableCell>
    <TableCell className="text-right pr-5">
      <FastActions
        onView={acciones.onVer}
        onEdit={acciones.onEditar}
        onRestore={acciones.onReactivar}
        onFinalize={acciones.onFinalizar}
        onAssign={acciones.onAsignar}
        viewTitle="Ver ficha"
        restoreTitle="Reactivar docente"
        finalizeTitle={acciones.rotuloFinalizar}
        assignTitle="Asignar Docentes"
      />
    </TableCell>
  </TableRow>
);
