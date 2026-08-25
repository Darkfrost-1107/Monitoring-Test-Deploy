import { Transform, Type, plainToInstance } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  CargoBeneficiario,
  INSTRUMENTOS_SOLICITABLES,
  type TipoPlantilla,
} from '@sistema-monitoreo/shared-contracts';

/** Tope de plantillas por solicitud. Un pedido de veinte no es un pedido, es un catálogo. */
const MAX_ITEMS = 10;

/**
 * Parsea los ítems que llegan como texto desde `FormData`.
 *
 * Un JSON malformado devuelve el texto sin tocar: así el error lo produce
 * `@IsArray`, con un mensaje sobre el campo, en lugar de una traza de parseo.
 */
function parsearItems(valor: string): unknown {
  try {
    return JSON.parse(valor);
  } catch {
    return valor;
  }
}

export class ItemSolicitudPlantillaDto {
  @IsIn([...INSTRUMENTOS_SOLICITABLES])
  instrumento!: TipoPlantilla;

  @IsIn(Object.values(CargoBeneficiario))
  cargoBeneficiario!: CargoBeneficiario;

  @IsString()
  @MaxLength(300)
  descripcion!: string;
}

/**
 * Alta de la solicitud.
 *
 * No lleva `institucionId` ni `solicitanteId`: los dos salen de la sesión. Un
 * campo así en el cuerpo sería una invitación a presentar un pedido en nombre
 * de otra institución.
 *
 * El PDF viaja como archivo en la misma petición, no acá.
 *
 * ── Por qué hay transformaciones y no sólo validadores ──
 * La petición es `multipart/form-data`, porque lleva el PDF adjunto. Ese
 * formato transporta únicamente texto: el año llega como `"2026"` y los ítems
 * como una cadena JSON. Sin convertirlos primero, `@IsInt` y `@IsArray`
 * rechazarían datos correctos.
 */
export class CrearSolicitudPlantillaDto {
  @Type(() => Number)
  @IsInt()
  anioEscolar!: number;

  /**
   * ── Por qué el `@Transform` también construye las instancias ──
   * `@Transform` y `@Type` no se suman sobre la misma propiedad: el primero
   * REEMPLAZA la conversión, de modo que `@Type` nunca corre. Los ítems
   * quedaban como objetos planos, sin los metadatos que dejan los decoradores
   * de `ItemSolicitudPlantillaDto`, y `forbidNonWhitelisted` los tomaba por
   * propiedades desconocidas: «property instrumento should not exist», campo
   * por campo, sobre un cuerpo perfectamente válido.
   *
   * Por eso acá se parsea Y se instancia. No hay `@Type`: sería decorativo.
   */
  @Transform(({ value }): unknown => {
    const bruto: unknown = typeof value === 'string' ? parsearItems(value) : value;
    // Un valor que no es arreglo se devuelve intacto para que `@IsArray`
    // produzca el mensaje, en vez de romper la conversión.
    return Array.isArray(bruto) ? plainToInstance(ItemSolicitudPlantillaDto, bruto) : bruto;
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_ITEMS)
  @ValidateNested({ each: true })
  items!: ItemSolicitudPlantillaDto[];
}

export class ResolverSolicitudPlantillaDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comentario?: string;
}
