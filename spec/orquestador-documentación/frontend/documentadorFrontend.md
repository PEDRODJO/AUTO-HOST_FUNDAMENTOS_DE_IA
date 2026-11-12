# Estándar de documentación Frontend React — AUTO-HOST

## Propósito y alcance

Esta guía define cómo documentar la SPA React de AUTO-HOST con JSDoc/TSDoc y Markdown. Su objetivo es que una persona pueda entender la responsabilidad, las entradas, los efectos y los contratos de cada componente sin duplicar lo que el código ya expresa. Se aplica a componentes funcionales, props, funciones, hooks y módulos de integración.

## Comando de invocación

Para solicitar la aplicación de esta guía, usar explícitamente:

```text
INVESTIGAR COMO documentar frontend React en AUTO-HOST
```

Al invocarlo, leer primero este documento y `spec/orquestador/orquestador .md`; documentar solo los archivos incluidos en la solicitud y validar los criterios de esta guía.

## Estándares JSDoc/TSDoc

### Componentes y props

- Documentar componentes exportados con una descripción breve de su responsabilidad y comportamiento observable.
- Definir las props en un tipo o interfaz próximo al componente. Documentar props públicas cuando el nombre o tipo no explique restricciones, valores por defecto, callbacks o efectos.
- Describir requisitos relevantes de accesibilidad, estados visibles (carga, vacío y error), permisos de la vista y restricciones de UX.
- No escribir un comentario que repita literalmente el nombre del componente o su implementación.

Ejemplo JavaScript:

```jsx
/**
 * Presenta los datos del vehículo y las acciones permitidas al usuario.
 * @param {{ vehicle: Vehicle, onEdit: (id: string) => void }} props
 */
export function VehicleCard({ vehicle, onEdit }) {
  // ...
}
```

Con TypeScript, preferir tipos explícitos y TSDoc para describir restricciones o intención que no se desprendan del tipo:

```tsx
/** Solo se muestran vehículos activos y disponibles para asociación. */
export interface VehiclePickerProps {
  clientId: string;
  onAssigned: (vehicleId: string) => void;
}
```

### Funciones

- Documentar funciones exportadas, callbacks de dominio y utilidades no triviales.
- Registrar propósito, parámetros con restricciones, valor de retorno y errores que el llamador deba manejar (`@param`, `@returns`, `@throws`).
- Aclarar efectos externos, por ejemplo peticiones HTTP, cambios de navegación o acceso a almacenamiento local.
- Mantener nombres de parámetros y tipos sincronizados con la firma real.

### Hooks

- Documentar hooks personalizados con su propósito, entradas, valores devueltos, efectos y condiciones de uso.
- Para `useEffect`, comentar únicamente dependencias, sincronizaciones externas o decisiones que no sean obvias; no narrar el ciclo de React.
- Indicar cancelación/limpieza cuando un hook gestiona suscripciones, temporizadores o solicitudes cancelables.
- Evitar ocultar llamadas a API o cambios de estado global dentro de hooks con nombres ambiguos.

### Vistas y consumo de API

La ficha de cada vista en Markdown o en el encabezado del módulo debe identificar, según aplique:

- Ruta y propósito de la pantalla, además de los roles que pueden acceder.
- Endpoints y forma de los datos consumidos; la autorización real siempre corresponde al backend.
- Estados de carga, vacío, éxito y error, incluidos conflictos `409` que la interfaz presente al usuario.
- Validaciones del cliente, límites de archivos y paginación; estas validaciones de UX no sustituyen las del servidor.
- Acciones disponibles y su resultado visible, incluidas confirmaciones de soft delete.

No incluir JWT, credenciales, datos personales reales ni valores de configuración secretos en comentarios, ejemplos o capturas.

## Plantilla breve de vista/componente

```md
### NombreDelComponente
- Responsabilidad y ruta:
- Acceso/roles:
- Props o entradas públicas:
- API y formato de datos:
- Estados de interfaz y errores:
- Validaciones y límites:
- Criterios de aceptación relacionados:
```

## Checklist por fases

- [ ] **Análisis:** identificar componentes, consumidores, permisos y contratos API existentes; separar hechos de supuestos.
- [ ] **Diseño:** decidir dónde aporta valor JSDoc/TSDoc y qué estados, props, errores o efectos requieren explicación.
- [ ] **Documentación:** describir responsabilidades, entradas/salidas y efectos observables; mantener comentarios concisos y alineados con el código.
- [ ] **Validación:** revisar firmas y enlaces; comprobar ejemplos y comandos pertinentes. Ejecutar build solo cuando esté dentro del alcance solicitado y reportar el resultado real.
- [ ] **Entrega:** enumerar documentos o módulos actualizados y señalar límites de validación.
