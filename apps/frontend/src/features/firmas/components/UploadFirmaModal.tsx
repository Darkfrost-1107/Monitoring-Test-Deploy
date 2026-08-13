import { useEffect } from 'react';
import { UploadFirmaManager } from './UploadFirmaManager';
import { X } from 'lucide-react';

interface UploadFirmaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (firmaUrl: string) => void;
}

export function UploadFirmaModal({ isOpen, onClose, onSuccess }: UploadFirmaModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-2 top-2 z-10 p-2 bg-white/80 hover:bg-white rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
        <UploadFirmaManager
          onCancel={onClose}
          onSuccess={(url) => {
            onSuccess?.(url);
            onClose();
          }}
        />
      </div>
    </div>
  );
}
