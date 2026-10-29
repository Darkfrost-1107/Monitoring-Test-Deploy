import { useMutation } from '@tanstack/react-query';
import { teachersApi } from '@shared/api/teachers.api';

/** Restablece a su DNI la contraseña de una persona del personal de la I.E. */
export const useRestablecerContrasena = () =>
  useMutation({
    mutationFn: async (docenteId: string) => {
      const res = await teachersApi.restablecerContrasena(docenteId);
      if (!res.ok) {
        throw new Error(
          (res.error as { message?: string })?.message || 'No se pudo restablecer la contraseña.',
        );
      }
      return res.data;
    },
  });
