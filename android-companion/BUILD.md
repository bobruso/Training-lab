# Compilación y validación Android

Requisitos: JDK 17, Android SDK Platform 36 y Build Tools compatibles con AGP 8.10.1. El repositorio incluye Gradle Wrapper 8.11.1 y checksum de distribución oficial. [Compatibilidad de AGP](https://developer.android.com/build/releases/agp-8-10-0-release-notes).

1. Instalar los componentes mediante Android Studio/SDK Manager.
2. Configurar `JAVA_HOME` al JDK 17 y `ANDROID_HOME` al SDK; alternativamente, crear `local.properties` con `sdk.dir=...` (no se versiona).
3. Desde `android-companion`:

```powershell
.\gradlew.bat :app:assembleDebug :app:lintDebug --no-daemon
```

Linux/macOS: `./gradlew :app:assembleDebug :app:lintDebug --no-daemon`.

Salida: `app/build/outputs/apk/debug/app-debug.apk`. No subir APKs ni keystores a Git. **Compilación y lint verificados en GitHub Actions**, ejecución [34335864031](https://github.com/bobruso/Training-lab/actions/runs/34335864031). Falta validación funcional en teléfono.

La URL ya es `https://bobruso.github.io/Training-lab/`. El backend permitido es exclusivamente `https://nnpvklaxhomarxszlclt.supabase.co`. Auth retorna mediante `traininglab://auth`. No usa Patxanguilles.

## Prueba en teléfono

1. Instalar APK y abrir Training Lab.
2. Pedir un único magic link; verificar retorno al WebView con sesión.
3. Conectar COROS a Health Connect y compartir los datos disponibles.
4. Pulsar Health Connect y conceder permisos.
5. Comparar sueño, entrenamiento y último sync. Repetir para comprobar que no duplica.

El token se conserva durante la operación y se borra después. Los enlaces externos se abren fuera del WebView. [Seguridad de puentes WebView](https://developer.android.com/privacy-and-security/risks/insecure-webview-native-bridges).

Pendiente: validar paginación de todos los registros, deduplicación entre apps proveedoras, permisos parciales y asociación de distancia/calorías en intervalos solapados. No se ha probado en un dispositivo físico durante esta sesión.

## Descargar el APK de prueba

En GitHub → Actions → Training Lab quality, abrir una ejecución correcta y descargar el artefacto `training-lab-android-debug`. Extraer el ZIP e instalar `app-debug.apk` en Android. El artefacto caduca a los 14 días; no se añade el binario a Git. Es una compilación de prueba firmada con la clave debug del runner: futuras compilaciones pueden requerir desinstalar la anterior (se pierde la sesión local, no los datos ya sincronizados en Supabase).
