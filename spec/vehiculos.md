# SPEC: AUTO-HOST — Módulo de Vehículos

Estado: revisión en curso; se detectó y se corregirá una restricción excesiva del rol recepcionista en la asociación desde Clientes  
Solicitud de origen: implementar registro y administración de vehículos, seguridad por roles, fotos, asociación a clientes y documentación técnica.  
Stack de origen: React SPA, Express 4, MySQL 8, mysql2, JWT y Multer. Runtime objetivo: Spring Boot 3.5 / Java 17 / JPA.

## Alcance

Incluye tabla y migración MySQL, registro/consulta/edición/baja lógica, fotos múltiples, selección de mecánico, asociación de vehículo disponible a cliente, vistas separadas y rutas de sidebar.

Excluye inventario de refacciones, órdenes de servicio, historial de reparaciones, carga externa de imágenes, reasignación/desasociación de clientes y una nueva implementación de autenticación.

## Requisitos y aceptación

- **VEH-REQ-001 — Persistencia:** `Vehiculos` tendrá UUID `id`, VIN, Placa, Marca, Modelo, Anio, Version, Color, Fotos JSON, Estatus (`activo`, `en_taller`, `desactivado`), IsActive, CreatedAt, UpdatedAt, además de MecanicoId y ClienteId nullable para las relaciones solicitadas.
  - **VEH-AC-001:** MySQL impide VIN o Placa duplicados con índices UNIQUE; la creación normaliza VIN y placa a minúsculas y devuelve 409 ante duplicados.
- **VEH-REQ-002 — API y acceso:** crear, listar, actualizar y eliminar lógicamente; todas las rutas requieren JWT y rol admin o recepcionista.
  - **VEH-AC-002:** listado acepta `page` y `pageSize`, limita pageSize a 10 y usa LIMIT/OFFSET; por omisión lista activos, `includeInactive=true` incluye desactivados.
  - **VEH-AC-003:** usuario sin autenticación recibe 401 y rol no permitido 403.
  - **VEH-AC-004:** DELETE marca IsActive=0 y Estatus=`desactivado`; no borra físicamente el registro.
- **VEH-REQ-003 — Fotos y mecánico:** aceptar hasta 10 imágenes JPG/PNG/WEBP, cada una de máximo 15 MiB; permitir asignación opcional de usuario mecánico activo.
  - **VEH-AC-005:** fotos se guardan como rutas JSON y se sirven solo a usuarios autorizados; superar límite devuelve 400 y limpia los archivos parciales.
- **VEH-REQ-004 — Asociación a cliente:** Administración de Clientes puede consultar y asociar vehículos activos, disponibles y sin cliente. Admin y recepcionista pueden abrir este flujo; las operaciones generales de edición/baja de clientes siguen siendo exclusivas de admin.
  - **VEH-AC-006:** admin y recepcionista pueden seleccionar el flujo de asociación para un cliente activo; solo se muestran vehículos activos, en estado activo y sin cliente. Una transacción bloquea las filas de cliente y vehículo y evita asignaciones concurrentes.
- **VEH-REQ-005 — Frontend y documentación:** crear y administrar viven en componentes React separados, con validación, tabla paginada, previsualización de fotos, editar/baja lógica, menú y guía técnica.
  - **VEH-AC-007:** la vista muestra como máximo 10 elementos, ofrece control para incluir desactivados y presenta errores 400/409 al usuario.

## Contratos

- `GET /api/vehicles?page=1&pageSize=10&includeInactive=false` → `{items,total,page,pageSize,totalPages}`.
- `GET /api/vehicles/mechanics` → usuarios mecánicos activos disponibles.
- `GET /api/vehicles/photos/:filename` → imagen, requiere autenticación y rol autorizado.
- `POST /api/vehicles` → multipart fields `VIN,Placa,Marca,Modelo,Anio,Version,Color,Estatus,MecanicoId,fotos[]`; responde 201.
- `PUT /api/vehicles/:id` → multipart con los mismos campos; fotos nuevas se agregan a las existentes, los campos generales reemplazan sus valores.
- `DELETE /api/vehicles/:id` → baja lógica, idempotencia vía 404 si ya no está activo.
- `GET /api/clients/:id/vehicles` → vehículos del cliente y catálogo disponible.
- `GET /api/clients/vehicle-assignment?page=1&pageSize=10` → clientes activos con nombre únicamente, paginados; para el rol recepcionista. El listado general de clientes y su información de contacto sigue reservado a admin.
- `PUT /api/clients/:id/vehicles` → JSON `{vehicleId}`; asigna solo vehículo activo, con Estatus=`activo`, no asignado y cliente activo.
- Errores: 400 validación/carga; 401 token ausente/inválido; 403 rol no permitido; 404 no encontrado/no disponible; 409 VIN/Placa duplicados.

