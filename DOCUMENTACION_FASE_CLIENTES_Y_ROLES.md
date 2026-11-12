# Documentación técnica: Clientes, Roles y servicios de ubicación

## 1. Objetivo y contexto arquitectónico

La aplicación utiliza una arquitectura cliente-servidor. El cliente es una SPA ligera construida con HTML5, Bootstrap, CSS y JavaScript nativo; Express publica la API REST y los recursos estáticos; MySQL persiste usuarios, roles, talleres, clientes y el catálogo postal. Las pantallas de administración se montan dentro del área privada existente después de validar la sesión, y las solicitudes de escritura comprueban el rol administrador en el backend.

La navegación usa el fragmento de URL (`#inicio`, `#roles`, `#clientes`, `#taller`) para cambiar la vista sin recargar el documento. `client/app.js` conserva la responsabilidad del shell, el estado de sesión y el enrutamiento; las vistas de clientes y roles se cargan como fragmentos HTML separados y sus scripts enlazan formularios, tablas y llamadas a API.

## 2. Persistencia MySQL

Los esquemas usan InnoDB, `utf8mb4`, llaves UUID representadas como `CHAR(36)` y fechas `DATETIME`. `server/sql/schema.sql` inicializa `TallerDB2`, usuarios, credenciales, asignaciones y roles. `server/sql/workshops.sql` crea el catálogo de estatus, los talleres y la tabla `Clients` después de que existe `Talleres`, para que la llave foránea sea válida.

### 2.1 Clientes y contacto de emergencia

La tabla `Clients` guarda `ClientId`, nombre y apellidos del cliente, email, teléfono personal y de trabajo, dirección, código postal, taller asociado, fechas de auditoría e indicador `IsActive`. El contacto de emergencia se normaliza en tres atributos independientes: `NombreContactoEmergencia`, `ApellidoPaternoContactoEmergencia` y `ApellidoMaternoContactoEmergencia`. El apellido materno es opcional; el nombre y el apellido paterno se requieren en la captura.

`Email` tiene una restricción `UNIQUE`, de modo que la integridad se conserva incluso cuando dos solicitudes concurrentes intentan registrar el mismo correo. `TallerId` referencia `Talleres(id)`. Los registros nuevos requieren un taller activo; el campo puede ser nulo en registros antiguos migrados que aún no tenían asociación. `IsActive` es `TINYINT(1) NOT NULL DEFAULT 1` y permite baja lógica sin borrar información ni romper relaciones.

### 2.2 Roles

`Roles` incluye `IsActive` y `UpdatedAt`. La suspensión cambia el indicador a cero sin eliminar el registro. El esquema incluye los perfiles predefinidos; para una instalación existente, `server/sql/roles.sql` agrega las columnas de estado. `server/sql/clients.sql` transforma una tabla cliente de la versión inicial, mientras que `server/sql/clients_emergency_surnames.sql` migra una versión intermedia que ya tenía el nombre del contacto, pero no sus apellidos. Estas migraciones se ejecutan una sola vez y solo cuando la estructura de la base coincide con la versión indicada en sus comentarios.

## 3. API y reglas de negocio

Las rutas se registran en `server/src/routes/api.js`; el directorio de clientes y sus talleres, así como las escrituras de ambos módulos, requieren JWT válido y rol `administrador`. La lectura del catálogo de roles requiere JWT. Los identificadores, longitudes, correo, código postal, teléfonos y asociación con taller se validan en `clientsController.js` y `rolesController.js`. Las consultas usan placeholders de `mysql2`, no concatenan datos del usuario en el SQL.

### 3.1 Clientes

| Método y ruta | Función |
|---|---|
| `GET /api/clients?page=1&pageSize=10` | Devuelve clientes activos y metadatos de paginación. |
| `GET /api/clients/workshops` | Devuelve talleres con estatus activo para el selector. |
| `POST /api/clients` | Valida y crea un cliente; éxito `201`, correo duplicado `409`. |
| `PUT /api/clients/:id` | Actualiza los campos del cliente activo. |
| `DELETE /api/clients/:id` | Aplica soft delete mediante `IsActive=0`. |

La lista consulta el total y la página solicitada; el backend limita el tamaño de página a 50 y ejecuta `LIMIT ? OFFSET ?`. El cliente presenta diez filas por página y solicita cada página al servidor. Así, la paginación de interfaz no depende de descargar toda la tabla. La lista filtra `IsActive=1`; las bajas no se muestran como clientes activos.

### 3.2 Roles

