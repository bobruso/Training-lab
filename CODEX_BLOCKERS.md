# Bloqueos que requieren intervención

Actualizado: 9 de septiembre de 2026.

## Android / Health Connect — APK instalada

El usuario confirma que la APK de Training Lab ya está instalada en su móvil. La compilación y lint ya habían pasado en GitHub Actions con Gradle 8.11.1, AGP 8.10.1, compile SDK 36 y Java 17.

Pendiente de validación física en el teléfono:

1. Crear/entrar en la nueva cuenta de Training Lab con email + contraseña.
2. Abrir la sección de sincronización y pulsar Health Connect.
3. Conceder los permisos solicitados.
4. Confirmar que la app importa sueño y entrenamientos reales.
5. Comprobar en Training Lab que aparecen sueño, FC/HRV disponibles y actividades.
6. Verificar qué métricas publica realmente COROS PACE 4 a Health Connect.

El flujo actual ya no depende del magic link para el acceso normal: Codex sustituyó el login principal por email + contraseña. `traininglab://auth` puede seguir siendo útil para recuperación/redirects nativos, pero no es requisito para iniciar sesión normalmente en la APK.

## FIT reales

Un FIT real de fútbol COROS ya pasa el handler local y coincide con su resumen de sesión. Falta validar de extremo a extremo la subida autenticada y contrastar:

- FIT real de running.
- FIT real de fuerza/gimnasio.
- Series/repeticiones/peso cuando el PACE 4 realmente los incluya.

## Storage antiguo

Tras el reinicio autorizado de las cuentas antiguas quedó un binario FIT huérfano en el bucket privado. Los metadatos SQL y las cuentas se eliminaron correctamente, pero borrar filas SQL no borra el objeto físico de Storage.

El objeto pertenece al UUID antiguo y las nuevas cuentas no pueden acceder a él por las políticas de ownership. Se puede eliminar más adelante mediante Storage API/dashboard; no bloquea el funcionamiento actual.

## Seguridad Auth

El advisor de Supabase sigue mostrando `Leaked Password Protection Disabled`. Ahora que el acceso principal usa contraseña, conviene activar la protección contra contraseñas filtradas desde la configuración de Auth de Supabase cuando sea posible.
