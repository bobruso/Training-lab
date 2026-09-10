from pathlib import Path

main = Path('android-companion/app/src/main/java/com/traininglab/companion/MainActivity.kt')
s = main.read_text(encoding='utf-8')
old = '''        fun consumeSharedFit(): String {\n            if (!trusted(Uri.parse(webView.url ?: \"\"))) return \"\"\n            val payload = pendingSharedFit ?: return \"\"\n            pendingSharedFit = null\n            return payload\n        }'''
new = '''        fun consumeSharedFit(): String {\n            // JavascriptInterface methods run on WebView's bridge thread.\n            // Do not touch WebView from here: non-Training Lab main-frame URLs are\n            // already blocked/opened externally by WebViewClient.\n            val payload = pendingSharedFit ?: return \"\"\n            pendingSharedFit = null\n            return payload\n        }'''
if old not in s:
    raise SystemExit('consumeSharedFit block not found')
s = s.replace(old, new, 1)
main.write_text(s, encoding='utf-8')

build = Path('android-companion/app/build.gradle.kts')
s = build.read_text(encoding='utf-8')
if 'versionCode = 4' not in s or 'versionName = "0.4"' not in s:
    raise SystemExit('Expected Android version 0.4 not found')
s = s.replace('versionCode = 4', 'versionCode = 5', 1)
s = s.replace('versionName = "0.4"', 'versionName = "0.5"', 1)
build.write_text(s, encoding='utf-8')
