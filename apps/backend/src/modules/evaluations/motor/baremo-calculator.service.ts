import { Injectable } from '@nestjs/common';
import {
  calcularNivelLogro,
  calcularPromedio,
  calcularResultadoBaremo,
  nivelARomano,
  type NivelLogro,
  type TramoDeEscala,
  type ModoDeBaremo,
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

  /**
   * Resultado completo del baremo: puntaje, promedio, nivel y su denominación.
   *
   * La escala la declara la plantilla —`rangoMin` y `denominacion` por nivel— y
   * el modo dice cómo leerla: la rúbrica docente corta sobre el puntaje
   * (5·8·13·18) y la directiva sobre el porcentaje de avance (25·50·75·100).
   * Sin escala se conservan los umbrales sobre el promedio.
   */
  calcularResultadoCompleto(
    niveles: number[],
    escala: readonly TramoDeEscala[] = [],
    modo: ModoDeBaremo = 'Vigente',
  ): {
    puntajeTotal: number;
    promedio: number;
    nivelLogro: NivelLogro;
    denominacion: string;
  } {
    const { puntajeTotal, promedio, nivelLogro, denominacion } = calcularResultadoBaremo(
      niveles,
      escala,
      modo,
    );
    return { puntajeTotal, promedio, nivelLogro, denominacion };
  }
}
