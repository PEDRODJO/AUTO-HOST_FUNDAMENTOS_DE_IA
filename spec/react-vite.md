# SPEC: Migración de la interfaz AUTO-HOST a React + Vite

Estado: completada y compilada  
Solicitud: migrar el cliente actual basado en Vanilla JavaScript a una SPA React + Vite conservando autenticación, módulos, permisos, contratos REST, diseño y separación de vistas.

## Alcance

- SPA en `client/` con React, Vite y router con navegación hash, para conservar accesos directos sin dependencias adicionales de routing.
- Vistas independientes de crear/administrar Roles, Clientes, Talleres y Vehículos, más Inicio y autenticación pública (login, registro, recuperación y reset).
- Adaptador fetch con Bearer JWT, manejo de 401/403/409 y errores de API.
- Formularios ya existentes: CRUD de Roles/Clientes/Talleres/Vehículos; paginación de listas con límite 10; asociación transaccional cliente-vehículo; fotos, RFC, VIN, placas, SEPOMEX.
- Mantener backend Spring Boot como API; Vite proxy para `/api` y Nginx proxy en Compose para `/api`.
- README con instalación, desarrollo y build.

## Requisitos y aceptación

- **REACT-REQ-001 — React/Vite:** el shell servido por Vite monta React y no depende de los scripts legacy de Vanilla.
  - **REACT-AC-001:** `client` tiene scripts `dev`, `build` y dependencias React/Vite; las rutas se cargan como vistas React.
- **REACT-REQ-002 — Vistas independientes:** `RolesCreate`, `RolesManage`, `ClientsCreate`, `ClientsManage`, `WorkshopsCreate`, `WorkshopsManage`, `VehiclesCreate`, `VehiclesManage` son componentes funcionales independientes.
  - **REACT-AC-002:** Sidebar ofrece ocho rutas CRUD (dos por cada uno de cuatro módulos) más Inicio; se ocultan rutas de vehículo a roles no autorizados.
- **REACT-REQ-003 — API/autenticación:** cada petición protegida usa JWT y traduce fallos HTTP, incluidos 409 duplicados.
  - **REACT-AC-003:** conservar login/registro/recuperación/reset, guardar sesión y volver al acceso ante 401.
- **REACT-REQ-004 — Flujos:** mantener validaciones de RFC mexicano, VIN minúsculo, placas mexicanas, fotos hasta 15 MB por archivo, SEPOMEX, paginación <=10, edición/borrado lógico y asociación de vehículo desde Clientes.
  - **REACT-AC-004:** crear/editar/listar/desactivar consume los endpoints existentes; Clientes conserva GET/PUT de asociación de vehículos.
- **REACT-REQ-005 — Publicación:** Vite entrega assets de desarrollo y backend puede servir el build.
  - **REACT-AC-005:** README describe ejecutar API y Vite en terminales separadas, configurar URL base, build y despliegue estático.

## Decisiones

1. Implementar hash routing local en `App.jsx` en lugar de añadir React Router, dado que solo hay ocho rutas fijas y hash funciona con Live Server y fallback de Express sin ampliar dependencias.
2. Respetar nombres históricos de roles `administrador`/`recepcionista` y alias `admin` usados en el módulo Vehículos.
3. La asociación transaccional sigue siendo del servidor (`PUT /api/clients/:id/vehicles`); el cliente React solo envía la selección y muestra errores.
4. Vite corre en 5173 y proxy `/api` hacia `http://localhost:3000`; `VITE_API_BASE_URL` puede sobrescribir la URL de la API.
5. Las hojas de estilo corporativas existentes se reutilizan; los scripts legacy se retiran del shell de React y quedan fuera del flujo de ejecución.

## Validación y riesgos

- `npm install --legacy-peer-deps` en `client/`: completado (npm presentó un fallo interno de resolución `edgesOut` con el flujo estándar; la opción legacy instaló las dependencias requeridas).
- `npm run build` en `client/`: completado con Vite 8.3.5, 36 módulos transformados.
- No se ejecutó el sistema contra MySQL ni se validaron endpoints en vivo.
- API conserva validación y permisos server-side; React no es una frontera de seguridad.
- Fotos permanecen en el filesystem local del servidor, con persistencia requerida en despliegue.
- Migración no incluye cambios de endpoints de negocio salvo selección de `client/dist` para servir el build.

Definition of Done: SPA React construible, ocho vistas independientes accesibles, autenticación y API integradas, reglas de negocio reusadas, documentación de ejecución actualizada y resultados reales de validación anotados.
## Checklist por fases

- [ ] **Análisis:** leer solicitud, instrucciones aplicables, contexto y criterios de aceptación.
- [ ] **Diseño:** registrar alcance, decisiones, rutas/contratos afectados y validaciones.
- [ ] **Desarrollo:** cambiar solo archivos trazables a requisitos y conservar estructura/datos.
- [ ] **Validación:** ejecutar las comprobaciones pertinentes; anotar bloqueos sin afirmar resultados no observados.
- [ ] **Entrega:** resumir artefactos, evidencia, riesgos y pendientes reales.
