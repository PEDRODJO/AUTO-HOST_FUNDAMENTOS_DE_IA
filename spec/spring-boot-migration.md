# SPEC — Migración backend AUTO-HOST a Spring Boot

Estado: implementación parcial; fuentes Spring y empaquetado creados; compile/integración pendientes por falta de Maven y Docker Engine  
Invocación: `INVESTIGAR COMO` (compatibilidad Java/Spring comprobada en documentación oficial).  
Skill aplicable: `spec/skills/skills.md`, `spring-boot-rest-spec` v1.0.0, secciones 2–11; frontend existente queda fuera del cambio salvo compatibilidad de API.  

## Solicitud y alcance

Migrar el runtime de API Node.js a Spring Boot/Java 17+ con contratos vigentes de autenticación, roles, clientes, talleres, SEPOMEX y vehículos; persistencia MySQL con JPA/Hibernate; multi-stage Maven/JRE Docker y Compose; documentación por fase.

**Incluye:** app Java en `server/src/main/java`, recursos en `server/src/main/resources`, `server/pom.xml`, Dockerfile multi-stage, variables Compose, guías nuevas y checklist por fases en todos los archivos `spec/**/*.md` existentes.  
**Excluye:** rediseño React, modificación de tablas SQL, eliminación de fuentes Node heredadas, nuevas rutas de negocio, cambio de esquema/cifrado existente.

## Restricción estructural y decisión

El orquestador prohíbe crear carpetas fuera del esquema raíz salvo justificación documentada y aprobación en diseño. La solicitud autoriza expresamente `spec/orquestador-documentacion/frontead/` y `spec/orquestador-documentacion/backend/`; este diseño deja constancia de su necesidad para las guías solicitadas. Para Spring se conserva `server/` y se agrega el layout Maven estándar bajo su `src/`, sin mover ni borrar las fuentes Node existentes. Docker cambia el runtime publicado a Spring Boot; las fuentes Node permanecen archivadas in situ durante la transición.

## Requisitos / aceptación

- **SB-REQ-001 Contrato:** conservar los endpoints consumidos por SPA: `/api/auth/{login,register,recovery,reset}`, `/api/me`, `/api/roles` CRUD, `/api/clients` CRUD, talleres CRUD y fotografías, `/api/sepomex/{cp}`, `/api/vehicles` CRUD paginado, mechanics, photos y asociación a cliente.
  - **SB-AC-001:** nombres JSON, status codes, multipart fields y `page/pageSize/includeInactive` permanecen compatibles con `client/src`.
- **SB-REQ-002 Seguridad:** JWT Bearer y RBAC por operación; roles existentes `administrador` (alias `admin` cuando lo admite el contrato), `recepcionista`; CRUD de cliente solo admin, asignación cliente/vehículo para ambos.
  - **SB-AC-002:** anónimo 401, rol inválido 403, IDs ajenos/no disponibles sin exponer datos; sin secretos en repo.
- **SB-REQ-003 Dominio vehículo:** mantener lowercase VIN, normalización placa, unicidad DB, fotos hasta 15 MB c/u (10 máximas), estados y soft delete.
  - **SB-AC-003:** listado máximo 10, inactivos consultables mediante filtro; asociación transaccional solo si cliente y vehículo activos/disponibles.
- **SB-REQ-004 Persistencia:** JPA/Hibernate se conecta al MySQL existente y respeta tablas/columnas actuales; errores de unique traducidos a 409.
  - **SB-AC-004:** usar `spring.jpa.hibernate.ddl-auto=update` conforme a la decisión explícita vigente; validar su efecto en un entorno de desarrollo antes de apuntarlo a datos de producción.
- **SB-REQ-005 Infraestructura/documentación:** Maven Java 17+ → JRE Alpine multi-stage; Compose conecta backend con `db`; guías React y Spring requeridas; todos los MD de especificación/skills llevan checklist por fases.
  - **SB-AC-005:** `docker compose config`, Maven compile/tests y build frontend cuando entorno disponible; checklist visible en cada archivo solicitado.

