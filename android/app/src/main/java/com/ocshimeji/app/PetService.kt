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
import android.view.Choreographer
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import org.json.JSONObject
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

/**
 * 系統級懸浮桌寵（TYPE_APPLICATION_OVERLAY + 前景服務）。
 * 每隻夥伴一個「剛好包住角色」的小視窗，其餘區域的觸控會直接交給底下的 App；
 * 對話泡泡使用不可觸控的獨立視窗。螢幕關閉時停止繪製以省電。
 */
class PetService : Service(), Choreographer.FrameCallback {
    companion object {
        @Volatile var running = false
        private const val CH = "pets"
        private const val NID = 41
        const val ACT_TOGGLE = "toggle"
        const val ACT_STOP = "stop"
        const val ACT_RELOAD = "reload"
        const val ACT_STATE = "state"

        fun start(ctx: Context) {
            val i = Intent(ctx, PetService::class.java).setAction(ACT_RELOAD)
            if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(i) else ctx.startService(i)
        }
        fun stop(ctx: Context) { ctx.stopService(Intent(ctx, PetService::class.java)) }
        fun reload(ctx: Context, stateOnly: Boolean) {
            if (!running) return
            ctx.startService(Intent(ctx, PetService::class.java).setAction(if (stateOnly) ACT_STATE else ACT_RELOAD))
        }
    }

    private lateinit var wm: WindowManager
    private val pets = mutableListOf<PetActor>()
    private val main = Handler(Looper.getMainLooper())
    private var hidden = false
    private var screenOn = true
    private var lastFrame = 0L
    private var frameGap = 33_000_000L
    var screenW = 1080; var screenH = 2400
    private var socialCd = 0f

