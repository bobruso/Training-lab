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

Edita:

`app/src/main/res/values/strings.xml`

y cambia:

`https://TU_USUARIO.github.io/training-lab/`

por la URL definitiva de GitHub Pages.

## Privacidad

Los permisos los concede el usuario mediante Health Connect. El companion no guarda el token de Supabase de forma persistente: la web autenticada se lo entrega solo cuando pulsas **Sincronizar Health Connect**.

## Nota COROS

Para que los datos del PACE 4 aparezcan aquí, COROS debe estar configurado para compartir los tipos correspondientes con Health Connect. La disponibilidad concreta de cada métrica depende de lo que COROS publique en Health Connect.
