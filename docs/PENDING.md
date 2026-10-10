# Análisis de Tareas e Historias de Usuario (Sprint 4 & Deuda Sprint 3)

Este documento detalla el análisis del estado actual del sistema, enfocado en las 7 Historias de Usuario requeridas para el Sprint 4 y la resolución de la deuda del Sprint 3. 
> Utiliza las casillas de verificación para coordinar el trabajo entre los diferentes agentes o desarrolladores.

---

## 1. (Deuda Sprint 3) Asignación de Docentes por Especialidad
**Historia:** Director de I.E. designa cargas evaluativas a Coordinadores y Jefes de Taller.
- **Lo que hay:** En la base de datos (Prisma) ya existen los modelos `Docente`, `Cargo`, `DocenteCargo`, `Especialidad` y `DocenteEspecialidad`. El modelo `DocenteCargo` incluye un campo `esPrincipal` e histórico por fechas.
- **Estado actual:** Parcialmente implementado a nivel de base de datos. Faltan los endpoints para gestionar (crear/actualizar) estas relaciones desde la vista del Director y falta la UI respectiva.
- **Dónde encontrarlo / Archivos relacionados:**
  - Base de Datos: `apps/backend/prisma/schema.prisma` (Líneas relacionadas a `DocenteCargo` y `DocenteEspecialidad`).
  - Backend: Directorio `apps/backend/src/modules/teachers/` (Controladores y servicios).
  - Frontend: `apps/frontend/src/pages/director/` para la interfaz.
- **Lista de Tareas (Qué modificar):**
  - [x] **Base de Datos:** (SC-10) Crear modelo `Area` y vincularlo a `Especialidad` y `Docente` (vía `DocenteArea`) para clasificar en Ciencias/Letras.
  - [x] **Base de Datos:** (SC-10) Crear tabla `AsignacionEvaluador` que conecte un `evaluadorId` (Docente con cargo) con un `evaluadoId` (Docente).
  - [ ] **Backend/DB:** (SC-10) Sincronizar perfiles: Cuando se asigne rol jerárquico a un Docente, crearle un perfil de `Especialista` (si no existe) para que pueda fungir como `monitorId` en los Cronogramas sin necesidad de refactorizar la DB de Cronogramas.
  - [ ] **Backend/DB:** Manejar la asignación de cargos jerárquicos mediante `$transaction` en Prisma para cerrar `fechaFin` de cargos anteriores.
  - [x] **Shared-Contracts:** Crear/Actualizar DTOs (`AsignarCargoDocenteDTO` y DTOs de grupos de áreas) en el workspace.
  - [ ] **Backend:** Crear endpoints en `teachers.controller.ts` para asignar docentes a evaluadores y listar la plana agrupada por áreas.
  - [ ] **Backend:** Validar mediante guardias que el usuario (Director) actúe solo sobre su misma IE.
  - [x] **Frontend:** Añadir componente/widget interactivo (selector dual o drag & drop) en la vista de Director.
  - [x] **Frontend:** Añadir validaciones en el cliente y feedback visual (toasts/alertas) tras editar en caliente estas asignaciones.

---

## 2. (Deuda Sprint 3) Visibilidad Cruzada UGEL/II.EE
**Historia:** Backend SQL para listar y descargar planes/plantillas a nivel global.
- **Lo que hay:** En el esquema existen `PlanMonitoreo` y `PlantillaMonitoreo`, ambos con las foreign keys `ugelId` e `institucionId`. Existe también la tabla intermedia `PlanCoberturaIe` para relacionar planes específicos con varias IEs.
- **Estado actual:** El soporte relacional existe, pero faltan consultas optimizadas y permisos de visualización cruzada para que la UGEL vea documentos de las II.EE y viceversa (de manera controlada).
- **Dónde encontrarlo / Archivos relacionados:**
  - Base de Datos: `schema.prisma` (Modelos `PlanMonitoreo`, `PlanCoberturaIe`).
  - Backend: `apps/backend/src/modules/monitoring/` o en un módulo dedicado a catálogos/planes.
