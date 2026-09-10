from pathlib import Path

p = Path('android-companion/app/src/main/java/com/traininglab/companion/MainActivity.kt')
s = p.read_text(encoding='utf-8')
needle = '''                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    if (trusted(request.url)) return false
                    if (request.isForMainFrame && request.url.scheme == "https") {
                        runCatching { startActivity(Intent(Intent.ACTION_VIEW, request.url)) }
                    }
                    return true
                }
'''
insert = needle + '''
                override fun onPageFinished(view: WebView, url: String?) {
                    super.onPageFinished(view, url)
                    val page = url ?: return
                    val uri = runCatching { Uri.parse(page) }.getOrNull() ?: return
                    if (!trusted(uri)) return

                    // v0.7 bootstrap: escape a stale service-worker cache without clearing
                    // cookies, localStorage, the Supabase session or Health Connect permissions.
                    view.evaluateJavascript(
                        """
                        (() => {
                          if (!navigator.onLine) return;
                          const build = document.querySelector('meta[name="build"]')?.content || '';
                          if (build === 'v8.3 · build iconfix83') return;
                          const key = 'traininglab-native-bootstrap-7';
                          if (sessionStorage.getItem(key)) return;
                          sessionStorage.setItem(key, '1');
                          const base = new URL('./', location.href).href;
                          const unregister = ('serviceWorker' in navigator)
                            ? navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.filter(r => r.scope.startsWith(base)).map(r => r.unregister())))
                            : Promise.resolve();
                          const clear = ('caches' in window)
                            ? caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('training-lab-')).map(k => caches.delete(k))))
                            : Promise.resolve();
                          Promise.all([unregister, clear]).finally(() => location.replace('./?__native_bootstrap=7&ts=' + Date.now()));
                        })();
                        """.trimIndent(),
                        null
                    )
                }
'''
if needle not in s:
    raise SystemExit('WebViewClient target not found')
if 'traininglab-native-bootstrap-7' in s:
    raise SystemExit('Bootstrap already installed')
s = s.replace(needle, insert, 1)
p.write_text(s, encoding='utf-8')
