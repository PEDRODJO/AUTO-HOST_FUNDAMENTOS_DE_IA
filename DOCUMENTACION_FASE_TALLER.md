# Documentación — Fase de Registro de Taller

## Alcance

Esta fase agrega una vista privada al dashboard ya existente para capturar un taller. Usa el token de sesión que ya provee el dashboard. No implementa acceso/login, usuarios, clientes ni asociación entre clientes y talleres. El punto reservado para clientes queda marcado con un único `TODO` en el controlador.

## Archivos desarrollados

- `client/workshop.js`: renderiza el formulario dentro del área de contenido existente, valida RFC/email/CP, consulta el catálogo SEPOMEX local por CP, ofrece un selector cuando hay varias colonias, envía `multipart/form-data`, muestra toast de error y modal de éxito.
- `client/workshop.css`: estilos del formulario, indicador visual Activo y modal responsive.
- `client/app.js`: añade la opción privada `Registrar Taller` y llama al módulo para renderizar la fase dentro del dashboard.
- `client/index.html`: carga la hoja de estilos y el módulo de la fase antes del código del dashboard.
- `server/src/routes/workshops.js`: expone `POST /api/workshops` y protege el envío con el middleware de sesión. También entrega la fotografía a usuarios autenticados por `GET /api/workshops/photos/:filename`.
- `server/src/controllers/workshopController.js`: normaliza los campos de texto a minúsculas, valida los datos, inserta el registro parametrizado y traduce duplicados a HTTP 409.
- `server/src/controllers/sepomexController.js`: consulta el catálogo MySQL local y responde con estado, municipio y la lista de colonias del CP.
- `server/import-sepomex.js`: importa por lotes el archivo `server/sepomex.json` a `Codigos_Postales`; no fabrica datos postales.
- `server/src/middleware/workshopUpload.js`: recibe la imagen con Multer, permite JPG/PNG/WEBP, limita el tamaño a 15 MiB y elimina archivos temporales si la validación o inserción falla.
- `server/sql/workshops.sql`: crea el catálogo de estatus y la tabla `Talleres`, con llaves UUID, valores iniciales, integridad referencial y restricciones de unicidad.
- `server/package.json`: agrega Multer como dependencia.

## Esquema de datos

`Estatus` centraliza `id CHAR(36)` y `nombre_estatus`. Se insertan `activo`, `inactivo` y `suspendido`; los UUID predefinidos hacen idempotente la semilla. `Talleres` tiene un UUID `CHAR(36)` generado por el backend y los campos del formulario. `fk_estatus` tiene como valor por defecto el UUID de `activo` y referencia `Estatus(id)`. RFC y email tienen restricciones `UNIQUE` independientes. `Codigos_Postales` guarda el catálogo real SEPOMEX; la importación está separada de la creación del esquema.

## Expresiones regulares

- RFC: `^[a-z0-9]{12,13}$` con bandera `i` en el cliente y el backend. Coincide con la regla solicitada de 12 o 13 caracteres alfanuméricos; la versión normalizada se guarda en minúsculas.
- Email: `^[a-z0-9.!#$%&'*+/=?^_\`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$`, con bandera `i`. Requiere texto antes de `@`, un dominio y al menos un punto de dominio.
- Código postal: `^\d{5}$`; solo cinco dígitos.

Los patrones RFC y email están en el atributo HTML `pattern`, se vuelven a comprobar con JavaScript antes del envío y se validan de nuevo en el servidor. El servidor responde HTTP 400 si fallan.

## Carga de fotografía

La petición usa el campo `fotografia` de un formulario multipart. Multer impone un máximo de `15 * 1024 * 1024` bytes por archivo y rechaza tipos MIME distintos de JPG, PNG o WEBP. Los nombres se generan con UUID; `ruta_fotografia` guarda la ruta autenticada de consulta de la imagen.

## Código postal

La vista consulta `GET /api/sepomex/:cp` en este backend. El endpoint usa `SELECT estado, municipio, colonia FROM Codigos_Postales WHERE codigo_postal = ?` y devuelve todas las colonias coincidentes. Si hay varias, el frontend muestra un `<select>`; si no hay respuesta o CP, los campos quedan editables para captura manual.

## Cómo ejecutar y probar

1. Configura `server/.env` con una conexión válida a MySQL y el secreto de sesión existente.
2. Ejecuta `server/sql/schema.sql` y después `server/sql/workshops.sql` en MySQL.
3. Coloca el catálogo SEPOMEX real en `server/sepomex.json` y ejecuta `pnpm import:sepomex` desde `server`.
4. Instala dependencias desde `server` con `pnpm install`.
5. Inicia el backend con `pnpm dev` y abre el dashboard con una sesión autenticada.
6. Abre `Registrar Taller`, completa los datos y selecciona una fotografía menor o igual a 15 MiB.
7. Prueba el envío autenticado usando el token de sesión:

```bash
curl -X POST http://localhost:3000/api/workshops \
  -H "Authorization: Bearer <TOKEN_DE_SESION>" \
  -F "nombre=Taller Ejemplo" \
  -F "rfc=ABC123456XYZ" \
  -F "email=contacto@taller.example" \
  -F "calle=Av. Central" \
  -F "numero=123" \
  -F "colonia=Centro" \
  -F "codigo_postal=06000" \
  -F "estado=Ciudad de México" \
  -F "municipio=Cuauhtémoc" \
  -F "fotografia=@./taller.jpg"
```

El resultado exitoso es HTTP 201; RFC/email inválidos producen 400; RFC o email ya registrados producen 409. Una solicitud sin sesión produce 401. Para probar el lookup de CP, solicita `GET http://localhost:3000/api/sepomex/06000`; la respuesta contiene `estado`, `municipio` y `colonias`. Para probar duplicados, repite la petición de taller con RFC o email ya guardados.

## Correo de autenticación

El backend usa Nodemailer. En el entorno de desarrollo, `MAIL_MODE=ethereal` crea una cuenta temporal automáticamente y captura los correos sin entregarlos realmente. Revisa `server/logs/application.log` y abre el enlace `previewUrl` del evento `Ethereal email preview`. El registro envía la bienvenida; la recuperación envía un enlace `http://localhost:3000/reset-password?token=...`, válido durante 30 minutos. La base de datos solo conserva el SHA-256 del token; el token original viaja por correo. Para Mailtrap/SMTP configura `MAIL_MODE=smtp` y las variables `SMTP_*`/`EMAIL_FROM` en `server/.env`.

## Módulo de administración de clientes

La tabla `Clients` se crea junto con el esquema de talleres en `server/sql/workshops.sql` y mantiene los datos personales, teléfonos, domicilio, `TallerId` y el indicador `IsActive`. En una instalación existente que conserve la tabla anterior con `FullName` y `Phone`, ejecuta una sola vez `server/sql/clients.sql` después de `workshops.sql`; la migración conserva los registros existentes y agrega los campos nuevos. La interfaz autenticada se compone de `client/clients.html`, `client/clients.js` y `client/clients.css`. Los endpoints paginan las consultas con `LIMIT`/`OFFSET`, validan correo y taller, impiden emails duplicados y desactivan registros mediante soft delete. Las rutas de administración requieren el rol `administrador`.
