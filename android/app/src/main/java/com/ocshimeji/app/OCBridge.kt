package com.ocshimeji.app

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.widget.Toast
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.File

/**
 * JS ↔ Android 橋接。只開放桌寵、震動、檔案分享與權限頁面這些必要能力；
 * 所有輸入都當作不受信任的資料解析（JSON、大小限制），不會執行任何來自網頁的指令。
 */
class OCBridge(private val act: MainActivity) {
    private val ctx: Context get() = act.applicationContext
    private var askedOverlay = false

    @JavascriptInterface
    fun setPets(json: String) {
        if (json.length > 40_000_000) return
        val ok = try { PetStore.save(ctx, JSONObject(json)) } catch (e: Exception) { false }
        if (!ok) return
        act.runOnUiThread { startPetsIfAllowed() }
    }

    @JavascriptInterface
    fun updatePetState(json: String) {
        if (json.length > 200_000) return
        try { PetStore.updateState(ctx, json) } catch (_: Exception) { return }
        if (PetService.running) PetService.reload(ctx, stateOnly = true)
    }

    @JavascriptInterface
    fun stopPets() { act.runOnUiThread { PetService.stop(ctx) } }

    @JavascriptInterface
    fun pullPetEvents(): String = PetStore.drainEvents(ctx)

    @JavascriptInterface
    fun canDrawOverlays(): String = Settings.canDrawOverlays(ctx).toString()

    @JavascriptInterface
    fun openPetSettings() { act.runOnUiThread { requestOverlay(force = true) } }

    @JavascriptInterface
    fun hasUsageAccess(): String = AppSense.hasAccess(ctx).toString()

    @JavascriptInterface
    fun openUsageAccess() { act.runOnUiThread { try { act.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)) } catch (_: Exception) {} } }

    /** 拍照模式：把照片存到快取並開啟分享（可存到相簿） */
    @JavascriptInterface
    fun saveImage(name: String, dataUrl: String) {
        if (!dataUrl.startsWith("data:image/") || dataUrl.length > 30_000_000) return
        val bytes = try { android.util.Base64.decode(dataUrl.substringAfter(","), android.util.Base64.DEFAULT) } catch (_: Exception) { return }
        val safe = name.replace(Regex("[^\\w.\\-]"), "_").take(60).ifBlank { "oc-shimeji.jpg" }
        val dir = File(ctx.cacheDir, "exports").apply { mkdirs() }; val f = File(dir, safe); f.writeBytes(bytes)
        val uri: Uri = FileProvider.getUriForFile(ctx, "${ctx.packageName}.files", f)
        act.runOnUiThread { act.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply { type = "image/jpeg"; putExtra(Intent.EXTRA_STREAM, uri); addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION) }, safe)) }
    }

    @JavascriptInterface
    fun vibrate(ms: String) {
        val t = ms.toLongOrNull()?.coerceIn(1, 120) ?: return
        val v = ContextCompat.getSystemService(ctx, Vibrator::class.java) ?: return
        try { v.vibrate(VibrationEffect.createOneShot(t, VibrationEffect.DEFAULT_AMPLITUDE)) } catch (_: Exception) {}
    }

    /** 匯出備份：寫到 App 快取再透過系統分享選單交給使用者選擇存放位置 */
    @JavascriptInterface
    fun saveFile(name: String, text: String) {
        if (text.length > 60_000_000) return
        val safe = name.replace(Regex("[^\\w\\u4e00-\\u9fff.\\-]"), "_").take(80).ifBlank { "oc-shimeji.json" }
        val dir = File(ctx.cacheDir, "exports").apply { mkdirs() }
        val f = File(dir, safe)
        f.writeText(text)
        val uri: Uri = FileProvider.getUriForFile(ctx, "${ctx.packageName}.files", f)
        act.runOnUiThread {
            val i = Intent(Intent.ACTION_SEND).apply {
                type = "application/json"; putExtra(Intent.EXTRA_STREAM, uri); addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            act.startActivity(Intent.createChooser(i, safe))
        }
    }

    fun onResume() {
        if (askedOverlay) {
            askedOverlay = false
            val ok = Settings.canDrawOverlays(ctx)
            act.sendEvent(JSONObject().put("type", "overlay").put("ok", ok).toString())
            if (ok) startPetsIfAllowed()
        }
        act.sendEvent(JSONObject().put("type", "usage").put("ok", AppSense.hasAccess(ctx)).toString())
        val ev = PetStore.drainEvents(ctx)
        if (ev != "[]") act.sendEvent("{\"type\":\"petEvents\",\"list\":$ev}")
    }

    private fun startPetsIfAllowed() {
        if (!PetStore.hasPets(ctx)) { PetService.stop(ctx); return }
        if (!Settings.canDrawOverlays(ctx)) { requestOverlay(false); return }
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(act, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 7)
        }
        PetService.start(ctx)
    }

    private fun requestOverlay(force: Boolean) {
        if (Settings.canDrawOverlays(ctx) && !force) return
        askedOverlay = true
        Toast.makeText(ctx, R.string.overlay_needed, Toast.LENGTH_LONG).show()
        try {
            act.startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${ctx.packageName}")))
        } catch (_: ActivityNotFoundException) {
            act.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${ctx.packageName}")))
        }
    }
}
