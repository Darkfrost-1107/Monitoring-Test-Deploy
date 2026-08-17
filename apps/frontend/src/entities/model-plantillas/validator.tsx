import { z } from 'zod';
import { cantidadDeValoraciones } from './escala-por-defecto';

const nivelRomano = z.enum(['I', 'II', 'III', 'IV']);

/**
 * Cuántos niveles se exigen depende del instrumento.
 *
 * Antes eran cuatro fijo —`.length(4, 'Debe definir los 4 niveles de la escala')`—
 * y la Ficha Docente EIB, que es una lista de cotejo de tres valores, no podía
 * guardarse sin un cuarto nivel inventado. La cantidad la declara el contrato
 * compartido y la resuelve `cantidadDeValoraciones`.
 */
export const plantillaSchema = z.object({
  tipoMonitoreo: z.string().min(3, 'El tipo de monitoreo es requerido'),
  anioAcademico: z
    .number()
    .int()
    .min(2020, 'Año inválido')
    .max(2100, 'Año inválido'),
  baremo: z.enum(['Vigente', 'Porcentual']),
  niveles: z
    .array(
      z.object({
        nivel: nivelRomano,
        denominacion: z.string().min(2, 'La denominación es requerida'),
        rangoMin: z.number().min(0, 'El rango mínimo no puede ser negativo'),
        color: z.string(),
      }),
    )
    .min(1, 'Debe definir la escala'),
  desempenos: z
    .array(
      z.object({
        id: z.string(),
        nombre: z.string().min(3, 'El nombre del desempeño es requerido'),
        descripcionCorta: z.string(),
        preguntaExtra: z.preprocess((v) => v ?? '', z.string()),
        aspectos: z.array(
          z.object({ id: z.string(), descripcion: z.string().min(1, 'Describe el aspecto') }),
        ),
        rubrica: z.array(z.object({ nivel: nivelRomano, descripcion: z.string() })),
      }),
    )
    .min(1, 'Agregue al menos un desempeño'),
})
  .superRefine((data, ctx) => {
    const esperados = cantidadDeValoraciones(data.tipoMonitoreo);

    if (data.niveles.length !== esperados) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['niveles'],
        message: `Debe definir los ${esperados} niveles de la escala`,
      });
    }
  });

export type PlantillaFormData = z.infer<typeof plantillaSchema>;
