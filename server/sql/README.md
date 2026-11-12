# Cuenta semilla

La clave anotada para primer acceso es `Taller2026!`. La semilla usa PBKDF2-HMAC-SHA-512 y 600000 iteraciones, salt fijo aleatorio. Para mantenerla operativa en la instalación inicial configura `PASSWORD_PEPPER` con este valor exacto:

`TallerAdmin-Initial-Pepper-Change-Immediately-2026`

Este valor es solo para desarrollo y debe sustituirse con una rotación de credenciales antes de cualquier despliegue. Genera un nuevo hash con `passwordService.hashPassword` y actualiza el registro.
