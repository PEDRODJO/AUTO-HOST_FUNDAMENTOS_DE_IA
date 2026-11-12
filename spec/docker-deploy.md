# SPEC — Contenerización AUTO-HOST

Estado: implementada; Compose validado, las imágenes no pudieron compilarse porque Docker Desktop Engine no está iniciado.

## Requisitos y aceptación

- **DOCKER-REQ-001:** Backend Spring Boot/Java 17 empaquetado con Maven multi-stage y runtime JRE Alpine, puerto 3000.
  - **DOCKER-AC-001:** el contenedor inicia el JAR ejecutable y llega a MySQL por nombre DNS del servicio `db`.
- **DOCKER-REQ-002:** Cliente React/Vite construido en etapa Node y publicado por Nginx Alpine.
  - **DOCKER-AC-002:** Nginx publica SPA y reenvía `/api` al servicio backend.
- **DOCKER-REQ-003:** Compose contiene db, backend y frontend dentro de `autohost-network`, con volumen de base persistente y fotos persistentes.
  - **DOCKER-AC-003:** MySQL inicializa schema.sql, workshops.sql y vehicles.sql una sola vez en un volumen vacío y el backend espera al healthcheck.
- **DOCKER-REQ-004:** Documentación de variables, arranque `docker compose up --build` y limitaciones de configuración.
  - **DOCKER-AC-004:** README principal enlaza requisitos, variables y puertos de publicación.

## Decisiones y límites

- Para inicializar una instalación vacía se montan solo los scripts base en orden; scripts de migración (`clients.sql`, `roles.sql`, `workshops_soft_delete.sql`, `clients_emergency_surnames.sql`) no se ejecutan automáticamente porque no son idempotentes frente a instalación nueva y presuponen esquemas previos.
- Frontend usa Node 22 en build por compatibilidad con Vite 8; backend compila con Maven/JDK 17 y ejecuta sobre Java 17 JRE Alpine.
- Nginx publica el frontend y hace proxy same-origin de `/api` para conservar el `API_BASE_URL` actual.
- Credenciales y JWT de Compose se inyectan desde `.env` y no se guardan en el manifiesto.
- Esta infraestructura empaqueta; no implica despliegue en un host ni ejecución contra una base productiva.

## Evidencia de validación

- `docker compose config --quiet`: correcto con variables efímeras de validación.
- `docker compose build`: no pudo iniciar porque no está disponible el daemon `dockerDesktopLinuxEngine` (pipe npipe ausente); los Dockerfiles e imágenes base no fueron verificados por build.
- No se inició MySQL ni se ejecutó la inicialización SQL.
## Checklist por fases

- [ ] **Análisis:** leer solicitud, instrucciones aplicables, contexto y criterios de aceptación.
- [ ] **Diseño:** registrar alcance, decisiones, rutas/contratos afectados y validaciones.
- [ ] **Desarrollo:** cambiar solo archivos trazables a requisitos y conservar estructura/datos.
- [ ] **Validación:** ejecutar las comprobaciones pertinentes; anotar bloqueos sin afirmar resultados no observados.
- [ ] **Entrega:** resumir artefactos, evidencia, riesgos y pendientes reales.