- **Lista de Tareas (Qué modificar):**
  - [x] **Backend:** Actualizar endpoints `GET` de listado de planes/plantillas para interceptar el rol del usuario actual.
  - [x] **Backend:** Implementar lógica para UGEL: Permitir ver planes globales y de todas sus II.EE. **(SC-12: Exclusivo para Jefe de Gestión, filtrando por estado Vigente/Histórico)**.
  - [x] **Backend:** Implementar lógica para IE: Limitar vista estrictamente a su `institucionId` y a los planes de UGEL donde figuren en `PlanCoberturaIe`.
  - [x] **Backend/DB:** Optimizar las consultas de Prisma (`findMany`) para usar `select` e `include` reduciendo la carga de datos de instituciones anidadas.
  - [x] **Shared-Contracts:** Refinar los contratos de respuesta (`PlanMonitoreoResponseDTO`) para excluir o incluir nodos sensibles dependiendo de los permisos.
  - [x] **Frontend:** Crear o adaptar la tabla/vista de "Planes de Monitoreo" en los dashboards de UGEL y Director.
  - [x] **Frontend:** Consumir el nuevo endpoint de listado global/restringido y renderizar botones de descarga o previsualización.

---

## 3. (Sprint 4) Estructuración de la base de datos de compromisos de mejora (DEPRECATED)
**Historia:** Backend de compromisos de mejora.
- **Lo que hay:** Actualmente, el modelo `FichaMonitoreo` (línea 680 del esquema) maneja los compromisos de mejora como un simple campo escalar de texto: `compromisos String? @db.Text`.
- **Estado actual:** La estructura no está normalizada (no está en 3NF). No se puede dar trazabilidad a los compromisos individuales, ni marcar si se cumplieron o no, ni asignarles plazos.
- **Dónde encontrarlo / Archivos relacionados:**
  - Esquema: `apps/backend/prisma/schema.prisma` (modelo `FichaMonitoreo`).
- **Lista de Tareas (Qué modificar):**
  - [ ] **Base de Datos:** Diseñar y agregar modelo `CompromisoMejora` ligado a `FichaMonitoreo` (con id, descripcion, estado, fechaCumplimiento).
  - [ ] **Base de Datos:** Eliminar el campo heredado `compromisos String?` de la ficha.
  - [ ] **Base de Datos:** Generar y ejecutar la migración (`pnpm --filter backend prisma:migrate`).
  - [ ] **Base de Datos:** Actualizar los archivos de pruebas base o los `seeders` (en `database/seeders`) para que la creación de datos "dummy" inyecte los compromisos en el nuevo formato relacional.
  - [ ] **Shared-Contracts:** Agregar los DTOs `CompromisoMejoraDTO` al workspace `shared-contracts`.
  - [ ] **Backend:** Adaptar DTOs de finalización de ficha para aceptar un arreglo de compromisos validados usando `class-validator` (en conjunción con Zod o dependencias compartidas).
  - [ ] **Backend:** Implementar lógica transaccional en el service para guardar la ficha y crear/actualizar los compromisos relacionales simultáneamente.
  - [ ] **Frontend:** Modificar el formulario del modal "Finalizar Ficha" para soportar un arreglo dinámico de campos (ej. `useFieldArray`), permitiendo añadir fechas y textos múltiples, en lugar de un solo campo de texto.

---

## 4. (Sprint 4) Lógica de historial pedagógico longitudinal
**Historia:** Backend integrado a la vista actual de historial de docente.
- **Lo que hay:** Existen múltiples `FichaMonitoreo` asociadas a un mismo docente evaluado, a través de la relación con el `Cronograma` (`cronograma.evaluadoId`).
- **Estado actual:** No hay un endpoint que agrupe y consolide las evaluaciones pasadas (histórico de notas/promedios) para inyectarlas directamente en el modal de la ficha en curso, tal como lo requiere el Sprint.
- **Dónde encontrarlo / Archivos relacionados:**
  - Backend: `apps/backend/src/modules/monitoring/` (posiblemente un nuevo endpoint en `monitoring.controller.ts`).
  - Frontend: Modales correspondientes a la Ficha en `apps/frontend/src/features/` o `apps/frontend/src/widgets/`.
