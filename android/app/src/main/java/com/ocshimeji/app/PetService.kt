package com.ocshimeji.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import org.json.JSONObject
import java.util.Calendar
import kotlin.math.abs
import kotlin.math.min

/**
 * 系統級懸浮桌寵（TYPE_APPLICATION_OVERLAY + 前景服務）。
 * v4.1：改用 Handler 迴圈（更穩定，不依賴 Choreographer）、行為例外不會讓服務停止、
 * App 感知、長按小選單、電量／充電／夜晚／長時間使用提醒、通知列「呼喚」。
 */
class PetService : Service() {
    companion object {
        @Volatile var running = false
        private const val CH = "pets"
        private const val NID = 41
        const val ACT_TOGGLE = "toggle"; const val ACT_STOP = "stop"; const val ACT_RELOAD = "reload"; const val ACT_STATE = "state"; const val ACT_SUMMON = "summon"
        fun start(ctx: Context) { val i = Intent(ctx, PetService::class.java).setAction(ACT_RELOAD); if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(i) else ctx.startService(i) }
        fun stop(ctx: Context) { ctx.stopService(Intent(ctx, PetService::class.java)) }
        fun reload(ctx: Context, stateOnly: Boolean) { if (!running) return; ctx.startService(Intent(ctx, PetService::class.java).setAction(if (stateOnly) ACT_STATE else ACT_RELOAD)) }
    }

    private lateinit var wm: WindowManager
    private val pets = mutableListOf<PetActor>()
    val handler = Handler(Looper.getMainLooper())
    private var hidden = false
    private var screenOn = true
    private var lastNs = 0L
    private var frameMs = 33L
    var screenW = 1080; var screenH = 2400
    private var socialCd = 0f
    private var cfg = JSONObject()
    var charging = false
    private var senseT = 0f; private var lastApp: String? = null; private var appSince = 0L; private var remindAt = 0L; private var lowWarned = false; private var nightWarned = -1
    private var menuView: View? = null

    private val screenRx = object : BroadcastReceiver() {
        override fun onReceive(c: Context, i: Intent) { screenOn = i.action != Intent.ACTION_SCREEN_OFF; if (screenOn) { lastNs = 0; schedule() } }
    }
    private val loop = object : Runnable { override fun run() { frame(); if (running && screenOn) schedule() } }
    private fun schedule() { handler.removeCallbacks(loop); handler.postDelayed(loop, if (pets.isNotEmpty() && pets.all { it.isResting() }) frameMs * 2 else frameMs) }

    fun cfgBool(k: String, def: Boolean) = cfg.optBoolean(k, def)
    fun cfgStr(k: String, def: String): String = cfg.optString(k, def)

    override fun onBind(intent: Intent?): IBinder? = null
    override fun onCreate() {
        super.onCreate(); running = true
        wm = getSystemService(WINDOW_SERVICE) as WindowManager
        getSystemService(NotificationManager::class.java).createNotificationChannel(NotificationChannel(CH, getString(R.string.pet_channel), NotificationManager.IMPORTANCE_MIN))
        ServiceCompat.startForeground(this, NID, notification(), if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0)
        val f = IntentFilter().apply { addAction(Intent.ACTION_SCREEN_OFF); addAction(Intent.ACTION_SCREEN_ON) }
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(screenRx, f, RECEIVER_NOT_EXPORTED) else @Suppress("UnspecifiedRegisterReceiverFlag") registerReceiver(screenRx, f)
        measureScreen()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (!Settings.canDrawOverlays(this)) { stopSelf(); return START_NOT_STICKY }
        when (intent?.action) {
            ACT_STOP -> { stopSelf(); return START_NOT_STICKY }
            ACT_TOGGLE -> { hidden = !hidden; pets.forEach { it.setVisible(!hidden) }; updateNotification() }
            ACT_SUMMON -> { hidden = false; pets.forEach { it.summon() }; updateNotification() }
            ACT_STATE -> applyState()
            else -> loadPets()
        }
        return START_STICKY
    }

