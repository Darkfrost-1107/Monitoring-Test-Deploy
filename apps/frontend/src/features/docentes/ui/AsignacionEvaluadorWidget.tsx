import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { Search, AlertCircle, Save, CheckCircle2 } from 'lucide-react';
import { TextField } from '@shared/ui/form-controls';
import type { Docente } from '@entities/model-docentes';
import { fetchDocentes } from '@features/docentes/docente-service';
import { esDeEPT } from '../lib/asignacion-de-cargo';
import { teachersApi } from '@shared/api/teachers.api';
import { toast } from 'sonner';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@shared/ui/table';
import { Badge } from '@shared/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@shared/ui/alert-dialog';

interface AsignacionEvaluadorWidgetProps {
  evaluadorId: string;
  evaluadorNombre: string;
  evaluadorCargo: string;
}

export const AsignacionEvaluadorWidget: React.FC<AsignacionEvaluadorWidgetProps> = ({
  evaluadorId,
  evaluadorNombre,
  evaluadorCargo,
}) => {
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [asignados, setAsignados] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const loadDocentes = async () => {
      setLoading(true);
      try {
        const allDocentes = await fetchDocentes();
        // Filtramos para obtener solo Docentes de Aula
        let deAula = allDocentes.filter((d) => d.cargo === 'Docente de Aula' && d.id !== evaluadorId);
        // El Jefe de Taller solo evalúa docentes de EPT (Educación para el Trabajo).
        if (evaluadorCargo === 'Jefe de Taller') {
          deAula = deAula.filter((d) => esDeEPT(d.especialidad));
        }
        setDocentes(deAula);
        
        // Cargar asignados reales
        const res = await teachersApi.getAsignaciones(evaluadorId);
        if (res.ok && res.data) {
          const asignadosIds = res.data.map((a: { evaluadoId: string }) => a.evaluadoId);
          setAsignados(asignadosIds);
        } else {
          setAsignados([]);
        }
      } catch {
        toast.error('Error al cargar docentes de aula');
      } finally {
        setLoading(false);
      }
    };
    loadDocentes();
  }, [evaluadorId, evaluadorCargo]);

  const toggleAsignacion = (docenteId: string) => {
    setAsignados((prev) =>
      prev.includes(docenteId)
        ? prev.filter((id) => id !== docenteId)
        : [...prev, docenteId]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await teachersApi.saveAsignaciones(evaluadorId, asignados);
      if (res.ok) {
        setShowSuccessModal(true);
      } else {
        toast.error('Error al guardar las asignaciones');
      }
    } catch {
      toast.error('Error al guardar las asignaciones');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredDocentes = docentes.filter((d) =>
    `${d.nombres} ${d.apellidos} ${d.especialidad} ${d.dni}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="w-full h-full flex flex-col bg-surface border-border shadow-sm rounded-xl overflow-hidden">
      <CardHeader className="border-b border-border bg-slate-50 p-4 shrink-0">
        <CardTitle className="text-sm font-bold text-slate-800 flex items-center justify-between">
          <span>
            Docentes asignados a <span className="text-primary">{evaluadorNombre}</span> ({evaluadorCargo})
          </span>
          <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded-md">
            {asignados.length} Asignados
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex flex-col gap-4 flex-1 overflow-hidden">
        <div className="flex items-center justify-between gap-4 shrink-0">
          <div className="w-full max-w-sm">
            <TextField
              label=""
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nombre, especialidad o DNI..."
              adornment={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving || loading}
            className="bg-primary hover:bg-primary/90 text-white font-bold text-xs h-9 px-4 rounded-lg flex items-center gap-2 cursor-pointer shadow-sm"
          >
            {isSaving ? (
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
            ) : (
              <Save className="w-4 h-4" />
            )}
            Guardar Asignaciones
          </Button>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center flex-1">
            <span className="text-slate-500 text-xs animate-pulse">Cargando docentes...</span>
          </div>
        ) : (
          <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="overflow-y-auto flex-1">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-[120px] pl-5 font-semibold text-text">DNI</TableHead>
                    <TableHead className="font-semibold text-text">Apellidos y Nombres</TableHead>
                    <TableHead className="font-semibold text-text">Especialidad</TableHead>
                    <TableHead className="font-semibold text-text">Estado</TableHead>
                    <TableHead className="text-right pr-5 font-semibold text-text">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocentes.map((docente) => {
                    const isAsignado = asignados.includes(docente.id);
                    const isAssignedToOther = !!(docente.evaluadorActual && docente.evaluadorActual.evaluadorId !== evaluadorId);
                    
                    return (
                      <TableRow key={docente.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="pl-5 font-semibold text-text">{docente.dni}</TableCell>
                        <TableCell className="font-bold text-text text-sm">
                          {docente.apellidos}, {docente.nombres}
                        </TableCell>
                        <TableCell className="text-text-muted text-sm font-medium">
                          {docente.especialidad || '—'}
                        </TableCell>
                        <TableCell>
                          {isAsignado ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[0.65rem] py-0.5 px-2.5 uppercase font-bold">
                              Asignado
                            </Badge>
                          ) : isAssignedToOther ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[0.65rem] py-0.5 px-2.5 uppercase font-bold max-w-[200px] truncate" title={`Asignado a: ${docente.evaluadorActual?.evaluadorNombres}`}>
                              Ocupado por: {docente.evaluadorActual?.evaluadorNombres}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[0.65rem] py-0.5 px-2.5 uppercase font-bold">
                              Disponible
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-5">
                          {isAsignado ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="font-semibold cursor-pointer h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => toggleAsignacion(docente.id)}
                            >
                              Quitar
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="font-semibold cursor-pointer h-7 text-xs text-primary border-primary/20 hover:bg-primary/5 hover:text-primary-hover"
                              disabled={isAssignedToOther}
                              onClick={() => toggleAsignacion(docente.id)}
                            >
                              Asignar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {filteredDocentes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-text-muted">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <AlertCircle className="w-6 h-6 text-slate-400" />
                          <span className="text-xs font-semibold text-slate-400">No se encontraron docentes de aula.</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>

      {showSuccessModal && (
        <AlertDialog open={true} onOpenChange={setShowSuccessModal}>
          <AlertDialogContent>
            <AlertDialogHeader className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <AlertDialogTitle className="text-lg font-bold text-slate-800">
                  ¡Asignaciones Guardadas!
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-text-muted mt-2">
                  Los docentes han sido asignados correctamente a <strong>{evaluadorNombre}</strong>.
                </AlertDialogDescription>
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4 flex justify-center sm:justify-center">
              <AlertDialogAction
                onClick={() => setShowSuccessModal(false)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2 rounded-lg cursor-pointer"
              >
                Aceptar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  );
};
