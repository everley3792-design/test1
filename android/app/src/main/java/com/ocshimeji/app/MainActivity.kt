package com.ocshimeji.app

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.webkit.WebViewAssetLoader

/**
 * 主 App：以 WebView 載入同一份遊戲（assets/web/index.html）。
 * 使用 WebViewAssetLoader 提供固定的 https 來源，讓 localStorage／IndexedDB 存檔穩定，
 * 並且不開放 file:// 存取。
 */
class MainActivity : AppCompatActivity() {
    lateinit var web: WebView
    private lateinit var bridge: OCBridge

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        web = WebView(this)
        setContentView(web)

        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            mediaPlaybackRequiresUserGesture = true
            cacheMode = WebSettings.LOAD_DEFAULT
            textZoom = 100
        }
        web.setBackgroundColor(0xFFF6F0E4.toInt())
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                loader.shouldInterceptRequest(request.url)
            // 只允許 App 內頁面，外部連結一律不在 WebView 內開啟
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
                request.url.host != "appassets.androidplatform.net"
        }
        bridge = OCBridge(this)
        web.addJavascriptInterface(bridge, "OCNative")
        if (savedInstanceState != null) web.restoreState(savedInstanceState)
        else web.loadUrl("https://appassets.androidplatform.net/assets/web/index.html")

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                web.evaluateJavascript("(window.OCBack&&window.OCBack())?'1':'0'") { r ->
                    if (r?.contains("1") != true) moveTaskToBack(true)
                }
            }
        })
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    override fun onResume() {
        super.onResume()
        web.onResume()
        web.resumeTimers()
        // 從桌面回來：通知遊戲讀取桌寵互動紀錄、更新權限狀態
        web.evaluateJavascript("window.OCNativeEvent&&OCNativeEvent(JSON.stringify({type:'resume'}))", null)
        bridge.onResume()
    }

    override fun onPause() {
        // 進入背景：WebView 停止繪製與計時器，避免和系統桌寵重複耗電
        web.evaluateJavascript("window.OC&&OC.Store&&OC.Store.flush()", null)
        web.onPause()
        web.pauseTimers()
        super.onPause()
    }

    override fun onDestroy() {
        web.destroy()
        super.onDestroy()
    }

    fun sendEvent(json: String) {
        runOnUiThread {
            web.evaluateJavascript("window.OCNativeEvent&&OCNativeEvent(${org.json.JSONObject.quote(json)})", null)
        }
    }
}