## Reglas y decisiones

1. VIN acepta los 17 caracteres alfanuméricos normalizados a minúsculas y rechaza I, O y Q.
2. Placas normalizadas eliminan espacios y guiones, y aceptan `ABC1234`, `AB123CD` o `ABC123D`, sin distinción de mayúsculas de entrada.
3. El sistema sembrado llama `administrador` al rol administrativo. El guard del módulo acepta ese nombre heredado y el alias `admin`, junto con `recepcionista`.
4. El técnico asociado es un `Users.UserId` que tenga el rol `mecánico` activo. `ClienteId` permite varios vehículos por cliente, mientras cada vehículo tiene como máximo un cliente asignado.
5. El soft delete conserva metadatos, fotos y relaciones; por defecto el listado principal oculta inactivos y permite verlos con el filtro explícito.
6. Límite adicional de seguridad: máximo 10 fotos por vehículo; cada archivo mantiene el máximo especificado de 15 MiB.

## Tareas y validación

- `VEH-TASK-001` → SQL de instalación/migración y documentación.
- `VEH-TASK-002` → guard de roles, middleware de fotos, controlador, rutas y asociación transaccional.
- `VEH-TASK-003` → vistas separadas, scripts, estilos, sidebar y flujo de asociación desde Clientes.
- `VEH-TEST-001` → revisión de sintaxis JavaScript y estructura SQL; ejecutada la revisión de sintaxis con `node --check`. No se ejecutaron pruebas funcionales ni se aplicó el DDL en una instancia MySQL.

## Riesgos y pendientes operativos

- Ejecutar `server/sql/vehicles.sql` después de `schema.sql` y `workshops.sql` para instalaciones existentes. La aplicación de la migración sobre MySQL no se ejecutará automáticamente.
- Las imágenes se almacenan en disco local, de modo que despliegues con filesystem efímero o múltiples réplicas necesitan almacenamiento persistente/compartido antes de producción.
- El catálogo de mecánicos depende de que existan usuarios activos asignados al rol `mecánico`.

## Revisión de cumplimiento (2026-11-10)

- Se confirmó: atributos persistidos; VIN/placa normalizados en servidor y cliente; índices UNIQUE; límite 15 MiB por foto (máximo de 10); estatus válidos; límite backend/frontend de 10 por página; borrado lógico reflejado en el filtro de desactivados.
- Se corrigió el hallazgo de permisos: las rutas de consulta de asignación y asociación permiten `admin`, `administrador` (alias histórico) y `recepcionista`. Recepción obtiene una lista propia paginada con solo los nombres de clientes activos; directorio con información de contacto, edición y baja sigue reservado a admin. El endpoint de asociación exige cliente activo, bloquea cliente y vehículo dentro de la transacción y revalida que el vehículo esté activo, disponible y con estatus `activo`.
- Se ajustaron las etiquetas del técnico a “Técnico asignado / asociado” y la visualización de estado a “Activo”, “En taller” y “Desactivado”.
- Validación ejecutada después de los ajustes: `node --check` pasó para `clientsController.js`, `vehicleController.js` y `routes/api.js`; `npm run build` produjo el bundle con Vite 8.3.5 (36 módulos). No se ejecutó integración con MySQL ni prueba HTTP con JWT.

Definition of Done: SQL y endpoints reflejan reglas y permisos; vistas separadas conectadas al sidebar; asociación valida disponibilidad con transacción; JavaScript pasa comprobación sintáctica; se documentan migración y limitaciones sin afirmar pruebas de integración no ejecutadas.
## Checklist por fases

- [ ] **Análisis:** leer solicitud, instrucciones aplicables, contexto y criterios de aceptación.
- [ ] **Diseño:** registrar alcance, decisiones, rutas/contratos afectados y validaciones.
- [ ] **Desarrollo:** cambiar solo archivos trazables a requisitos y conservar estructura/datos.
- [ ] **Validación:** ejecutar las comprobaciones pertinentes; anotar bloqueos sin afirmar resultados no observados.
- [ ] **Entrega:** resumir artefactos, evidencia, riesgos y pendientes reales.
