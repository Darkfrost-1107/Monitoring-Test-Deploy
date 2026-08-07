import { Badge } from '@shared/ui/badge';
import { Avatar, AvatarFallback } from '@shared/ui/avatar';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { TableCell, TableHead, TableRow } from '@shared/ui/table';
import { EntityTable } from '@shared/ui/EntityTable';
import { useEntityTable } from '@shared/hooks/useEntityTable';

import type { Institucion } from '@entities/model-instituciones';
import type { VariantProps } from 'class-variance-authority';
import type { badgeVariants } from '@shared/ui/badge-variants';

interface PadronTableProps {
  data: Institucion[];
}

export const PadronTable = ({ data }: PadronTableProps) => {
  const pagination = useEntityTable({
    data,
    defaultPageSize: 10,
    filterFn: (item, params) => {
      const distrito = params.get('distrito');
      const nivel = params.get('nivel');
      const estado = params.get('estado');

      if (distrito && item.distrito !== distrito) return false;
      if (nivel && item.nivel !== nivel) return false;
      if (estado && item.estado !== estado) return false;

      return true;
    }
  });

  const header = (
    <>
      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Código Modular</TableHead>
      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Nombre de la I.E.</TableHead>
      <TableHead className="text-[10px] font-bold uppercase tracking-wider text-center">Nivel</TableHead>
      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Distrito</TableHead>
      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Director Asignado</TableHead>
      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Estado</TableHead>
      <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Acciones</TableHead>
    </>
  );

  return (
    <EntityTable
      header={header}
      pagination={pagination}
      emptyMessage="No se encontraron instituciones educativas"
      itemName="instituciones"
    >
      {pagination.pageItems.map((row) => {
        const nivelLower = row.nivel.toLowerCase();
        const nivelVariant = (nivelLower.includes('inicial') ? 'warning' : nivelLower.includes('primaria') ? 'success' : 'default') as VariantProps<typeof badgeVariants>['variant'];
        const estadoVariant = (row.estado === 'Activa' ? 'success' : 'destructive') as VariantProps<typeof badgeVariants>['variant'];
        const directorInitials = row.director ? row.director.split(' ').map(n => n[0]).slice(0, 2).join('') : '';

        return (
          <TableRow key={row.id} className="group">
            <TableCell className="font-bold text-sm">
              {row.codigoModular}
            </TableCell>
            <TableCell>
              <div className="font-bold text-sm">{row.nombre}</div>
              <div className="text-xs text-text-muted mt-0.5">{row.direccion}</div>
            </TableCell>
            <TableCell className="text-center">
              <Badge variant={nivelVariant} className="text-[10px] uppercase font-bold px-2 py-0.5 tracking-wider">
                {row.nivel}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-text-muted">
              {row.distrito}
            </TableCell>
            <TableCell>
              {directorInitials ? (
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8 bg-primary/10 text-primary">
                    <AvatarFallback className="text-[11px] font-bold">{directorInitials}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-text-muted font-medium">{row.director}</span>
                </div>
              ) : (
                <span className="text-sm text-text-muted italic">{row.director || 'Sin asignar'}</span>
              )}
            </TableCell>
            <TableCell>
              <Badge variant={estadoVariant} className="text-[10px] uppercase font-bold px-2 py-0.5 tracking-wider flex items-center w-max gap-1">
                <span className="w-1 h-1 rounded-full bg-current opacity-70"></span>
                {row.estado}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="w-7 h-7">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="w-7 h-7">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        );
      })}
    </EntityTable>
  );
};
