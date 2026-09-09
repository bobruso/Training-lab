from pathlib import Path

main = Path('android-companion/app/src/main/java/com/traininglab/companion/MainActivity.kt')
s = main.read_text(encoding='utf-8')
s = s.replace('settings.allowContentAccess = false', 'settings.allowContentAccess = true')
old = '''                    val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {\n                        addCategory(Intent.CATEGORY_OPENABLE)\n                        type = "*/*"\n                        putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false)\n                    }\n                    return try {\n                        fileChooserLauncher.launch(intent)\n                        true\n                    } catch (_: Exception) {'''
new = '''                    val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {\n                        addCategory(Intent.CATEGORY_OPENABLE)\n                        type = "*/*"\n                        putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false)\n                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)\n                    }\n                    return try {\n                        fileChooserLauncher.launch(Intent.createChooser(intent, "Selecciona un archivo .FIT"))\n                        true\n                    } catch (_: Exception) {'''
if old not in s:
    raise SystemExit('file chooser block not found')
s = s.replace(old, new)
old2 = '''        val uris = if (result.resultCode == Activity.RESULT_OK) {\n            WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)\n        } else null\n        callback.onReceiveValue(uris)'''
new2 = '''        val uris = if (result.resultCode == Activity.RESULT_OK) {\n            val parsed = WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)\n                ?: result.data?.data?.let { arrayOf(it) }\n            parsed?.forEach { uri ->\n                runCatching {\n                    contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)\n                }\n            }\n            parsed\n        } else null\n        callback.onReceiveValue(uris)'''
if old2 not in s:
    raise SystemExit('file chooser result block not found')
s = s.replace(old2, new2)
main.write_text(s, encoding='utf-8')

gradle = Path('android-companion/app/build.gradle.kts')
g = gradle.read_text(encoding='utf-8')
g = g.replace('versionCode = 1', 'versionCode = 2')
g = g.replace('versionName = "0.1"', 'versionName = "0.2"')
gradle.write_text(g, encoding='utf-8')