    private val screenRx = object : BroadcastReceiver() {
        override fun onReceive(c: Context, i: Intent) {
            screenOn = i.action != Intent.ACTION_SCREEN_OFF
            if (screenOn) { lastFrame = 0; Choreographer.getInstance().postFrameCallback(this@PetService) }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        running = true
        wm = getSystemService(WINDOW_SERVICE) as WindowManager
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CH, getString(R.string.pet_channel), NotificationManager.IMPORTANCE_MIN))
        val type = if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0
        ServiceCompat.startForeground(this, NID, notification(), type)
        val f = IntentFilter().apply { addAction(Intent.ACTION_SCREEN_OFF); addAction(Intent.ACTION_SCREEN_ON) }
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(screenRx, f, RECEIVER_NOT_EXPORTED) else @Suppress("UnspecifiedRegisterReceiverFlag") registerReceiver(screenRx, f)
        measureScreen()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (!Settings.canDrawOverlays(this)) { stopSelf(); return START_NOT_STICKY }
        when (intent?.action) {
            ACT_STOP -> { stopSelf(); return START_NOT_STICKY }
            ACT_TOGGLE -> { hidden = !hidden; pets.forEach { it.setVisible(!hidden) }; updateNotification() }
            ACT_STATE -> applyState()
            else -> loadPets()
        }
        return START_STICKY
    }

    private fun notification(): Notification {
        val pi = { a: String, rc: Int -> PendingIntent.getService(this, rc, Intent(this, PetService::class.java).setAction(a), PendingIntent.FLAG_IMMUTABLE) }
        val open = PendingIntent.getActivity(this, 3, Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), PendingIntent.FLAG_IMMUTABLE)
        return NotificationCompat.Builder(this, CH)
            .setSmallIcon(R.drawable.ic_launcher_fg)
            .setContentTitle(getString(R.string.pet_running))
            .setContentIntent(open)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .addAction(0, getString(if (hidden) R.string.pet_show else R.string.pet_hide), pi(ACT_TOGGLE, 1))
            .addAction(0, getString(R.string.pet_stop), pi(ACT_STOP, 2))
            .addAction(0, getString(R.string.pet_open), open)
            .build()
    }
    private fun updateNotification() { getSystemService(NotificationManager::class.java).notify(NID, notification()) }

    private fun measureScreen() {
        if (Build.VERSION.SDK_INT >= 30) {
            val b = wm.currentWindowMetrics.bounds
            val ins = wm.currentWindowMetrics.windowInsets.getInsetsIgnoringVisibility(android.view.WindowInsets.Type.systemBars())
            screenW = b.width(); screenH = b.height() - ins.bottom
        } else {
            val dm = resources.displayMetrics; screenW = dm.widthPixels; screenH = dm.heightPixels
        }
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        // 旋轉螢幕：重新量測，讓夥伴回到新的地面上
        measureScreen()
        pets.forEach { it.onScreenChanged() }
    }

    private fun loadPets() {
        val o = PetStore.load(this) ?: run { stopSelf(); return }
        pets.forEach { it.remove() }; pets.clear()
        val cfg = o.optJSONObject("cfg") ?: JSONObject()
        frameGap = 1_000_000_000L / cfg.optInt("fps", 30).coerceIn(10, 60)
        val arr = o.optJSONArray("pets") ?: return
        for (i in 0 until arr.length()) {
            val p = arr.optJSONObject(i) ?: continue
            try { pets.add(PetActor(this, wm, p, i, arr.length())) } catch (e: Exception) { e.printStackTrace() }
        }
        if (pets.isEmpty()) { stopSelf(); return }
        pets.forEach { it.setVisible(!hidden) }
        lastFrame = 0
        Choreographer.getInstance().removeFrameCallback(this)
        Choreographer.getInstance().postFrameCallback(this)
    }

    private fun applyState() {
        val o = PetStore.load(this) ?: return
        val arr = o.optJSONArray("pets") ?: return
        for (i in 0 until arr.length()) { val p = arr.getJSONObject(i); pets.find { it.id == p.optString("id") }?.updateState(p) }
    }

    override fun doFrame(now: Long) {
        if (!running || !screenOn) return
        if (!Settings.canDrawOverlays(this)) { stopSelf(); return }   // 權限被撤銷
        Choreographer.getInstance().postFrameCallback(this)
        if (hidden) return
        val gap = if (pets.all { it.isResting() }) frameGap * 2 else frameGap
        if (lastFrame != 0L && now - lastFrame < gap) return
        val dt = if (lastFrame == 0L) 0.016f else min(0.1f, (now - lastFrame) / 1e9f)
        lastFrame = now
        for (p in pets) p.tick(dt)
        socialTick(dt)
    }

    /** 多隻夥伴靠近時會互相打招呼 */
    private fun socialTick(dt: Float) {
        socialCd -= dt
        if (socialCd > 0 || pets.size < 2) return
        for (i in pets.indices) for (j in i + 1 until pets.size) {
            val a = pets[i]; val b = pets[j]
            if (abs(a.x - b.x) < a.sizePx * 1.1f && abs(a.y - b.y) < a.sizePx * .5f && a.canChat() && b.canChat()) {
                a.faceTo(b.x); b.faceTo(a.x)
                a.say(listOf("嗨！", "一起玩嘛～", "你也在這裡呀！").random()); main.postDelayed({ b.say(listOf("嘿嘿～", "嗯！", "好呀！").random()) }, 1200)
                a.hearts(); b.hearts(); socialCd = 25f; return
            }
        }
        socialCd = 2f
    }

    fun openApp() {
        startActivity(Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT))
    }

    /** 不可觸控的對話泡泡視窗 */
    fun bubbleWindow(): TextView {
        val tv = TextView(this).apply {
            setTextColor(Color.parseColor("#4E3F3A")); setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            val pad = dp(10); setPadding(pad, dp(6), pad, dp(7)); maxWidth = dp(200)
            background = GradientDrawable().apply { setColor(Color.parseColor("#FFFCF4")); cornerRadius = dp(14).toFloat(); setStroke(dp(1), Color.parseColor("#22000000")) }
            elevation = dp(3).toFloat(); visibility = View.GONE
        }
        val lp = WindowManager.LayoutParams(WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT).apply { gravity = Gravity.TOP or Gravity.START }
        wm.addView(tv, lp)
        return tv
    }

    fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    override fun onDestroy() {
        running = false
        Choreographer.getInstance().removeFrameCallback(this)
        pets.forEach { it.remove() }; pets.clear()
        try { unregisterReceiver(screenRx) } catch (_: Exception) {}
        super.onDestroy()
    }
}
