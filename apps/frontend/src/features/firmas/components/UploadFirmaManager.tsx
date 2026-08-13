import { useState, useRef } from 'react';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { SignaturePad } from './SignaturePad';
import { firmasApi } from '@/shared/api/firmas.api';
import { toast } from 'sonner';

interface UploadFirmaManagerProps {
  onSuccess?: (firmaUrl: string) => void;
  onCancel?: () => void;
}

export function UploadFirmaManager({ onSuccess, onCancel }: UploadFirmaManagerProps) {
  const [mode, setMode] = useState<'DRAW' | 'UPLOAD'>('DRAW');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveSignature = async (blob: Blob) => {
    setIsLoading(true);
    try {
      const response = await firmasApi.uploadFirmaMaster(blob);
      toast.success('Firma guardada exitosamente');
      onSuccess?.(response.firmaUrl);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar la firma');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    handleSaveSignature(file);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto p-4 bg-white rounded-lg shadow-sm border">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Configurar Firma</h3>
        <p className="text-sm text-gray-500">
          Esta firma se usará para estampar las fichas de monitoreo que completes.
        </p>
      </div>

      <div className="flex gap-2 p-1 bg-gray-100 rounded-md">
        <Button
          variant={mode === 'DRAW' ? 'default' : 'ghost'}
          className="flex-1"
          onClick={() => setMode('DRAW')}
          disabled={isLoading}
        >
          Dibujar
        </Button>
        <Button
          variant={mode === 'UPLOAD' ? 'default' : 'ghost'}
          className="flex-1"
          onClick={() => setMode('UPLOAD')}
          disabled={isLoading}
        >
          Subir Imagen
        </Button>
      </div>

      {mode === 'DRAW' ? (
        <SignaturePad
          onSave={handleSaveSignature}
          onCancel={() => onCancel?.()}
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50/50">
          <Label
            htmlFor="firma-upload"
            className="cursor-pointer flex flex-col items-center gap-2 text-primary hover:text-primary/80 transition-colors"
          >
            <div className="p-4 bg-primary/10 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            </div>
            <span>Seleccionar imagen (PNG, JPG)</span>
          </Label>
          <input
            id="firma-upload"
            type="file"
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
            disabled={isLoading}
          />
        </div>
      )}
    </div>
  );
}