- **Lista de Tareas (Qué modificar):**
  - [x] **Shared-Contracts:** Definir `HistorialPedagogicoDTO` para tipar estrictamente lo que devolverá el servidor.
  - [x] **Backend:** Crear endpoint `GET /fichas/historial/:evaluadoId`.
  - [x] **Backend/DB:** Escribir query Prisma altamente optimizada para extraer solo campos vitales (`select: { promedio: true, nivelLogro: true, fecha: true, observaciones: true }`) de fichas finalizadas, ordenadas cronológicamente.
  - [x] **Frontend:** Conectar la petición asíncrona (con React Query) en el componente de la Ficha.
  - [x] **Frontend:** Inyectar los datos en el modal existente para visualizar el historial sin crear vistas nuevas.
  - [x] **Frontend:** Añadir un componente visual (como un gráfico sencillo o una línea de tiempo) para mostrar visualmente la progresión del docente a lo largo de las visitas.

---

## 5. (Sprint 4) Programación de alertas automáticas y generación de reportes en PDF
**Historia:** Alertas automáticas y generación de PDF.
- **Lo que hay:** El sistema posee un cálculo de puntaje base (campos `puntajeTotal` y `promedio` en `FichaMonitoreo`), pero no hay motores de renderizado PDF ni CRON jobs configurados en el proyecto base.
- **Estado actual:** Funcionalidad inexistente. 
- **Dónde encontrarlo / Archivos relacionados:**
  - Archivo `package.json` del backend (para validar dependencias futuras).
  - Nuevo módulo: `apps/backend/src/modules/reports/`.
- **Lista de Tareas (Qué modificar):**
  - [x] **Configuración:** Instalar librería para generación PDF (servicio Gotenberg vía `GOTENBERG_URL`).
  - [x] **Backend:** Instalar `@nestjs/schedule` para tareas cronometradas (alertas).
  - [x] **Backend:** Crear y diseñar plantillas (templates HTML/Handlebars) para la estructura visual oficial del PDF en la carpeta del módulo de reportes.
  - [x] **Backend:** Construir servicio generador de PDF que interpole la data del modelo de Prisma en la plantilla oficial.
  - [x] **Base de Datos:** Evaluar añadir una tabla o campo (ej. `recordatoriosEnviados` en `Cronograma`) para evitar que el CRON Job envíe alertas duplicadas.
  - [x] **Backend:** Implementar CRON job (`@Cron`) para iterar sobre la base de datos buscando cronogramas vencidos y emitir alertas.
  - [x] **Frontend:** Integrar un botón de "Descargar PDF" en la vista de ficha completada o en el histórico.
  - [x] **Frontend:** Manejar el Blob/Buffer del PDF para forzar su descarga en el navegador del usuario.

---

## 6. (Sprint 4) Implementación del servicio de envío automatizado de PDFs
**Historia:** Envío de correos automáticos.
- **Lo que hay:** El backend ya cuenta con `nodemailer` en sus dependencias (`package.json` del backend) y la infraestructura provee `Mailpit` (vía `docker-compose.yml`) para la intercepción y auditoría de correos en desarrollo.
- **Estado actual:** La infraestructura para envío está montada, pero falta enlazarla con los PDFs generados tras la finalización de un monitoreo.
- **Dónde encontrarlo / Archivos relacionados:**
  - Dependencias: `apps/backend/package.json`.
  - Backend: `apps/backend/src/modules/monitoring/services/` (donde se cierra la ficha) y posiblemente un módulo de notificaciones.
- **Lista de Tareas (Qué modificar):**
  - [x] **Backend:** Integrar el servicio generador de reportes (Historia 5) dentro del flujo de `Finalizar Ficha`.
  - [x] **Backend:** Generar el PDF en memoria (Buffer) cuando la ficha cambie a estado "FINALIZADO".
  - [x] **Backend:** Consumir el servicio de `nodemailer` para enviar el correo adjuntando el buffer del PDF.
  - [x] **Backend:** Implementar transacciones o manejo de colas asíncronas (ej. BullMQ / EventEmitter) para que la lentitud o un fallo de red SMTP no bloquee al cliente ni aborte la finalización de la Ficha.
  - [x] **Backend/DB:** Registrar un evento de tipo "EMAIL_ENVIADO" en el modelo ya existente `LogAuditoria` para trazar si el docente recibió su correo con éxito.
  - [x] **Frontend:** Mostrar notificaciones de éxito (toast) garantizando al usuario que el informe fue enviado correctamente.

