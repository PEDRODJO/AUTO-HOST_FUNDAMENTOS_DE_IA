# Estándar de documentación Backend Spring Boot — AUTO-HOST

## Arquitectura

- Controladores transportan HTTP y validan DTO de borde; servicios coordinan reglas/transacciones; repositorios JPA/Hibernate persisten.
- Las respuestas REST conservan los contratos consumidos por React: forma JSON, multipart, códigos HTTP, paginación y nombres de campos.
- `@RestControllerAdvice` traduce errores a respuestas públicas sin SQL, stack trace ni secretos.
- Spring Security es denegación por defecto: JWT Bearer y autorización por rol/operación. El frontend no constituye control de seguridad.
- Persistencia usa las tablas SQL existentes y `ddl-auto: validate`; cambios de esquema requieren migración versionada y especificación propia.

## Endpoints

Cada recurso debe documentar método/ruta, autenticación, roles, DTO, validación, status exitoso, errores 400/401/403/404/409, paginación y transacciones. Indicar límites de archivo (15 MB cada foto, máximo 10 para vehículo) y destino persistente.

## Guía de componentes

```text
<Controller> → <Service> → <Repository/JPA> → MySQL
DTO entrada/salida: campos, normalización y restricciones
Seguridad: JWT, roles y control por objeto
Errores: código HTTP + mensaje público
Transacción/concurrencia: límite, locks y conflicto esperado
Evidencia: comando ejecutado y entorno real
```

## Checklist por fases

- [ ] **Análisis:** leer la SPEC, skill REST, esquema SQL, consumidores y contratos actuales.
- [ ] **Diseño:** trazar REQ→AC→TASK; definir DTO, permisos, límites, integridad y transacciones.
- [ ] **Desarrollo:** separar Controller/Service/Repository; no exponer entidades ni secretos.
- [ ] **Validación:** compilar, ejecutar pruebas pertinentes y revisar autorización, constraints, paginación y concurrencia contra MySQL cuando aplique.
- [ ] **Entrega:** actualizar contrato, README y reporte con comandos y limitaciones verificables.
