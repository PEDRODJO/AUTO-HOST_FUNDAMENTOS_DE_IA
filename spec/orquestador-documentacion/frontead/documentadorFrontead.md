# Guía de documentación Frontend React — AUTO-HOST

## Propósito

Documentar los componentes React de la SPA con información útil para mantener el contrato visual y funcional. Los comentarios en el código explican decisiones y casos no evidentes; no repiten instrucciones línea por línea.

## Estándares de documentación

- Por vista, indicar objetivo, rol que puede acceder, endpoints consumidos y estados vacíos/carga/error.
- En formularios, documentar validación de entrada y normalización (VIN minúsculo, placa normalizada y límite de 15 MB por fotografía).
- Para listas, especificar parámetros y topes de paginación, filtros de estado y acciones permitidas por rol.
- Para asociación vehículo-cliente, aclarar que el backend valida disponibilidad de forma transaccional; la selección del frontend es solo una prevalidación de UX.
- No documentar tokens, contraseñas ni datos personales reales. Usar ejemplos ficticios.
- Mantener las instrucciones ejecutables sincronizadas con `README.md` y rutas con `spec/vehiculos.md`.

## Plantilla recomendada por componente

```md
### NombreDelComponente
- Responsabilidad:
- Ruta/vista:
- Roles autorizados:
- API:
- Estados y errores visibles:
- Validaciones del cliente:
- Criterios de aceptación relacionados:
```

## Checklist por fases

- [ ] **Análisis:** confirmar componente, consumidores, roles y contrato REST actual.
- [ ] **Diseño:** especificar entradas, estados de UX y criterios de aceptación antes del cambio.
- [ ] **Desarrollo:** mantener componentes enfocados, accesibilidad, feedback y límite de paginación 10.
- [ ] **Validación:** ejecutar build y verificar permisos, errores 409, carga de fotos y rutas afectadas.
- [ ] **Entrega:** actualizar esta guía o el documento de módulo con evidencia real y pendientes.
