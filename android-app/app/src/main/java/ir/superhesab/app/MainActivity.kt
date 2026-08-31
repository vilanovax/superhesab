package ir.superhesab.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.view.View
import android.webkit.CookieManager
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.LinearLayout
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.google.android.material.button.MaterialButton

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var refresh: SwipeRefreshLayout
    private lateinit var loading: LinearLayout
    private lateinit var offline: LinearLayout

    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    private val startUrl: String
        get() = BuildConfig.WEB_URL

    private val fileChooserLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val uris = WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
            filePathCallback?.onReceiveValue(uris)
            filePathCallback = null
        }

    private val notificationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { /* optional */ }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, true)
        setContentView(R.layout.activity_main)
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.root)) { v, insets ->
            val nav = insets.getInsets(WindowInsetsCompat.Type.navigationBars())
            v.setPadding(v.paddingLeft, v.paddingTop, v.paddingRight, nav.bottom)
            insets
        }

        webView = findViewById(R.id.webview)
        refresh = findViewById(R.id.refresh)
        loading = findViewById(R.id.loading)
        offline = findViewById(R.id.offline)
        val retry = findViewById<MaterialButton>(R.id.retry)

        configureWebView()
        refresh.setColorSchemeResources(R.color.brand)
        refresh.setOnRefreshListener { webView.reload() }
        retry.setOnClickListener { loadApp(force = true) }

        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    if (webView.canGoBack()) {
                        webView.goBack()
                    } else {
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                    }
                }
            },
        )

        val deepLink = intent?.data?.toString()
        loadApp(url = sanitizeLoadUrl(deepLink))
    }

    override fun onPause() {
        super.onPause()
        CookieManager.getInstance().flush()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        intent.data?.toString()?.let { loadApp(url = sanitizeLoadUrl(it), force = true) }
    }

    /** Hosts allowed to render inside the trusted SuperHesab WebView shell. */
    private fun isAllowedAppHost(host: String?): Boolean {
        val h = host?.lowercase()?.trim('.').orEmpty()
        if (h.isEmpty()) return false
        val configured = Uri.parse(startUrl).host?.lowercase().orEmpty()
        if (configured.isNotEmpty() && (h == configured || h.endsWith(".$configured"))) {
            return true
        }
        if (h == "superhesab.ir" || h.endsWith(".superhesab.ir")) {
            return true
        }
        // Emulator / local debug only when WEB_URL itself points there
        if (h == "localhost" || h == "127.0.0.1" || h == "10.0.2.2") {
            return configured == h
        }
        return false
    }

    private fun isAllowedInAppUrl(url: String?): Boolean {
        if (url.isNullOrBlank()) return false
        val uri =
            try {
                Uri.parse(url)
            } catch (_: Exception) {
                return false
            }
        val scheme = uri.scheme?.lowercase().orEmpty()
        if (scheme != "https" && scheme != "http") return false
        // Production APK uses cleartext=false; still allow http only for local WEB_URL hosts.
        if (scheme == "http") {
            val host = uri.host?.lowercase().orEmpty()
            if (host != "localhost" && host != "127.0.0.1" && host != "10.0.2.2") {
                return false
            }
        }
        return isAllowedAppHost(uri.host)
    }

    /** Deep links / intents outside the allowlist fall back to the official start URL. */
    private fun sanitizeLoadUrl(url: String?): String {
        val candidate = url?.takeIf { isAllowedInAppUrl(it) }
        return candidate ?: startUrl
    }

    private fun openExternalUri(uri: Uri) {
        val scheme = uri.scheme?.lowercase().orEmpty()
        if (scheme != "https" && scheme != "http" && scheme != "mailto" && scheme != "tel") {
            return
        }
        try {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
        } catch (_: Exception) {
            // No handler — ignore
        }
    }

    private fun configureWebView() {
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            mediaPlaybackRequiresUserGesture = true
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            allowFileAccess = false
            allowContentAccess = false
            javaScriptCanOpenWindowsAutomatically = false
            userAgentString = "$userAgentString SuperHesabAndroid/${BuildConfig.VERSION_NAME}"
        }
        webView.webChromeClient =
            object : WebChromeClient() {
                override fun onShowFileChooser(
                    webView: WebView?,
                    filePathCallback: ValueCallback<Array<Uri>>?,
                    fileChooserParams: FileChooserParams?,
                ): Boolean {
                    this@MainActivity.filePathCallback?.onReceiveValue(null)
                    this@MainActivity.filePathCallback = filePathCallback
                    val intent =
                        fileChooserParams?.createIntent()
                            ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                                addCategory(Intent.CATEGORY_OPENABLE)
                                type = "*/*"
                            }
                    return try {
                        fileChooserLauncher.launch(intent)
                        true
                    } catch (_: Exception) {
                        this@MainActivity.filePathCallback = null
                        filePathCallback?.onReceiveValue(null)
                        false
                    }
                }
            }
        webView.setDownloadListener { url, userAgent, contentDisposition, mimeType, _ ->
            enqueueDownload(url, userAgent, contentDisposition, mimeType)
        }
        webView.webViewClient =
            object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView,
                    request: WebResourceRequest,
                ): Boolean {
                    val uri = request.url
                    val scheme = uri.scheme?.lowercase().orEmpty()
                    if (scheme != "http" && scheme != "https") {
                        openExternalUri(uri)
                        return true
                    }
                    return if (isAllowedAppHost(uri.host)) {
                        false
                    } else {
                        openExternalUri(uri)
                        true
                    }
                }

                override fun onPageStarted(
                    view: WebView?,
                    url: String?,
                    favicon: Bitmap?,
                ) {
                    if (!refresh.isRefreshing) {
                        loading.visibility = View.VISIBLE
                    }
                    offline.visibility = View.GONE
                }

                override fun onPageFinished(
                    view: WebView?,
                    url: String?,
                ) {
                    loading.visibility = View.GONE
                    refresh.isRefreshing = false
                    CookieManager.getInstance().flush()
                }

                override fun onReceivedError(
                    view: WebView,
                    request: WebResourceRequest,
                    error: WebResourceError,
                ) {
                    if (request.isForMainFrame) {
                        showOffline()
                    }
                }
            }
    }

    private fun enqueueDownload(
        url: String,
        userAgent: String,
        contentDisposition: String?,
        mimeType: String?,
    ) {
        if (url.startsWith("blob:") || url.startsWith("data:")) {
            Toast.makeText(this, R.string.download_unsupported, Toast.LENGTH_LONG).show()
            return
        }
        if (!isAllowedInAppUrl(url)) {
            Toast.makeText(this, R.string.download_unsupported, Toast.LENGTH_LONG).show()
            return
        }
        ensureNotificationPermission()
        val filename = URLUtil.guessFileName(url, contentDisposition, mimeType)
        val request =
            DownloadManager.Request(Uri.parse(url)).apply {
                setMimeType(mimeType)
                addRequestHeader("User-Agent", userAgent)
                CookieManager.getInstance().getCookie(url)?.let { addRequestHeader("Cookie", it) }
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename)
                setTitle(filename)
                setDescription(getString(R.string.app_name))
            }
        getSystemService(DownloadManager::class.java).enqueue(request)
        Toast.makeText(this, R.string.download_started, Toast.LENGTH_SHORT).show()
    }

    private fun ensureNotificationPermission() {
        if (Build.VERSION.SDK_INT < 33) return
        val granted =
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) ==
                PackageManager.PERMISSION_GRANTED
        if (!granted) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    private fun loadApp(
        url: String = startUrl,
        force: Boolean = false,
    ) {
        if (!isOnline()) {
            showOffline()
            return
        }
        offline.visibility = View.GONE
        val safeUrl = sanitizeLoadUrl(url)
        if (force || webView.url.isNullOrBlank()) {
            loading.visibility = View.VISIBLE
            webView.loadUrl(safeUrl)
        } else {
            webView.reload()
        }
    }

    private fun showOffline() {
        loading.visibility = View.GONE
        refresh.isRefreshing = false
        offline.visibility = View.VISIBLE
    }

    private fun isOnline(): Boolean {
        val cm = getSystemService(ConnectivityManager::class.java) ?: return false
        val network = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(network) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }
}
