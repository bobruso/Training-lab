# Training Lab Android Companion

Este módulo convierte la web de Training Lab en una app Android que puede leer **Health Connect** y enviar los datos al backend de Supabase.

## Qué sincroniza en esta primera versión

- `SleepSessionRecord`: inicio/fin, sueño total, ligero, profundo y REM.
- `HeartRateVariabilityRmssdRecord`: HRV asociada al intervalo de sueño cuando existe.
- `RestingHeartRateRecord`: FC en reposo alrededor de la sesión de sueño.
- `ExerciseSessionRecord`: running, fútbol y fuerza.
- FC media/máxima asociada al entrenamiento.
- distancia y calorías asociadas.

El servidor receptor ya está desplegado como Edge Function `health-connect-ingest`.

## Antes de compilar

La URL ya está configurada como `https://bobruso.github.io/Training-lab/`. Sigue [BUILD.md](BUILD.md) para compilar con Java 17, SDK 36, AGP 8.10.1 y Gradle Wrapper 8.11.1. Compilación debug y lint verificadas en GitHub Actions; falta prueba funcional en teléfono.

## Privacidad

Los permisos los concede el usuario mediante Health Connect. El companion no guarda el token de Supabase de forma persistente: la web autenticada se lo entrega solo cuando pulsas **Sincronizar Health Connect**.

## Nota COROS

Para que los datos del PACE 4 aparezcan aquí, COROS debe estar configurado para compartir los tipos correspondientes con Health Connect. La disponibilidad concreta de cada métrica depende de lo que COROS publique en Health Connect.
