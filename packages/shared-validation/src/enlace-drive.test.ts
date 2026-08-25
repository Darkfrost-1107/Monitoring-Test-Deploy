import { describe, it, expect } from 'vitest';
import { enlaceDrive } from './enlace-drive.schema.js';
import {
  HOSTS_DRIVE_PERMITIDOS,
  LARGO_MAXIMO_ENLACE,
  esEnlaceDriveValido,
  normalizarEnlaceDrive,
} from './enlace-drive.js';

/**
 * Pruebas del enlace de carpeta pedagógica.
 *
 * La carpeta pedagógica no almacena archivos: guarda una referencia a una
 * carpeta de Google Drive. Eso convierte al campo en una URL que un usuario
 * carga y otro usuario abre, de modo que la validación es un control de
 * seguridad y no una comodidad de formulario.
 *
 * Lo que se fija acá: solo `https`, solo hosts de Drive declarados, sin
 * credenciales embebidas y con un largo acotado.
 */

const URL_VALIDA = 'https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz';

describe('esEnlaceDriveValido', () => {
  it.each([
    ['una carpeta de Drive', URL_VALIDA],
    ['un archivo de Drive', 'https://drive.google.com/file/d/1AbCdEf/view?usp=sharing'],
    ['un documento de Docs', 'https://docs.google.com/document/d/1AbCdEf/edit'],
    ['el host con mayúsculas', 'https://DRIVE.GOOGLE.COM/drive/folders/1AbCdEf'],
  ])('acepta %s', (_caso, url) => {
    expect(esEnlaceDriveValido(url)).toBe(true);
  });

  it.each([
    ['texto que no es URL', 'mi carpeta de drive'],
    ['una cadena vacía', ''],
    ['solo espacios', '   '],
    ['http sin cifrar', 'http://drive.google.com/drive/folders/1AbCdEf'],
    ['el esquema javascript', 'javascript:alert(1)'],
    ['un data URI', 'data:text/html,<script>alert(1)</script>'],
    ['un host ajeno', 'https://drive.google.com.atacante.io/drive/folders/1AbCdEf'],
    ['otro servicio', 'https://dropbox.com/s/1AbCdEf'],
    ['un subdominio no declarado', 'https://malicioso.drive.google.com/folders/1AbCdEf'],
    ['credenciales embebidas', 'https://user:clave@drive.google.com/drive/folders/1AbCdEf'],
  ])('rechaza %s', (_caso, url) => {
    expect(esEnlaceDriveValido(url)).toBe(false);
  });

  it('rechaza una URL más larga que el máximo declarado', () => {
    const larga = `${URL_VALIDA}?q=${'a'.repeat(LARGO_MAXIMO_ENLACE)}`;
    expect(esEnlaceDriveValido(larga)).toBe(false);
  });

  it('declara los hosts permitidos de forma explícita', () => {
    expect([...HOSTS_DRIVE_PERMITIDOS]).toEqual(['drive.google.com', 'docs.google.com']);
  });
});

describe('normalizarEnlaceDrive', () => {
  it('recorta los espacios de los extremos', () => {
    expect(normalizarEnlaceDrive(`  ${URL_VALIDA}  `)).toBe(URL_VALIDA);
  });

  it('deja intacta una URL ya normalizada', () => {
    expect(normalizarEnlaceDrive(URL_VALIDA)).toBe(URL_VALIDA);
  });
});

describe('enlaceDrive', () => {
  it('acepta una URL de Drive', () => {
    expect(enlaceDrive().safeParse(URL_VALIDA).success).toBe(true);
  });

  it('acepta una URL con espacios alrededor y la devuelve recortada', () => {
    const resultado = enlaceDrive().safeParse(`  ${URL_VALIDA}  `);
    expect(resultado.success).toBe(true);
    if (resultado.success) expect(resultado.data).toBe(URL_VALIDA);
  });

  it('rechaza un host ajeno con un mensaje que nombra a Drive', () => {
    const resultado = enlaceDrive().safeParse('https://dropbox.com/s/1AbCdEf');
    expect(resultado.success).toBe(false);
    if (!resultado.success) expect(resultado.error.issues[0]?.message).toMatch(/Drive/);
  });
});
