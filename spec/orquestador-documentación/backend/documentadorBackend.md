# Estándar de documentación Backend Spring Boot — AUTO-HOST

## Propósito y alcance

Esta guía establece criterios para documentar la API y el backend Java/Spring Boot de AUTO-HOST. Se aplica a controladores, DTOs, servicios, repositorios, entidades y configuración. La documentación debe explicar contratos y decisiones de dominio sin sustituir validaciones ni exponer información sensible.

## Comando de invocación

Para solicitar la aplicación de esta guía, usar explícitamente:

```text
INVESTIGAR COMO documentar backend Spring Boot en AUTO-HOST
```

Al invocarlo, leer primero este documento y `spec/orquestador/orquestador .md`; documentar solo los archivos incluidos en la solicitud y validar los criterios de esta guía.

## Estándares JavaDoc

### Clases e interfaces

- Añadir JavaDoc a clases públicas o exportadas que formen parte de la arquitectura de aplicación.
- Explicar responsabilidad y límites: qué coordina o representa y qué debe delegarse a otra capa.
- Para controladores, indicar el recurso y su ámbito HTTP. Para entidades, describir su correspondencia con el esquema y cualquier regla de representación relevante.
- Usar `@since` solo si el repositorio mantiene una convención de versión; no inventar versiones.

### Controladores y endpoints

Documentar cada operación REST en la referencia del API o junto al controlador cuando el contrato no quede claro en anotaciones. Incluir:

- Método HTTP, ruta y propósito.
- Autenticación y roles requeridos; precisar que Spring Security aplica la autorización.
- DTO de entrada/salida, campos obligatorios, normalización y límites.
- Status exitosos y errores previsibles (`400`, `401`, `403`, `404`, `409`, según corresponda).
- Semántica de paginación, filtros, soft delete, cargas multipart y tamaño máximo.
- Efectos transaccionales o cambios persistentes observables.

No documentar tokens reales, claves, contraseñas, cadenas de conexión privadas ni datos personales reales.

### Servicios y métodos

- Documentar servicios públicos con la regla de negocio que implementan y el límite de la transacción.
- En métodos no triviales, describir precondiciones, invariantes, resultado, efectos y excepciones de dominio (`@param`, `@return`, `@throws`).
- Explicar bloqueos, idempotencia o concurrencia cuando afecten la conducta del llamador.
- Dejar claro qué errores se convierten en conflictos REST y cuáles se propagan al manejador global.

### Repositorios

- Documentar consultas personalizadas o métodos cuya semántica no sea evidente por su nombre.
- Especificar filtros (por ejemplo, activos/disponibles), orden y paginación; indicar si el método devuelve registros activos o incluye inactivos.
- Explicar locks o aislamiento usados por asociaciones transaccionales, y el conflicto que previenen.
- Mantener la documentación consistente con índices, restricciones únicas y esquema MySQL versionado.

### DTOs, entidades y configuración

- En DTOs, describir formato, normalización y validaciones que definen el contrato HTTP.
- En entidades, identificar tabla/columnas cuando el mapeo no sea obvio, claves foráneas, restricciones y tipos SQL no estándar.
- En propiedades de configuración, indicar finalidad y variables de entorno asociadas sin incluir sus valores secretos.
- Aclarar si Hibernate administra el esquema o si las migraciones/scripts SQL son la fuente de verdad; no presentar `ddl-auto` como sustituto de una migración controlada.

## Plantilla de referencia de endpoint

```md
### `METHOD /api/recurso`
- Propósito:
- Autenticación y roles:
- Entrada/salida:
- Validación y normalización:
- Respuestas HTTP:
- Persistencia/transacción:
- Paginación/límites:
- Criterios de aceptación y evidencia:
```

## Checklist por fases

- [ ] **Análisis:** leer la SPEC, `skills.md`, entidades/esquema y consumidores del contrato que se documentará.
- [ ] **Diseño:** establecer la fuente de verdad para cada detalle y mapear ruta/controlador, servicio, repositorio y reglas aplicables.
- [ ] **Documentación:** escribir JavaDoc/Markdown conciso con contratos, seguridad, errores, límites, persistencia y transacciones verificables.
- [ ] **Validación:** contrastar rutas, DTOs, anotaciones, consultas y esquema reales; comprobar enlaces y ejemplos; no afirmar tests no ejecutados.
- [ ] **Entrega:** registrar archivos cubiertos, comandos ejecutados, resultado y cualquier limitación pendiente.
