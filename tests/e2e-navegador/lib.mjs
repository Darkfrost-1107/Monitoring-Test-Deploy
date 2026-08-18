// Utilidades compartidas de la suite e2e de navegador.
//
// Corre contra un stack AISLADO (no la base de trabajo): Postgres efímera,
// backend y frontend en puertos propios. Ver README.md para levantarlo.
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const AQUI = dirname(fileURLToPath(import.meta.url));

export const API = process.env.E2E_API ?? 'http://localhost:3001';
export const WEB = process.env.E2E_WEB ?? 'http://localhost:5174';
export const OUT = process.env.E2E_OUT ?? join(AQUI, 'capturas');
export const DB_CONTAINER = process.env.E2E_DB_CONTAINER ?? 'monitoring-postgres-e2e';
export const DB_NAME = process.env.E2E_DB_NAME ?? 'monitoring_e2e';
// Contraseña definitiva (cumple ChangePasswordDto: 8+, una mayúscula, un número).
export const PASSWORD = process.env.E2E_PASSWORD ?? 'PruebaE2E2026';

/** Ubica el binario de Chromium de Playwright, o usa PLAYWRIGHT_CHROMIUM. */
export function chromiumPath() {
  if (process.env.PLAYWRIGHT_CHROMIUM) return process.env.PLAYWRIGHT_CHROMIUM;
  const cache = join(process.env.HOME ?? '', '.cache', 'ms-playwright');
  if (existsSync(cache)) {
    for (const d of readdirSync(cache)) {
      if (d.startsWith('chromium-')) {
        const p = join(cache, d, 'chrome-linux64', 'chrome');
        if (existsSync(p)) return p;
      }
    }
  }
  throw new Error('No se encontró Chromium; exporte PLAYWRIGHT_CHROMIUM=/ruta/al/chrome');
}

/** Corre una consulta contra la base efímera vía `docker exec ... psql`. */
export function sql(query) {
  return execFileSync(
    'docker',
    ['exec', DB_CONTAINER, 'psql', '-U', 'admin', '-d', DB_NAME, '-tAc', query],
    { encoding: 'utf8' },
  ).trim();
}

/** Pasa la cuenta de primer-login a la contraseña definitiva. Idempotente. */
export async function prepararUsuario(dni) {
  const login = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dni, password: dni }),
  });
  if (login.status !== 200) return 'ya-preparado';
  const cookies = (login.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
  const chg = await fetch(`${API}/api/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookies },
    body: JSON.stringify({ newPassword: PASSWORD }),
  });
  return chg.status === 200 ? 'preparado' : `fallo-${chg.status}`;
}

/** Login por navegador con la contraseña definitiva. Devuelve la URL de aterrizaje. */
export async function loginWeb(page, dni) {
  await page.goto(WEB, { waitUntil: 'networkidle' });
  await page.getByPlaceholder(/Ingrese su DNI/i).fill(dni);
  await page.getByPlaceholder(/Ingrese su contraseña/i).fill(PASSWORD);
  await page.getByRole('button', { name: /inicio de sesión/i }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);
  return page.url();
}
