# Bloqueos que requieren intervención

## Prueba real en Android y magic link

Este equipo no tiene JDK ni Android SDK. La compilación y lint han pasado en GitHub Actions con Gradle 8.11.1, AGP 8.10.1, compile SDK 36 y Java 17 (ejecución 34335864031). Falta probar el APK en un teléfono con Health Connect y COROS; no se puede verificar aquí que COROS publique todas las métricas.

El login está probado con peticiones interceptadas (sin enviar correos). Falta validar recepción real y retorno del enlace en navegador y Android. Confirmar en Supabase Training Lab → Authentication → URL Configuration:

- Site URL y redirect: `https://bobruso.github.io/Training-lab/`
- Redirect Android: `traininglab://auth`

No se ha consultado la configuración de Auth Management: los redirects del código están verificados, la allowlist del servicio no.

## FIT reales

El parser pasa una prueba binaria sintética de 20 minutos y tests de ownership, corrupción y ausencia de series. Falta contrastar FIT reales del PACE 4 (fútbol, running y fuerza) y la recepción completa autenticada de extremo a extremo.