---

## 7. (QA) Ejecución de pruebas unitarias sobre el cálculo de baremos y corrección de bugs
**Historia:** Pruebas unitarias incrementales.
- **Lo que hay:** El entorno de pruebas está configurado con `jest` e integrado a los scripts del backend (`pnpm test`, `pnpm test:cov`).
- **Estado actual:** Falta cobertura de tests específicos para las fórmulas de cálculo de baremos (Vigente vs Porcentual), promedios y determinación del `nivelLogro` en `FichaMonitoreo`.
- **Dónde encontrarlo / Archivos relacionados:**
  - Archivos: `apps/backend/src/modules/monitoring/services/monitoring.service.spec.ts` o relacionados al cálculo.
- **Lista de Tareas (Qué modificar):**
  - [ ] **QA/Backend/DB:** Configurar "Test Factories" (fábricas de entidades) o Mocks de Prisma eficientes para no golpear directamente la base de datos real durante los tests.
  - [ ] **QA/Backend:** Redactar Unit Tests para la lógica de cálculo de baremo VIGENTE (suma vs máximo posible).
  - [ ] **QA/Backend:** Redactar Unit Tests para la lógica de baremo PORCENTUAL y redondeos.
  - [ ] **QA/Backend:** Comprobar determinación correcta del `nivelLogro` (INICIO, EN_PROCESO, LOGRO_ESPERADO, LOGRO_DESTACADO).
  - [ ] **QA/Backend:** Solventar cualquier bug (ej. divisiones por cero con ítems no evaluables) que revelen las pruebas.
  - [ ] **QA/Frontend:** Elaborar pruebas de componentes (ej. usando React Testing Library) para verificar que las vistas renderizan de acuerdo a los estados (Borrador vs Finalizado) sin errores.

---

## 🔄 Dependencias y Entrelazamiento de Historias

Varios puntos de este Sprint comparten módulos y lógicas transversales. Es importante orquestar el trabajo teniendo en cuenta los siguientes cruces:

1. **Intersección Ficha de Monitoreo (Historias 3 y 4):**
   - **Solapamiento:** Ambas recaen sobre la misma vista / modal de "Ficha de Monitoreo" en el Frontend y el módulo de `monitoring` en el Backend.
   - **Impacto:** Al implementar el *Historial Longitudinal (H4)*, se deben tener en cuenta los nuevos *Compromisos de Mejora (H3)* para que estos también se muestren como parte del histórico en el modal interactivo, compartiendo el mismo contexto visual.
2. **Generación y Envío de Reportes (Historias 5 y 6):**
   - **Solapamiento:** Alta dependencia. La *Historia 6 (Envío de PDF)* depende de que el servicio central de la *Historia 5 (Generación de PDF)* esté construido y devuelva un Buffer/Stream del PDF correctamente.
   - **Impacto:** Deben asignarse en secuencia o asegurarse de que el agente que construya el motor de renderizado PDF exporte sus interfaces en `shared-contracts` para que el módulo de correos pueda consumirlo en paralelo.
3. **Visibilidad Cruzada e Informes (Historias 2, 5 y 6):**
   - **Solapamiento:** Si un especialista de UGEL (*Historia 2*) usa su visibilidad cruzada para ver el historial de un docente, los botones de "Descargar PDF" (*Historia 5*) que aparezcan en esa vista deben respetar los roles y permisos construidos en la *Historia 2*.
4. **Pruebas de Calidad QA (Historia 7 con el resto):**
   - **Solapamiento:** Las pruebas del motor de cálculo de baremos afectan intrínsecamente los promedios que consume el Historial Longitudinal (*Historia 4*) y los resultados que se pintan en el PDF (*Historia 5*). Cualquier bug resuelto aquí puede alterar la firma de los contratos compartidos.

---

## 📋 Solicitudes de Cambio (Change Requests)