## Decisiones de diseño

- Java 17 + Spring Boot 3.5.x sobre Jakarta API, Maven Wrapper si se puede generar; doc oficial consultada indica Java 17 como mínimo para Boot 3.5.16. [Requisitos oficiales](https://docs.spring.io/spring-boot/3.5/system-requirements.html).
- JPA entities/repositorios para persistencia, DTOs para contratos, servicio de caso de uso, `@RestControllerAdvice`, Spring Security `SecurityFilterChain`, JWT HMAC con `JWT_SECRET`, BCrypt/PasswordEncoder solo donde sea compatible con credenciales existentes; las columnas actuales guardan PBKDF2-HMAC-SHA-512 y no se cambiarán silenciosamente.
- El login debe verificar el hash PBKDF2 existente y registrar credenciales nuevas en el mismo formato mientras la base siga siendo compatible.
- Decisión posterior a la SPEC inicial: `ddl-auto` global se cambia de `validate` a `update` por solicitud explícita del usuario; al estar en `application.yml`, afecta también el perfil `production` salvo que una configuración específica lo sobrescriba.
- Asignación de vehículo usa `@Transactional` + lock pesimista para conservar la exclusión actual.
- Uploads permanecen en volumen existente; respuesta de error pública no filtrará SQL/stacktrace.
- No cambiar contratos del frontend; añadir correo solo si las rutas originales ya lo envían, conservando la configuración del entorno.

## Riesgos y pendientes

- En la base actual `IdentityCredentials` usa PBKDF2-HMAC-SHA-512, 600,000 iteraciones y pepper; la implementación Java conserva formato/derivación, pendiente validar contra credenciales reales.
- El runtime Docker cambia al JAR; `npm start` de servidor y scripts operativos Node deben quedar descritos como legado/transición hasta verificar paridad.
- La disponibilidad de Maven, Java y Docker Engine puede limitar validación local.
- Ethereal no está portado; correo Java requiere SMTP configurado. La recuperación devuelve 503 si no hay transportador SMTP, aunque el API de recuperación conserva su respuesta cuando el correo existe y se envía correctamente.
- El backend Spring aún debe compilarse y verificarse de extremo a extremo contra MySQL y React antes de declararse paridad funcional completa.

## Checklist por fases

- [x] **Análisis:** leer orquestador y skill; verificar contratos/rutas/schema actuales y compatibilidad Java.
- [x] **Diseño:** registrar layout permitido, decisiones JPA/JWT, rutas y compatibilidad antes del código.
- [x] **Desarrollo:** estructura Maven, configuración JPA/Security, controladores de auth/clientes/roles/talleres/SEPOMEX/vehículos, Docker multi-stage, Compose y guías.
- [ ] **Validación:** Maven no está instalado y Docker Engine no está activo; compile, tests, rutas HTTP y persistencia real siguen pendientes.
- [ ] **Entrega:** parcial hasta que Maven compile y se prueben los flujos con MySQL y JWT.

## Evidencia de esta ejecución

- `pom.xml`: XML válido según parser XML de PowerShell.
- Todos los Markdown bajo `spec/`, incluidas skills y guías nuevas: contienen `Checklist por fases`.
- `docker compose config --quiet`: correcto con variables efímeras.
- `mvn` no está instalado y el daemon `dockerDesktopLinuxEngine` no está disponible; no se pudo ejecutar Maven compile, pruebas Java ni Docker build.
- Sin MySQL en ejecución: quedan pendientes verificación del efecto Hibernate `ddl-auto=update`, constraints, contratos HTTP/JWT, transacción de asociación y paridad con el SPA.

## Corrección puntual — búsqueda del rol cliente

- **REQ-AUTH-001:** evitar que la inferencia del tipo raw de `Query.getResultStream()` propague `Throwable` no declarado en `AuthController.register`.
- **AC-AUTH-001:** consultar la lista tipada de `RoleId`; si está vacía, lanzar `ApiException` (RuntimeException) para que `ApiExceptionHandler` devuelva HTTP 500 con el mensaje público configurado.
- **Cambio:** reemplazar `getResultStream().findFirst().orElseThrow(...)` por `getResultList()` y condición explícita de lista vacía. No se añade un catch redundante ni se declara `throws Throwable`.
- **Validación:** el patrón problemático ya no está en el método y `pom.xml` conserva XML válido. `mvn -f server/pom.xml -DskipTests package` intentado; bloqueado porque `mvn` no está instalado en el entorno.

## Revisión SQL / Hibernate para arranque Docker

- Compose monta `schema.sql` → `workshops.sql` → `vehicles.sql` como `01`, `02`, `03` en `/docker-entrypoint-initdb.d`; MySQL ejecuta estos scripts al crear un volumen de datos nuevo.
- Los scripts poseen las tablas e índices/FKs completos. JPA escanea las entidades `Users`, `Roles`, `Clients` y `Vehiculos`; no se declararon relaciones `@ManyToOne`/`@JoinColumn`, por lo que Hibernate no duplica las FKs creadas por SQL. Las dos restricciones UNIQUE de `Vehiculos` usan los mismos nombres definidos en el script.
- Se alinearon longitudes/columnas de `ClientEntity`, `UserEntity`, `RoleEntity` y tipos `ENUM`, JSON y `TINYINT(1)` de `VehicleEntity` con el DDL existente para reducir cambios inferidos por `ddl-auto:update`.
- Hibernate no administra `IdentityCredentials`, `UserAdministration`, `PasswordResetTokens`, `Estatus`, `Talleres` ni `Codigos_Postales` mediante entidades; sus tablas permanecen bajo scripts SQL.
- Sin servicio MySQL/Docker disponible, no se observó el DDL que Hibernate ejecutaría. La revisión es estática y no certifica que `update` sea inocuo frente a una base existente; Compose tampoco vuelve a ejecutar init scripts si `mysql_data` ya contiene datos.

## Corrección de arranque JPA — nombres físicos MySQL

- **REQ-BOOT-001:** al arrancar con MySQL Linux, Hibernate debe resolver los nombres de tabla exactamente como están en los scripts, respetando mayúsculas/minúsculas (`Clients`, `Vehiculos`, `Roles`, `Users`).
- **AC-BOOT-001:** EntityManagerFactory detecta `Clients` y las demás tablas sin validación contra nombres minúsculos inexistentes.
- **Evidencia inicial:** `docker compose logs` reportó `Schema-validation: missing table [clients]`; los logs mostraron además que el contenedor ejecutaba `validate` mientras el árbol fuente ya contiene `update`, señal de imagen backend previa.
- **Hallazgo adicional:** después de arreglar el nombre físico, Hibernate intentó alterar `CHAR(36)` a `VARCHAR(36)` en columnas vinculadas por FKs. MySQL rechazó esos ALTER, aunque Hibernate pudo continuar.
- **Cambio aplicado:** `application.yml` configura `PhysicalNamingStrategyStandardImpl`; entidades con identificadores/FKs ahora declaran `columnDefinition=CHAR(36)` y las longitudes SQL correspondientes. Se reconstruyeron imágenes y se recreó solo backend, conservando volúmenes.
- **Validación real:** `docker compose up --build -d` compiló el JAR (Maven `BUILD SUCCESS`). Luego `docker compose up --build -d backend` recompiló tras alinear `CHAR(36)`. `docker compose ps -a` mostró backend `Up`, DB `healthy`; logs del arranque final muestran `EntityManagerFactory initialized` y `Started AutoHostApplication`, sin errores DDL en el intervalo revisado.
