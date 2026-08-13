import { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/shared/ui/button';

interface SignaturePadProps {
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}

export function SignaturePad({ onSave, onCancel }: SignaturePadProps) {
  const padRef = useRef<SignatureCanvas | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const resizeCanvas = () => {
      if (padRef.current) {
        const canvas = padRef.current.getCanvas();
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext('2d')?.scale(ratio, ratio);
        padRef.current.clear();
        setIsEmpty(true);
      }
    };

    // Pequeño delay para asegurar que el DOM ya pintó el ancho final
    const timeoutId = setTimeout(resizeCanvas, 100);
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const handleClear = () => {
    padRef.current?.clear();
    setIsEmpty(true);
  };

  const handleSave = () => {
    if (padRef.current?.isEmpty()) {
      return;
    }
    
    try {
      // Usamos el canvas principal si el trimmed falla
      const canvasToSave = padRef.current?.getTrimmedCanvas() || padRef.current?.getCanvas();
      
      canvasToSave?.toBlob((blob) => {
        if (blob) {
          onSave(blob);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error al recortar/exportar canvas:', error);
      // Fallback
      padRef.current?.getCanvas().toBlob((blob) => {
        if (blob) onSave(blob);
      }, 'image/png');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50/50 p-2 overflow-hidden">
        <SignatureCanvas
          ref={padRef}
          penColor="black"
          canvasProps={{
            className: 'signature-canvas w-full h-48 cursor-crosshair touch-none',
          }}
          onEnd={() => setIsEmpty(false)}
        />
      </div>
      
      <div className="flex justify-between items-center">
        <Button variant="ghost" type="button" onClick={handleClear} disabled={isEmpty}>
          Limpiar canvas
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={isEmpty}>
            Guardar Firma
          </Button>
        </div>
      </div>
    </div>
  );
}