    private fun notification(): Notification {
        val pi = { a: String, rc: Int -> PendingIntent.getService(this, rc, Intent(this, PetService::class.java).setAction(a), PendingIntent.FLAG_IMMUTABLE) }
        val open = PendingIntent.getActivity(this, 3, Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), PendingIntent.FLAG_IMMUTABLE)
        return NotificationCompat.Builder(this, CH).setSmallIcon(R.drawable.ic_launcher_fg).setContentTitle(getString(R.string.pet_running)).setContentText("點兩下夥伴可以回到小島").setContentIntent(open).setOngoing(true).setPriority(NotificationCompat.PRIORITY_MIN)
            .addAction(0, "呼喚", pi(ACT_SUMMON, 4))
            .addAction(0, getString(if (hidden) R.string.pet_show else R.string.pet_hide), pi(ACT_TOGGLE, 1))
            .addAction(0, getString(R.string.pet_stop), pi(ACT_STOP, 2)).build()
    }
    private fun updateNotification() { getSystemService(NotificationManager::class.java).notify(NID, notification()) }

    private fun measureScreen() {
        if (Build.VERSION.SDK_INT >= 30) { val m = wm.currentWindowMetrics; val ins = m.windowInsets.getInsetsIgnoringVisibility(android.view.WindowInsets.Type.systemBars()); screenW = m.bounds.width(); screenH = m.bounds.height() - ins.bottom }
        else { val dm = resources.displayMetrics; screenW = dm.widthPixels; screenH = dm.heightPixels }
    }
    override fun onConfigurationChanged(newConfig: Configuration) { super.onConfigurationChanged(newConfig); measureScreen(); pets.forEach { it.onScreenChanged() } }

    private fun loadPets() {
        val o = PetStore.load(this) ?: run { stopSelf(); return }
        pets.forEach { it.remove() }; pets.clear(); closeMenu()
        cfg = o.optJSONObject("cfg") ?: JSONObject()
        frameMs = 1000L / cfg.optInt("fps", 30).coerceIn(10, 60)
        val arr = o.optJSONArray("pets") ?: return
        for (i in 0 until arr.length()) { val p = arr.optJSONObject(i) ?: continue; try { pets.add(PetActor(this, wm, p, i, arr.length())) } catch (e: Exception) { e.printStackTrace() } }
        if (pets.isEmpty()) { stopSelf(); return }
        pets.forEach { it.setVisible(!hidden) }
        lastNs = 0; schedule()
    }
    private fun applyState() { val o = PetStore.load(this) ?: return; val arr = o.optJSONArray("pets") ?: return; for (i in 0 until arr.length()) { val p = arr.getJSONObject(i); pets.find { it.id == p.optString("id") }?.updateState(p) } }

    private fun frame() {
        if (!Settings.canDrawOverlays(this)) { stopSelf(); return }
        if (hidden) return
        val now = System.nanoTime(); val dt = if (lastNs == 0L) .016f else min(.1f, (now - lastNs) / 1e9f); lastNs = now
        for (p in pets) { try { p.tick(dt) } catch (e: Exception) { e.printStackTrace() } }
        socialTick(dt)
        senseT -= dt; if (senseT <= 0) { senseT = 6f; try { sense() } catch (e: Exception) { e.printStackTrace() } }
    }

    /** App 感知與生活提醒 */
    private fun sense() {
        val (lv, chg) = AppSense.battery(this)
        if (chg && !charging) pets.randomOrNull()?.say("充電中～我也來睡一下。")
        charging = chg
        if (lv <= 15 && !chg && !lowWarned) { lowWarned = true; pets.randomOrNull()?.say("電量剩 $lv% 了，記得充電喔！") }; if (lv > 25) lowWarned = false
        val h = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        if ((h >= 23 || h < 2) && nightWarned != h) { nightWarned = h; pets.randomOrNull()?.say("已經好晚了…要不要早點睡？") }
        if (!cfgBool("appAware", false)) return
        val pkg = AppSense.foreground(this) ?: return
        val nowMs = System.currentTimeMillis()
        if (pkg != lastApp) { lastApp = pkg; appSince = nowMs; val kind = AppSense.kind(this, pkg); if (kind != AppSense.Kind.OTHER) pets.randomOrNull()?.react(kind) }
        else if (nowMs - appSince > 45 * 60_000L && nowMs - remindAt > 30 * 60_000L) { remindAt = nowMs; pets.randomOrNull()?.say("已經看很久了，讓眼睛休息一下吧～") }
    }

    private fun socialTick(dt: Float) {
        socialCd -= dt; if (socialCd > 0 || pets.size < 2) return
        for (i in pets.indices) for (j in i + 1 until pets.size) {
            val a = pets[i]; val b = pets[j]
            if (abs(a.x - b.x) < a.sizePx * 1.1f && abs(a.y - b.y) < a.sizePx * .5f && a.canChat() && b.canChat()) {
                a.faceTo(b.x); b.faceTo(a.x); a.say(listOf("嗨！", "一起玩嘛～", "你也在這裡呀！").random()); handler.postDelayed({ b.say(listOf("嘿嘿～", "嗯！", "好呀！").random()) }, 1200)
                a.hearts(); b.hearts(); socialCd = 25f; return
            }
        }
        socialCd = 2f
    }

    /** 長按夥伴：圓角小選單（獨立小視窗，點選後自動關閉） */
    fun showMenu(p: PetActor) {
        closeMenu()
        val bar = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; setPadding(dp(8), dp(8), dp(8), dp(8))
            background = GradientDrawable().apply { setColor(Color.parseColor("#FFFFFF")); cornerRadius = dp(26).toFloat() }; elevation = dp(6).toFloat() }
        val items = listOf("pat" to "摸摸", "sleep" to if (p.state == "sleep") "叫醒" else "睡覺", "dance" to "跳舞", "hide" to "休息10分", "open" to "回小島")
        for ((k, t) in items) bar.addView(TextView(this).apply { text = t; setTextColor(Color.parseColor("#4E3F3A")); setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f); gravity = Gravity.CENTER
            setPadding(dp(10), dp(9), dp(10), dp(9)); background = GradientDrawable().apply { setColor(Color.parseColor("#F3EEFF")); cornerRadius = dp(18).toFloat() }
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { marginStart = dp(3); marginEnd = dp(3) }
            setOnClickListener { closeMenu(); p.menu(k) } })
        val lp = WindowManager.LayoutParams(WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH, PixelFormat.TRANSLUCENT).apply {
            gravity = Gravity.TOP or Gravity.START; x = (p.x - dp(160)).toInt().coerceIn(0, maxOf(0, screenW - dp(330))); y = (p.y - p.sizePx * 1.6f).toInt().coerceAtLeast(dp(40)) }
        bar.setOnTouchListener { _, e -> if (e.action == android.view.MotionEvent.ACTION_OUTSIDE) closeMenu(); false }
        try { wm.addView(bar, lp); menuView = bar; handler.postDelayed({ closeMenu() }, 6000) } catch (_: Exception) {}
    }
    private fun closeMenu() { menuView?.let { try { wm.removeView(it) } catch (_: Exception) {} }; menuView = null }

    fun openApp() { startActivity(Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)) }

    fun bubbleWindow(): TextView {
        val tv = TextView(this).apply {
            setTextColor(Color.parseColor("#4E3F3A")); setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            setPadding(dp(12), dp(7), dp(12), dp(8)); maxWidth = dp(210)
            background = GradientDrawable().apply { setColor(Color.parseColor("#FFFFFF")); cornerRadius = dp(16).toFloat(); setStroke(dp(1), Color.parseColor("#1A000000")) }
            elevation = dp(3).toFloat(); visibility = View.GONE }
        val lp = WindowManager.LayoutParams(WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS, PixelFormat.TRANSLUCENT).apply { gravity = Gravity.TOP or Gravity.START }
        wm.addView(tv, lp); return tv
    }
    fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    override fun onDestroy() { running = false; handler.removeCallbacksAndMessages(null); closeMenu(); pets.forEach { it.remove() }; pets.clear(); try { unregisterReceiver(screenRx) } catch (_: Exception) {}; super.onDestroy() }
}