| Método y ruta | Función |
|---|---|
| `GET /api/roles` | Lista roles activos y suspendidos para mostrar su estado. |
| `POST /api/roles` | Crea un rol activo; el patrón Command encapsula su escritura transaccional. |
| `PUT /api/roles/:id` | Actualiza el nombre y la descripción de un rol activo. |
| `DELETE /api/roles/:id` | Suspende el rol (`IsActive=0`), sin ejecutar un `DELETE` físico. |

Los nombres admiten letras Unicode, números, espacios, guion y guion bajo, entre 2 y 60 caracteres. La unicidad se garantiza en la base de datos; un conflicto se traduce a HTTP `409`. La vista deshabilita acciones para roles ya suspendidos.

## 4. Frontend de administración

`client/clients.html` define el fragmento del formulario y la tabla; `client/clients.js` solicita las páginas, construye las filas, abre el formulario de alta/edición y procesa la baja lógica. El modal incluye datos personales, los tres campos separados para el contacto de emergencia, teléfonos, domicilio y selector de taller activo. Se escapan los valores al renderizar HTML para evitar interpretar datos almacenados como marcado.

`client/roles.html` separa el formulario y el catálogo de roles del resto del dashboard. `client/roles.js` soporta creación y edición en el mismo formulario, presenta el estado de cada rol y confirma la suspensión antes de enviar la solicitud. `client/clients.css` y `client/roles.css` extienden el lenguaje visual corporativo del dashboard con paneles, estados, tabla y diálogos adaptables.

`client/index.html` carga ambos estilos y scripts, y `client/app.js` llama a cada vista cuando el enrutador cambia a `#clientes` o `#roles`. El frontend ofrece feedback con mensajes toast; el backend sigue siendo la autoridad para validar y autorizar las operaciones.

## 5. SEPOMEX y autocompletado postal

El catálogo local `Codigos_Postales` contiene una fila por combinación de código postal y colonia, con municipio y estado. `server/import-sepomex.js` importa el catálogo real desde `server/sepomex.json` por lotes; no fabrica datos postales. La restricción única por código postal/colonia evita duplicados y el índice por código postal acelera las búsquedas.

El endpoint `GET /api/sepomex/:cp` ejecuta una consulta parametrizada equivalente a:

```sql
SELECT estado, municipio, colonia
FROM Codigos_Postales
WHERE codigo_postal = ?;
```

La respuesta incluye estado, municipio y una lista de todas las colonias del CP. `client/workshop.js` utiliza esa respuesta para llenar estado y municipio y, cuando existen varias coincidencias, presenta un selector de colonia. Si el CP no existe en el catálogo o falla la solicitud, los campos siguen editables para captura manual. El catálogo solo queda completo después de importar el archivo SEPOMEX oficial proporcionado para el despliegue.

## 6. Patrones y responsabilidades

- **Adapter:** `ApiAdapter` normaliza transporte, JSON y errores HTTP para las llamadas del cliente.
- **Bridge:** `ApiBridge` separa las acciones de negocio del transporte HTTP concreto.
- **Decorator:** `AuthenticatedApiDecorator` agrega el token de sesión a las operaciones privadas y maneja sesiones expiradas.
- **Command:** los comandos de persistencia agrupan escrituras relacionadas y transacciones MySQL, como la creación de usuarios y roles.
- **Strategy:** el servicio de contraseñas selecciona la estrategia PBKDF2-HMAC-SHA-512 para derivar y verificar hashes; no almacena contraseñas en texto plano.
- **Observer:** el logger publica eventos a observadores de consola y archivo local para centralizar errores y eventos operativos.

## 7. Preparación y evaluación

1. Para una base nueva, ejecutar `server/sql/schema.sql` y después `server/sql/workshops.sql` en MySQL.
2. Para una base anterior, identificar su versión y ejecutar únicamente las migraciones aplicables (`roles.sql`, `clients.sql` o `clients_emergency_surnames.sql`); no repetir migraciones `ALTER TABLE` ya aplicadas.
3. Configurar `server/.env` con la conexión MySQL y los secretos de autenticación. Instalar dependencias con `pnpm install` dentro de `server` e iniciar con `pnpm dev`.
4. Iniciar sesión con un usuario que tenga el rol `administrador`. Crear primero un taller activo para poder asociar clientes.
5. En `#clientes`, comprobar alta con correo nuevo, rechazo del mismo correo (`409`), edición, navegación por páginas y baja lógica. Verificar en MySQL que la baja conserva la fila y cambia `IsActive` a cero.
6. En `#roles`, crear un rol, editar su nombre y suspenderlo. Verificar `IsActive` y que el registro permanezca en `Roles`.
7. Para validar SEPOMEX, colocar el catálogo real en `server/sepomex.json`, importar con `pnpm import:sepomex` y consultar un CP que esté presente en ese catálogo.
