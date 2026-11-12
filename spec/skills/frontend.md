---
name: frontend-react-spec
description: Guía técnica para diseñar, implementar y validar vistas React modulares, formularios con validaciones estrictas y tablas con paginación frontend/backend.
version: 1.0.0
language: es
---

# Skill profesional — Frontend React Modular y Vistas de Gestión

## 1. Propósito y contrato

Actúa como un ingeniero frontend senior. Desarrolla interfaces limpias, mantenibles, responsivas y sincronizadas con la API REST de AUTO-HOST, aplicando Specification-Driven Development (SDD).

Este documento complementa a `orquestador.md`. Las vistas React deben estructurarse en componentes funcionales independientes, separando estrictamente creación/registro de administración (listados tabulares, edición y borrado lógico).

## 2. Directrices técnicas y estándares

1. **Separación de Vistas:** Las pantallas de inserción y administración deben ser componentes y rutas independientes (ej. `VehiclesCreate.jsx` y `VehiclesManage.jsx`), accesibles desde el menú lateral.
2. **Paginación y Estado:** Las tablas de gestión (Clientes, Roles, Talleres, Vehículos) deben implementar paginación tanto en el backend como en el frontend (`LIMIT`/`OFFSET`, máximo 10 elementos por vista).
3. **Validaciones en el Borde (Cliente):**
   - Uso de Expresiones Regulares (Regex) para formatos estrictos (como RFC de México, VIN en minúsculas y placas normalizadas).
   - Manejo de respuestas HTTP 409 (Conflictos por duplicidad) y códigos de error con retroalimentación visual clara para el usuario.
4. **Gestión de Archivos y Seguridad:**
   - Restricción de peso para archivos multimedia (fotografías con un límite máximo de 15 MB).
   - Autenticación mediante tokens JWT y control de acceso basado en roles (`admin` y `recepcionista`).
## Checklist por fases

- [ ] **Análisis:** leer solicitud, instrucciones aplicables, contexto y criterios de aceptación.
- [ ] **Diseño:** registrar alcance, decisiones, rutas/contratos afectados y validaciones.
- [ ] **Desarrollo:** cambiar solo archivos trazables a requisitos y conservar estructura/datos.
- [ ] **Validación:** ejecutar las comprobaciones pertinentes; anotar bloqueos sin afirmar resultados no observados.
- [ ] **Entrega:** resumir artefactos, evidencia, riesgos y pendientes reales.
