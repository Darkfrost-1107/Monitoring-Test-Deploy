import { Injectable } from '@nestjs/common';
import {
  calcularNivelLogro,
  calcularPromedio,
  calcularResultadoBaremo,
  nivelARomano,
  type NivelLogro,
} from '@sistema-monitoreo/shared-contracts';

/**
 * Baremo institucional de monitoreo (EDU-0009).
 *
 * Fase 3 de PLAN_REMEDIACION.md, hallazgo H-28: el cálculo pasa a
 * `@sistema-monitoreo/shared-contracts` para que la pantalla de llenado use
 * exactamente la misma regla. Antes tenía su propia implementación sobre el
 * puntaje total y ambas discrepaban en toda plantilla que no tuviera cinco
 * desempeños.
 *
 * Este servicio se conserva como fachada inyectable: es lo que consumen los
 * helpers de finalización de ficha.
 */
@Injectable()
export class BaremoCalculatorService {
  /** Convierte nivel numerico (1-4) a romano. */
  nivelARomano(nivel: number): 'I' | 'II' | 'III' | 'IV' {
    return nivelARomano(nivel);
  }

  /** Calcula el promedio a partir de una lista de niveles (1-4). */
  calcularPromedio(niveles: number[]): number {
    return calcularPromedio(niveles);
  }

  /** Calcula el nivel de logro segun el baremo institucional. */
  calcularNivelLogro(promedio: number): NivelLogro {
    return calcularNivelLogro(promedio);
  }

  /** Calcula el resultado completo del baremo: puntaje, promedio, nivel. */
  calcularResultadoCompleto(niveles: number[]): {
    puntajeTotal: number;
    promedio: number;
    nivelLogro: NivelLogro;
  } {
    const { puntajeTotal, promedio, nivelLogro } = calcularResultadoBaremo(niveles);
    return { puntajeTotal, promedio, nivelLogro };
  }
}
