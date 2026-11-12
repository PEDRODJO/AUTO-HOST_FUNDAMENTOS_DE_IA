# Taller Admin

Aplicación de gestión AUTO-HOST con React/Vite, API Spring Boot y MySQL. El backend Node heredado permanece en `server/src` fuera del runtime publicado mientras se completa la validación funcional de paridad.

## Requisitos e inicio

- Java 17+, Maven 3.6.3+ (o Docker Compose v2) y MySQL 8 o compatible.
- En una instalación nueva, ejecuta `server/sql/schema.sql` y después `server/sql/workshops.sql` en MySQL; el segundo script crea `Talleres` y `Clients` con su llave foránea.
- Ejecuta `server/sql/vehicles.sql` después de `schema.sql` y `workshops.sql` para crear Vehiculos y sus FKs opcionales a `Users` (mecánico) y `Clients`.
- Si actualizas una instalación antigua cuya tabla `Clients` aún tiene las columnas `FullName` y `Phone`, ejecuta una sola vez `server/sql/clients.sql` después de `workshops.sql` para migrar esos datos y agregar los campos nuevos.
- Para una base ya instalada con el esquema previo de `Roles`, ejecuta una sola vez `server/sql/roles.sql` para agregar el estado de suspensión. Si ya ejecutaste la migración de clientes de la fase anterior que guardaba un solo nombre para el contacto de emergencia, ejecuta una sola vez `server/sql/clients_emergency_surnames.sql`.
- Para una base existente con `Talleres` creada antes del borrado lógico, ejecuta una sola vez `server/sql/workshops_soft_delete.sql`; las instalaciones nuevas ya crean `IsActive` desde `workshops.sql`.
- Copia `server/.env.example` a `server/.env` y configura `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET` (32+ caracteres aleatorios), `PASSWORD_PEPPER` y el correo de prueba.
- En la raíz instala el cliente con `npm --prefix client install --legacy-peer-deps` (el flag evita un fallo del resolvedor npm observado en este entorno).
- Terminal 1, desde la raíz: `npm run dev:server` (API Spring Boot, puerto 3000; requiere Maven y Java 17+).
- Terminal 2, desde la raíz: `npm run dev` (React + Vite, [http://localhost:5173](http://localhost:5173)); Vite envía `/api` al servidor local.
- La cuenta inicial es `admin@taller.com`, contraseña `Taller2026!`; cámbiala después de entrar.
- Para compilar el SPA: `npm run build`. Nginx sirve `client/dist` dentro del contenedor de frontend; en desarrollo, usa Vite en el puerto 5173.

## Despliegue con Docker

Requiere Docker Engine/Desktop con Docker Compose v2. Copia `.env.docker.example` a `.env` en la raíz y reemplaza las contraseñas, `JWT_SECRET` (mínimo 32 caracteres aleatorios) y `PASSWORD_PEPPER` por valores privados fuertes. Arranca los tres servicios con el comando único:

```sh
docker compose up --build
```

Abre el dashboard en [http://localhost:8080](http://localhost:8080). Nginx sirve React y reenvía `/api` al backend; el backend escucha en el puerto 3000 y conecta con MySQL mediante el hostname interno `db`. MySQL publica 3306 en el host (puede cambiarse con `MYSQL_PORT`). Los datos de MySQL, las fotos de vehículos/talleres y los logs se conservan en volúmenes Docker. Para detener: `docker compose down`; esto conserva los volúmenes. `docker compose down -v` elimina permanentemente la base y los archivos de esos volúmenes.

En la primera creación del volumen MySQL, Compose inicializa `schema.sql`, `workshops.sql` y `vehicles.sql`, en ese orden. Los scripts de migración para bases existentes no se ejecutan automáticamente. El puerto del frontend puede cambiarse con `FRONTEND_PORT`; el puerto público de la API, con `BACKEND_PORT`. En un despliegue de producción expuesto a Internet, configura SMTP real y termina TLS en un proxy HTTPS antes del acceso público.

### Importar el catálogo postal SEPOMEX

Coloca el archivo oficial/completo `sepomex.json` dentro de `server/` y ejecuta `pnpm import:sepomex` desde esa carpeta. El importador lee el archivo proporcionado, normaliza los formatos comunes de columnas SEPOMEX e inserta por lotes; no genera registros postales de ejemplo. El archivo no se incluye en el repositorio. Para Live Server (puerto 5500), el frontend consulta `http://localhost:3000/api/sepomex/:cp`.

El hash inicial SQL usa PBKDF2-HMAC-SHA-512 (600,000 iteraciones); salt y hash están en hexadecimal. `PASSWORD_PEPPER` debe coincidir con el valor usado para generar el hash semilla (ver `server/sql/README.md`). Cambia el pepper y el hash semilla antes de un despliegue real.

## Patrones aplicados

- Cliente: **Adapter** normaliza la API; **Bridge** separa abstracción de servicio e implementación HTTP; **Decorator** agrega token y manejo uniforme de errores.
- Servidor: **Strategy** elige derivación/verificación PBKDF2; **Observer** publica eventos a logger de archivo y consola; **Command** encapsula operaciones transaccionales.

El dashboard solo se monta tras validar un token firmado. Esto es una protección de interfaz; la API valida el token y permisos independientemente. El registro envía un mensaje de bienvenida y la recuperación envía un enlace de restablecimiento con un token de un solo uso que vence en 30 minutos.

### Administración de clientes

El módulo privado usa `GET /api/clients?page=1&pageSize=10`, `POST /api/clients`, `PUT /api/clients/:id` y `DELETE /api/clients/:id`. Las operaciones de Clientes requieren el rol `administrador`; la lista solo incluye clientes activos y las bajas cambian `IsActive` a cero. El contacto de emergencia guarda nombre, apellido paterno y apellido materno en columnas independientes. Para asociar un cliente, el formulario consulta los talleres activos. Roles usa `GET /api/roles` para el catálogo autenticado y `POST`, `PUT /api/roles/:id`, `DELETE /api/roles/:id` para crear, actualizar y suspender; las escrituras requieren administrador.

El sidebar presenta rutas separadas de creación y administración para Roles, Clientes, Talleres y Vehículos. Cada ruta renderiza su propio componente React bajo `client/src/pages/`; los formularios de inserción no comparten pantalla con las tablas de administración.

El RFC del taller se valida en el navegador y el backend con la estructura mexicana: tres letras para persona moral o cuatro para persona física (incluye Ñ y &), fecha YYMMDD con mes y día dentro de rangos válidos, y homoclave alfanumérica de tres caracteres. Las restricciones `UNIQUE` de `Talleres` son la validación final concurrente; una duplicidad devuelve HTTP 409 e identifica el RFC o el correo cuando MySQL informa la clave afectada.

### Correos de desarrollo

El backend Spring Boot envía correos mediante SMTP. Configura `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` y `EMAIL_FROM` en `.env`; el modo Ethereal de la implementación Node heredada no está portado y la recuperación responderá 503 hasta configurar SMTP.

### Administración de talleres

La vista privada `Administrar Talleres` consume `GET /api/workshops?page=1&pageSize=10`, `PUT /api/workshops/:id` y `DELETE /api/workshops/:id`. Las rutas requieren autenticación y el rol `administrador`. El listado pagina en MySQL con `LIMIT` y `OFFSET` e incluye talleres activos e inactivos; editar permite reemplazar opcionalmente la fotografía (JPG, PNG o WEBP, máximo 15 MB). El borrado lógico actualiza `IsActive=0`, conserva las filas relacionadas y evita que el taller se ofrezca al registrar o cambiar la asociación de un cliente.

### Módulo de Vehículos

La migración [vehicles.sql](server/sql/vehicles.sql) se ejecuta después de las tablas de usuarios, talleres y clientes. Crea índices UNIQUE para VIN/Placa y llaves foráneas opcionales a mecánico y cliente. El módulo usa `GET /api/vehicles?page=1&pageSize=10&includeInactive=false`, `GET /api/vehicles/mechanics`, `POST /api/vehicles`, `PUT /api/vehicles/:id`, `DELETE /api/vehicles/:id` y `GET /api/vehicles/photos/:filename`. La paginación limita el tamaño de página a 10; `includeInactive=true` muestra también vehículos desactivados. `POST` y `PUT` reciben multipart; cada vehículo admite hasta 10 fotos JPG/PNG/WEBP de máximo 15 MB por archivo. Las fotos se guardan localmente en `server/uploads/vehicles` y se referencian en JSON.

El acceso a Vehículos exige JWT y rol `admin` o `recepcionista`; el guard reconoce también `administrador`, nombre histórico del rol sembrado. El VIN se normaliza a minúsculas y admite 17 caracteres sin I/O/Q. Las placas se normalizan a minúsculas, eliminan guiones/espacios y aceptan `ABC1234`, `AB123CD` y `ABC123D`. Para asociar un vehículo desde Administración de Clientes se usan `GET /api/clients/:id/vehicles` y `PUT /api/clients/:id/vehicles`; el endpoint valida cliente y vehículo activo, estatus `activo` y disponibilidad dentro de una transacción con bloqueo de fila.

## Estructura

`client/` interfaz, `server/src/` API, `server/sql/schema.sql` esquema y datos iniciales.
