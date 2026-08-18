// Base compartida de J5/J6: un Director de I.E. de Secundaria asigna un cargo de
// institución (Coordinador Pedagógico o Jefe de Taller) a un docente. Prueba la
// gestión de personal Y crea roles que ningún seed genera.
import { chromium } from 'playwright-core';
import { chromiumPath, OUT, WEB, loginWeb, prepararUsuario, sql } from '../lib.mjs';

export async function asignarCargo({ etiqueta, ruta, boton, nombreRol }) {
  const yaHay = Number(
    sql(`SELECT count(*) FROM usuarios u JOIN roles r ON r.id=u.rol_id WHERE r.nombre='${nombreRol}'`),
  );
  if (yaHay > 0) { console.log(`RESULT ${etiqueta} SKIP ya existe un ${nombreRol}`); return true; }

  // Un director de I.E. de Secundaria (los cargos son sólo de Secundaria).
  const dni = sql(
    `SELECT p.dni FROM usuarios u JOIN roles r ON r.id=u.rol_id JOIN personas p ON p.id=u.persona_id
     JOIN docentes d ON d.persona_id=p.id JOIN instituciones_educativas i ON i.id=d.institucion_id
     WHERE r.nombre='Director de Institución' AND i.nivel_educativo ILIKE '%ecundaria%' LIMIT 1`,
  );
  if (!dni) { console.log(`RESULT ${etiqueta} SKIP sin director de Secundaria`); return true; }
  await prepararUsuario(dni);

  const browser = await chromium.launch({ headless: true, executablePath: chromiumPath() });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 1000 });
  try {
    await loginWeb(page, dni);
    await page.goto(WEB + ruta, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: boton }).click();
    await page.waitForTimeout(1200);
    const combo = page.getByRole('combobox').filter({ hasText: /Seleccione un docente/i }).first();
    await combo.click();
    const op = page.getByRole('option');
    await op.first().waitFor({ state: 'visible', timeout: 5000 });
    await op.first().click();
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: /Confirmar Asignación/i }).click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/${etiqueta}.png`, fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
  const despues = Number(
    sql(`SELECT count(*) FROM usuarios u JOIN roles r ON r.id=u.rol_id WHERE r.nombre='${nombreRol}'`),
  );
  const ok = despues >= 1;
  console.log(`RESULT ${etiqueta} ${ok ? 'PASS' : 'FAIL'} ${nombreRol}=${despues}`);
  return ok;
}
