import { plainToInstance } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  Min,
  Max,
  MinLength,
  validateSync,
} from 'class-validator';

/** Longitud mínima exigida a los secretos de firma de tokens. */
const JWT_SECRET_MIN_LENGTH = 64;

/**
 * Fragmentos que delatan un secreto de ejemplo copiado de `.env.example`.
 * Se rechazan en producción para impedir que un despliegue arranque con un
 * valor conocido públicamente.
 */
const INSECURE_SECRET_MARKERS = ['CHANGE_ME', 'dev-only', 'insecure', 'example'];

/** Variables que nunca deben contener un valor de ejemplo en producción. */
const PRODUCTION_SENSITIVE_KEYS = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const;

export class EnvironmentVariables {
  @IsNumber()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  FRONTEND_URL: string = 'http://localhost:5173';

  // ── Secretos de infraestructura ─────────────────────────────────────────
  // Deliberadamente sin valor por defecto. Un valor por defecto convierte una
  // variable ausente en un arranque silencioso contra credenciales conocidas,
  // en lugar de un fallo visible. Además, los inicializadores de propiedad
  // anulan `skipMissingProperties: false`: `plainToInstance` rellena el valor
  // por defecto cuando la variable falta, de modo que la validación nunca
  // podría fallar para estas claves.

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @MinLength(JWT_SECRET_MIN_LENGTH)
  JWT_SECRET!: string;

  @IsString()
  @MinLength(JWT_SECRET_MIN_LENGTH)
  JWT_REFRESH_SECRET!: string;

  @IsString()
  JWT_EXPIRES_IN: string = '15m';

  @IsString()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  @IsNumber()
  @Min(4)
  @Max(16)
  BCRYPT_SALT_ROUNDS: number = 12;

  @IsOptional()
  @IsString()
  SMTP_HOST?: string;

  @IsOptional()
  @IsNumber()
  SMTP_PORT?: number = 1025;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASS?: string;

  @IsOptional()
  @IsString()
  EMAIL_FROM?: string = 'no-reply@ugel-lampa.gob.pe';

  @IsOptional()
  @IsString()
  UPLOADS_BASE_PATH?: string = './uploads';

  @IsOptional()
  @IsString()
  UPLOADS_PUBLIC_URL?: string = '/uploads';

  @IsOptional()
  @IsString()
  NODE_ENV?: string = 'development';

  @IsOptional()
  @IsString()
  HOST?: string = '0.0.0.0';

  @IsOptional()
  @IsNumber()
  COOKIE_ACCESS_TOKEN_MAX_AGE_MS?: number = 15 * 60 * 1000;

  @IsOptional()
  @IsNumber()
  COOKIE_REFRESH_TOKEN_MAX_AGE_MS?: number = 7 * 24 * 60 * 60 * 1000;

  @IsOptional()
  @IsNumber()
  UPLOAD_FILE_SIZE_LIMIT_BYTES?: number = 10 * 1024 * 1024;
}

/**
 * Rechaza secretos de ejemplo en producción.
 *
 * La validación estructural no distingue un secreto real de uno copiado de
 * `.env.example`: ambos son cadenas de longitud suficiente. Esta comprobación
 * cubre ese hueco sin impedir que el entorno de desarrollo arranque.
 */
function assertProductionSecrets(env: EnvironmentVariables): void {
  if (env.NODE_ENV !== 'production') return;

  const offenders = PRODUCTION_SENSITIVE_KEYS.filter((key) => {
    const value = env[key].toLowerCase();
    return INSECURE_SECRET_MARKERS.some((marker) => value.includes(marker.toLowerCase()));
  });

  if (offenders.length > 0) {
    throw new Error(
      `Environment validation failed: ${offenders.join(', ')} contiene un valor de ejemplo. ` +
        'Genere secretos propios antes de desplegar en producción.',
    );
  }
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed: ${errors
        .map((e) => Object.values(e.constraints ?? {}))
        .flat()
        .join('; ')}`,
    );
  }
  assertProductionSecrets(validatedConfig);
  return validatedConfig;
}
