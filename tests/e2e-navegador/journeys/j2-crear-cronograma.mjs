// J2 — El Jefe de Gestión registra un cronograma: formulario en cascada
// (Modalidad → Nivel → Especialista → Institución → Docente) y se verifica que
// la fila quedó persistida en la base.
import { chromium } from 'playwright-core';
import { chromiumPath, OUT, WEB, loginWeb, sql } from '../lib.mjs';

/** Abre el combobox nº `i` del modal y elige la primera opción; espera el cierre. */
async function elegirCombo(page, i) {
  const modal = page.locator('div.fixed.inset-0.z-50').last();
  const trigger = modal.getByRole('combobox').nth(i);
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  const opciones = page.getByRole('option');
  await opciones.first().waitFor({ state: 'visible', timeout: 5000 });
  const texto = (await opciones.first().innerText()).trim();
  await opciones.first().click();
  await opciones.first().waitFor({ state: 'hidden', timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(400);
  return texto;
}

export async function run() {
  const antes = Number(sql('SELECT count(*) FROM cronogramas'));
  const browser = await chromium.launch({ headless: true, executablePath: chromiumPath() });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 1000 });
  let ok = false;
  try {
    await loginWeb(page, '40000002');
    await page.goto(WEB + '/monitoreo/cronograma', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /Registrar cronograma/i }).click();
    await page.waitForTimeout(1200);
    for (let i = 0; i < 5; i++) await elegirCombo(page, i); // los 5 selects en cascada
    await page.locator('input[type="datetime-local"]').first().fill('2026-09-15T09:00');
    await page.getByRole('button', { name: /Registrar|Guardar|Programar|Crear/i }).last().click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/j2-cronograma.png`, fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
  const despues = Number(sql('SELECT count(*) FROM cronogramas'));
  ok = despues === antes + 1;
  console.log(`RESULT J2-crear-cronograma ${ok ? 'PASS' : 'FAIL'} cronogramas ${antes}→${despues}`);
  return ok;
}

if (import.meta.url === `file://${process.argv[1]}`) run().then((ok) => process.exit(ok ? 0 : 1));