Esta sección está destinada a registrar iteraciones, pivotes o ajustes de requerimientos que surjan durante el desarrollo del Sprint y que alteren la estimación, arquitectura o el alcance inicial de las Historias de Usuario descritas arriba.

- `[ ]` **SC-10:** Implementar interfaz de asignación jerárquica por especialidades.
  - **Fecha:** 28/06/2026
  - **Solicitado por:** Cliente (Sprint Review 03)
  - **Historia Afectada:** 1 (Deuda Sprint 3 - Asignación de Docentes por Especialidad)
  - **Descripción del Cambio:** El Director debe designar docentes específicos a sus Coordinadores Pedagógicos y Jefes de Taller según especialidad (grupo Ciencias o grupo Letras). No hay límite de docentes asignables y puede modificarse en cualquier momento del año.
  - **Impacto y Nuevas Tareas (Análisis Técnico de Brechas):**
    - [x] **Brecha en DB (Áreas):** Se debe crear el modelo `Area` y relacionarlo con `Especialidad` y `Docente` (garantizando compatibilidad) para agrupar por Ciencias, Letras, etc.
    - [x] **Brecha en DB (Jerarquía):** No existe relación `evaluador-evaluado` entre docentes. Se debe crear un nuevo modelo (ej. `AsignacionEvaluador`).
    - [ ] **Brecha de Arquitectura (Monitoreo):** Para que un `Docente` actúe como monitor sin alterar el `Cronograma`, se le debe instanciar un perfil de `Especialista` anclado a su misma `Persona` al momento de asignarle el cargo evaluativo (Director/Coordinador).
    - [ ] **Backend:** Proveer endpoints cruzados (Docentes x Especialidad x Área) para que el frontend pueda construir los selectores de Ciencias/Letras.
    - [x] **Frontend:** Implementar la interfaz requerida (selector dual interactivo) en la vista del Director, permitiendo distribución sin límites y edición en caliente.

- `[ ]` **SC-11:** Restringir visibilidad y evaluación según docentes asignados (RBAC dinámico).
  - **Fecha:** 28/06/2026
  - **Solicitado por:** Cliente (Sprint Review 03)
  - **Historia Afectada:** Transversal (Calendario de visitas, Ficha de monitoreo, Reportes). Depende de SC-10.
  - **Descripción del Cambio:** Los Coordinadores Pedagógicos y Jefes de Taller ya no tendrán acceso a la lista completa de docentes de la I.E., sino que únicamente podrán visualizar, programar cronogramas y evaluar a los docentes que el Director les haya designado (SC-10) en su grupo (Ciencias o Letras).
  - **Impacto y Nuevas Tareas:**
    - [ ] **Backend:** Modificar los Guardias/Interceptors (RBAC) para interceptar peticiones de roles `Coordinador/JefeTaller` y forzar un filtro por el nuevo modelo `AsignacionEvaluador`.
    - [ ] **Backend:** Actualizar endpoints de listado de docentes, cronogramas y reportes para que apliquen internamente un `WHERE` filtrando solo por los `evaluadoId` asignados al `usuarioId` actual.
    - [ ] **Frontend:** Ocultar o deshabilitar cualquier acceso a datos de docentes no asignados en los dashboards de Coordinadores/Jefes de Taller.
    - [ ] **QA / Pruebas:** Validar intentos de acceso directo (IDOR) a fichas de docentes no asignados para confirmar que el backend bloquea la petición con un 403 Forbidden.

