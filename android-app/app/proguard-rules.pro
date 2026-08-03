# Keep WebView bridge if added later.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
