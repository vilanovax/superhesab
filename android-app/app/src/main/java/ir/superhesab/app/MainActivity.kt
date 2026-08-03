package ir.superhesab.app

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Bitmap
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.LinearLayout
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.google.android.material.button.MaterialButton

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var refresh: SwipeRefreshLayout
    private lateinit var loading: LinearLayout
    private lateinit var offline: LinearLayout

    private val startUrl: String
        get() = BuildConfig.WEB_URL

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, true)
        setContentView(R.layout.activity_main)

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
        loadApp(url = deepLink ?: startUrl)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        intent.data?.toString()?.let { loadApp(url = it, force = true) }
    }

    private fun configureWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            mediaPlaybackRequiresUserGesture = true
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            userAgentString = "$userAgentString SuperHesabAndroid/${BuildConfig.VERSION_NAME}"
        }
        webView.webChromeClient = WebChromeClient()
        webView.webViewClient =
            object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView,
                    request: WebResourceRequest,
                ): Boolean {
                    val uri = request.url
                    val host = uri.host.orEmpty()
                    return if (host == "app.superhesab.ir" || host.endsWith(".superhesab.ir")) {
                        false
                    } else {
                        startActivity(Intent(Intent.ACTION_VIEW, uri))
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

    private fun loadApp(
        url: String = startUrl,
        force: Boolean = false,
    ) {
        if (!isOnline()) {
            showOffline()
            return
        }
        offline.visibility = View.GONE
        if (force || webView.url.isNullOrBlank()) {
            loading.visibility = View.VISIBLE
            webView.loadUrl(url)
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