- `[ ]` **SC-12:** Permisos exclusivos de lectura para Jefe de Gestión sobre IE.
  - **Fecha:** 28/06/2026
  - **Solicitado por:** Cliente (Sprint Review 03)
  - **Historia Afectada:** 2 (Deuda Sprint 3 - Visibilidad Cruzada UGEL/II.EE)
  - **Descripción del Cambio:** El Jefe de Gestión (UGEL) tendrá acceso de solo lectura y descarga a los planes y plantillas creados por todas las II.EE., excluyendo estrictamente los documentos en estado "Borrador" (solo Vigentes e Históricos). El Jefe de Área no tendrá este acceso.
  - **Impacto y Nuevas Tareas:**
    - [x] **Backend:** Refinar los endpoints `GET` de planes/plantillas para interceptar específicamente el rol `Jefe de Gestión` y aplicar la cláusula `WHERE estado IN ('Vigente', 'Historico')`.
    - [x] **Backend:** Garantizar en los Guards/Decorators que roles como `Jefe de Área` reciban `403 Forbidden` si intentan consultar documentos de II.EE.
    - [x] **Backend:** Asegurar que los endpoints de `PUT`, `PATCH`, `DELETE` bloqueen firmemente los intentos de la UGEL de modificar documentos pertenecientes a una Institución Educativa.
    - [x] **Frontend:** Adaptar la tabla de visualización de documentos en la vista del Jefe de Gestión para renderizar solo los botones de "Ver" y "Descargar PDF", deshabilitando o escondiendo opciones de edición sobre los planes de las IEs.

- `[ ]` **SC-13:** Protección de data histórica (Soft Delete) vs Eliminación Física.
  - **Fecha:** 28/06/2026
  - **Solicitado por:** Cliente (Sprint Review 03)
  - **Historia Afectada:** Transversal a la gestión de Plantillas de Monitoreo.
  - **Descripción del Cambio:** Las plantillas en estado "Vigente" o "Histórico" no pueden ser eliminadas físicamente; requieren eliminación lógica (soft delete) para proteger los datos en uso. Las plantillas en estado "Borrador" sí pueden ser eliminadas físicamente, pero única y estrictamente por el usuario que las creó.
  - **Impacto y Nuevas Tareas:**
    - [ ] **Base de Datos:** Modificar el esquema para agregar soporte de soft delete a las plantillas (ej. añadir un campo `deletedAt DateTime?`). Generar y ejecutar la migración.
    - [ ] **Backend:** Modificar el endpoint `DELETE` de plantillas para que: si el estado es Borrador, ejecute un borrado físico y verifique que `usuarioId == creadorId` (de lo contrario 403); si el estado es Vigente/Histórico, ejecute un borrado lógico actualizando el flag/fecha.
    - [ ] **Backend:** Actualizar los endpoints `GET` para excluir por defecto los registros donde `deletedAt` no sea nulo.
    - [ ] **Frontend:** En la tabla de plantillas, reemplazar la acción de eliminar directa por un diálogo/botón de advertencia cuando la plantilla es "Vigente" o "Histórica", notificando al usuario que el borrado será lógico para no perder trazabilidad.
    - [ ] **Frontend:** Ocultar o deshabilitar el botón de borrar en borradores ajenos (validando el Creador).

- `[x]` **SC-14:** Creación de Superusuario Único para asignación de altos cargos UGEL.
  - **Fecha:** 28/06/2026
  - **Solicitado por:** Cliente (Sprint Review 03)
  - **Historia Afectada:** Transversal / Módulo de Administración de Usuarios.
  - **Descripción del Cambio:** Creación de un rol `Superusuario` único (registrado directo en BD). Su única facultad será asignar los roles jerárquicos máximos: `Jefe de Gestión` y `Director de UGEL`. No tendrá acceso al resto del sistema y el sistema deberá garantizar que solo exista 1 cuenta activa de este tipo.
  - **Impacto y Nuevas Tareas:**
    - [x] **Base de Datos:** Crear un script (`seeders`) o migración que inyecte directamente en base de datos la cuenta del superusuario y su rol asociado.
    - [x] **Backend:** Implementar restricciones (constraints/guards) que rechacen la creación de un segundo superusuario a nivel de base de datos o lógica de negocio.
    - [x] **Backend:** Crear un controlador exclusivo (`superuser.controller.ts`) con endpoints limitados a listar cuentas y asignar los roles de "Jefe de Gestión" y "Director UGEL".
    - [x] **Backend:** Aplicar un *Guard* estricto que prohíba al superusuario acceder a endpoints de catálogos, monitoreo, profesores, etc.
    - [x] **Frontend:** Crear una interfaz/dashboard aislada y minimalista ("Superadmin Panel") sin la barra de navegación estándar, que contenga únicamente el módulo de asignación de estos dos roles críticos.
