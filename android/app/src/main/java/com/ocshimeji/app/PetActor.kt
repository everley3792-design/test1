package com.ocshimeji.app

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PixelFormat
import android.graphics.RectF
import android.os.SystemClock
import android.view.Gravity
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import org.json.JSONObject
import java.util.Calendar
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sign
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.random.Random

/**
 * 一隻桌面夥伴（v4.1）
 * 行為：待機、走、跑、坐、睡、跳、攀爬螢幕邊緣、懸掛、掉落、被抱起甩出、頭暈、看影片、跳舞、加油。
 * 操作：點一下打招呼、點兩下開小島、上下滑動摸摸、拖曳抱起甩出、長按開小選單。
 */
@SuppressLint("ViewConstructor")
class PetActor(private val svc: PetService, private val wm: WindowManager, data: JSONObject, index: Int, count: Int) {
    val id: String = data.optString("id")
    val name: String = data.optString("name")
    private val rs = data.optDouble("rs", 1.6).toFloat()
    private var lines = data.optJSONObject("lines") ?: JSONObject()
    private var mood = data.optString("mood", "content")
    private var sick = !data.isNull("sick") && data.optString("sick").isNotEmpty()
    private val quirks = data.optJSONObject("quirks") ?: JSONObject()
    private val layers = HashMap<String, Layer>()
    private var piv = floatArrayOf(120f, 176f, 150f, 215f, 104f, 222f, 134f, 222f)
    private var tailRight = true

    val sizePx: Float = svc.dp(118) * data.optDouble("scale", 1.0).toFloat().coerceIn(.5f, 2f)
    private val k get() = sizePx / 246f
    private val boxW = (sizePx * 1.1f).toInt()
    private val boxH = (sizePx * 1.3f).toInt()

    var x = 0f; var y = 0f
    private var vx = 0f; private var vy = 0f
    private var facing = if (Random.nextBoolean()) 1f else -1f
    var state = "fall"; private set
    private var stateT = 0f
    private var nextT = 2f
    private var wall = 0
    private var held = false
    private var fallFrom = 0f
    private var shake = 0
    private var dizzyT = 0f
    private var hiddenUntil = 0L

    private var t = 0f; private var br = Random.nextFloat() * 6f; private var step = 0f
    private var blinkT = 2f; private var blink = 0f
    private val flip = Spring(facing); private val sq = Spring(1f); private val headY = Spring(0f); private val headR = Spring(0f); private val tail = Spring(0f)
    private var turnT = -1f; private var turnFrom = facing
    private var tailPh = 0f
    private var face = ""; private var faceT = 0f
    private val fx = ArrayList<FloatArray>()      // x, y, life, kind(0 心 1 音符 2 星)
    private var petStrokes = 0; private var petDir = 0; private var strokeDir = 0; private var petAcc = 0f

    private val view = PetView()
    private val lp = WindowManager.LayoutParams(boxW, boxH, WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
        PixelFormat.TRANSLUCENT).apply { gravity = Gravity.TOP or Gravity.START }
    // 觸控視窗：只蓋住角色身體（透明區域不攔截觸控，直接交給底下的 App）；繪圖視窗本身設為 NOT_TOUCHABLE
    private val hitW = (sizePx * .66f).toInt(); private val hitH = (sizePx * .8f).toInt()
    @SuppressLint("ClickableViewAccessibility")
    private val hit = object : View(svc) { override fun onTouchEvent(e: MotionEvent): Boolean = view.onTouchEvent(e) }
    private val hlp = WindowManager.LayoutParams(hitW, hitH, WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
        PixelFormat.TRANSLUCENT).apply { gravity = Gravity.TOP or Gravity.START }
    private val bubble: TextView = svc.bubbleWindow()
    private var bubbleT = 0f

    private class Layer(val bmp: Bitmap, val ox: Float, val oy: Float)
    private class Spring(var x: Float) { var v = 0f
        fun to(target: Float, dt: Float, kk: Float = 180f, z: Float = .7f): Float { val c = 2f * z * sqrt(kk); v += (kk * (target - x) - c * v) * dt; x += v * dt; return x } }

    init {
        val meta = data.optJSONObject("layerMeta") ?: JSONObject()
        for (n in meta.keys()) { val m = meta.getJSONObject(n); PetStore.bitmap(svc, id, n)?.let { layers[n] = Layer(it, m.optDouble("ox").toFloat(), m.optDouble("oy").toFloat()) } }
        data.optJSONObject("piv")?.let { p ->
            fun a(n: String) = p.optJSONArray(n)
            a("head")?.let { piv[0] = it.optDouble(0).toFloat(); piv[1] = it.optDouble(1).toFloat() }
            a("tail")?.let { piv[2] = it.optDouble(0).toFloat(); piv[3] = it.optDouble(1).toFloat() }
            a("footL")?.let { piv[4] = it.optDouble(0).toFloat(); piv[5] = it.optDouble(1).toFloat() }
            a("footR")?.let { piv[6] = it.optDouble(0).toFloat(); piv[7] = it.optDouble(1).toFloat() }
            tailRight = p.optBoolean("tailRight", true)
        }
        x = svc.screenW * (index + 1f) / (count + 1f); y = svc.screenH * .3f; fallFrom = y
        // 還原上次放下的位置（以螢幕比例儲存，旋轉或換解析度後仍落在合理位置）
        svc.getSharedPreferences(POS, 0).let { sp -> val rx = sp.getFloat("$id.x", -1f); val ry = sp.getFloat("$id.y", -1f)
            if (rx in 0f..1f && ry in 0f..1f) { x = (rx * svc.screenW).coerceIn(boxW * .5f, svc.screenW - boxW * .5f); y = ry * svc.screenH; fallFrom = y } }
        wm.addView(view, lp); wm.addView(hit, hlp); place()
    }

    // ===================== 行為 =====================
    fun tick(dt: Float) {
        if (hiddenUntil > System.currentTimeMillis()) return
        if (view.visibility != View.VISIBLE && hiddenUntil != 0L) { hiddenUntil = 0L; setVisible(true); say("我回來了～") }
        t += dt; stateT += dt
        br += dt * (if (state == "sleep") 1.05f else if (sick) 2.2f else 1.7f)
        blinkT -= dt; if (blinkT <= 0) { blink = .13f; blinkT = if (Random.nextFloat() < .2f) .28f else 2.2f + Random.nextFloat() * 3.3f }; if (blink > 0) blink -= dt
        if (faceT > 0) { faceT -= dt; if (faceT <= 0) face = "" }
        val ground = svc.screenH.toFloat()
        val roam = svc.cfgBool("roam", true); val climb = svc.cfgBool("climb", true)
        if (!held) when (state) {
            "fall", "jump" -> { vy += 2600f * dt; y += vy * dt; x += vx * dt; vx *= .995f
                if (x < boxW * .4f || x > svc.screenW - boxW * .4f) { vx = -vx * .4f; x = x.coerceIn(boxW * .4f, svc.screenW - boxW * .4f) }
                if (y >= ground && vy > 0) { y = ground; val drop = ground - fallFrom
                    if (drop > svc.screenH * .35f || shake >= 5) dizzy() else { if (vy > 1300f) { say(pick("drop", "哇啊！")); sq.x = .72f } else sq.x = .86f; setState("idle") }
                    vy = 0f; vx = 0f; shake = 0 } }
            "walk", "run" -> { val sp = (if (state == "run") 2.4f else 1f) * svc.dp(46) * walkSpeed(); vx = facing * sp; x += vx * dt
                if (x < boxW * .5f || x > svc.screenW - boxW * .5f) {
                    if (climb && Random.nextFloat() < .45f) { wall = if (x < svc.screenW / 2) -1 else 1; x = if (wall < 0) boxW * .35f else svc.screenW - boxW * .35f; setState("climb") }
                    else { turn(-facing); x = x.coerceIn(boxW * .5f, svc.screenW - boxW * .5f) }
                }
                step += dt * PI.toFloat() * 2f * (if (state == "run") 3.1f else 2.2f)
                if (stateT > nextT) decide() }
            "climb" -> { y -= svc.dp(34) * dt; step += dt * PI.toFloat() * 3.2f
                if (y < svc.screenH * (if (roam) .2f else .7f) || stateT > nextT) { if (Random.nextFloat() < .5f) setState("hang") else drop(-wall * svc.dp(60).toFloat()) } }
            "hang" -> if (stateT > 2.5f + Random.nextFloat() * 3f) drop(-wall * svc.dp(40).toFloat())
            "dizzy" -> if (stateT > dizzyT) { setState("idle"); say("呼…終於不暈了。") }
            else -> if (stateT > nextT) decide()
        }
        if (state != "climb" && state != "hang") wall = 0
        y = min(y, ground)
        animate(dt)
        fx.removeAll { it[2] -= dt; it[1] -= dt * svc.dp(36); it[2] <= 0 }
        if (state == "music" && Random.nextFloat() < dt * 1.5f) fx.add(floatArrayOf(boxW / 2f + (Random.nextFloat() - .5f) * sizePx * .6f, boxH * .3f, 1.4f, 1f))
        if (bubbleT > 0) { bubbleT -= dt; if (bubbleT <= 0) bubble.visibility = View.GONE else placeBubble() }
        place(); view.invalidate()
    }

    private fun drop(vxx: Float) { fallFrom = y; vx = vxx; vy = 0f; setState("fall"); wall = 0 }
    private fun dizzy() { setState("dizzy"); dizzyT = 3.5f; sq.x = .7f; say(listOf("頭好暈～", "眼睛在轉圈圈…", "世界在轉…").random()); try { view.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS) } catch (_: Exception) {} }
    private fun turn(to: Float) { if (to == facing) return; turnFrom = facing; facing = to; turnT = 0f }
    private fun walkSpeed(): Float = when (quirks.optString("walk")) { "shuffle" -> .78f; "tiptoe", "bouncy" -> 1.06f; else -> 1f } * (if (sick) .65f else 1f)

    /** 加權隨機選行為（不會因浮點誤差拋出例外） */
    private fun decide() {
        val h = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        val night = h >= 23 || h < 6
        val opts = listOf("idle" to 3f, "walk" to (if (svc.cfgBool("roam", true)) 3f else 1.5f), "sit" to 1.4f, "run" to (if (sick) .1f else .6f), "jump" to (if (sick) 0f else .5f),
            "sleep" to (if (night || mood == "sleepy" || sick || svc.charging) 3f else .4f))
        var r = Random.nextFloat() * opts.sumOf { it.second.toDouble() }.toFloat()
        var pickS = "idle"
        for ((n, w) in opts) { r -= w; if (r <= 0f) { pickS = n; break } }
        when (pickS) {
            "walk", "run" -> { if (Random.nextFloat() < .4f) turn(-facing); setState(pickS) }
            "jump" -> { fallFrom = y; vy = -svc.dp(520).toFloat(); vx = facing * svc.dp(70); sq.x = .85f; setState("jump") }
            else -> setState(pickS)
        }
        val talk = when (svc.cfgStr("talk", "normal")) { "quiet" -> .04f; "chatty" -> .25f; else -> .12f }
        if (Random.nextFloat() < talk && state != "sleep") say(pick("idle", "…"))
    }

    private fun setState(s: String) {
        state = s; stateT = 0f
        nextT = when (s) { "sleep" -> 25f + Random.nextFloat() * 40f; "sit", "watch" -> 8f + Random.nextFloat() * 10f; "music" -> 6f + Random.nextFloat() * 6f; "walk" -> 3f + Random.nextFloat() * 5f; "run" -> 1.5f + Random.nextFloat() * 2f; "climb" -> 3f + Random.nextFloat() * 4f; else -> 2f + Random.nextFloat() * 4f }
    }

    /** 依玩家正在使用的 App 反應 */
    fun react(kind: AppSense.Kind) {
        if (held || state == "fall" || state == "climb" || state == "hang") return
        val l = AppSense.LINES[kind]; if (l != null) say(l.random())
        when (kind) {
            AppSense.Kind.VIDEO, AppSense.Kind.READ -> setState("watch")
            AppSense.Kind.MUSIC -> setState("music")
            AppSense.Kind.GAME -> { fallFrom = y; vy = -svc.dp(450).toFloat(); vx = 0f; setState("jump"); face = "head_joy"; faceT = 1.5f }
            AppSense.Kind.CAMERA -> { face = "head_joy"; faceT = 2f; sq.x = .9f }
            AppSense.Kind.HOME -> if (Random.nextFloat() < .5f) setState("walk")
            else -> {}
        }
    }

    fun isResting() = (state == "sleep" || state == "sit" || state == "watch") && !held && fx.isEmpty() && bubbleT <= 0
    fun canChat() = !held && state != "sleep" && state != "climb" && state != "fall" && state != "dizzy" && bubbleT <= 0
    fun faceTo(px: Float) { turn(if (px > x) 1f else -1f); if (state == "walk" || state == "run") setState("idle") }
    fun hearts() { repeat(2) { fx.add(floatArrayOf(boxW / 2f + (Random.nextFloat() - .5f) * sizePx * .4f, boxH * .25f, 1.2f, 0f)) } }
    fun updateState(p: JSONObject) { mood = p.optString("mood", mood); sick = !p.isNull("sick") && p.optString("sick").isNotEmpty(); p.optJSONObject("lines")?.let { lines = it } }
    fun onScreenChanged() { x = x.coerceIn(boxW * .5f, svc.screenW - boxW * .5f); if (y > svc.screenH) y = svc.screenH.toFloat(); if (!held) drop(0f) }
    fun setVisible(v: Boolean) { view.visibility = if (v) View.VISIBLE else View.GONE; hit.visibility = view.visibility; if (!v) bubble.visibility = View.GONE }
    fun hideFor(ms: Long) { hiddenUntil = System.currentTimeMillis() + ms; setVisible(false) }
    fun summon() { hiddenUntil = 0; setVisible(true); x = svc.screenW / 2f; y = svc.screenH * .3f; drop(0f); say("我在這裡！") }

    private fun pick(kind: String, def: String): String { val a = lines.optJSONArray(kind); return if (a != null && a.length() > 0) a.optString(Random.nextInt(a.length())) else def }

    fun say(text: String) { if (text.isBlank()) return; bubble.text = text; bubble.visibility = View.VISIBLE; bubbleT = 2.6f + text.length * .12f; placeBubble() }
    private fun placeBubble() {
        val blp = bubble.layoutParams as? WindowManager.LayoutParams ?: return
        val w = if (bubble.width > 0) bubble.width else svc.dp(120)
        blp.x = (x - w / 2f).toInt().coerceIn(0, max(0, svc.screenW - w)); blp.y = (y - sizePx * 1.25f - (if (bubble.height > 0) bubble.height else svc.dp(36))).toInt().coerceAtLeast(0)
        try { wm.updateViewLayout(bubble, blp) } catch (_: Exception) {}
    }

    private var lastX = Int.MIN_VALUE; private var lastY = Int.MIN_VALUE
    private fun place() {
        val nx = (x - boxW / 2f).toInt(); val ny = (y - boxH).toInt()
        if (nx == lastX && ny == lastY) return
        lastX = nx; lastY = ny; lp.x = nx; lp.y = ny
        try { wm.updateViewLayout(view, lp) } catch (_: Exception) {}
        // 攀爬時身體貼在牆邊、往內偏一點
        hlp.x = (x - hitW / 2f + wall * sizePx * .12f).toInt(); hlp.y = (y - hitH - sizePx * .06f).toInt()
        try { wm.updateViewLayout(hit, hlp) } catch (_: Exception) {}
    }

    /** 儲存位置（放下、移除時） */
    fun savePos() { if (svc.screenW <= 0 || svc.screenH <= 0) return; svc.getSharedPreferences(POS, 0).edit().putFloat("$id.x", x / svc.screenW).putFloat("$id.y", (y / svc.screenH).coerceIn(0f, 1f)).apply() }
    fun remove() { savePos(); try { wm.removeView(view) } catch (_: Exception) {}; try { wm.removeView(hit) } catch (_: Exception) {}; try { wm.removeView(bubble) } catch (_: Exception) {}; layers.values.forEach { it.bmp.recycle() } }

    // ===================== 動畫 =====================
    private fun animate(dt: Float) {
        // 轉身：0.2 秒緩動半轉＋小跳（無縫，不會紙片翻面）
        if (turnT >= 0) { turnT += dt; val u = min(1f, turnT / .2f); val e = if (u < .5f) 2 * u * u else 1 - (-2 * u + 2) * (-2 * u + 2) / 2; flip.x = turnFrom * cos(PI.toFloat() * e); if (u >= 1f) { flip.x = facing; turnT = -1f } } else flip.x = facing
        sq.to(1f, dt, 200f, .38f)
        val moving = state == "walk" || state == "run" || state == "climb"
        var hy = 0f; var hr = 0f; var amp = 10f; var spd = 1.6f; var base = 0f
        if (moving) { hy = abs(sin(step)) * 3f; spd = 2.6f; amp = 12f }
        when (state) {
            "sit", "watch" -> { hy += 8f; amp = 6f; spd = 1f; if (state == "watch") hr = -4f + sin(t * .7f) * 2f }
            "sleep" -> { hy += 14f; hr = 12f; amp = 3f; spd = .5f; base = 8f }
            "pet" -> { hr = petDir * 9f; amp = 22f; spd = 4.2f }
            "held" -> { hy = -4f; amp = 20f; spd = 3f; hr = sin(t * 5f) * 5f }
            "hang" -> { amp = 18f; spd = 2.5f }
            "dizzy" -> { hr = sin(t * 4.2f) * 12f; hy = 4f; amp = 8f; spd = 1.4f; base = -12f }
            "music" -> { hr = sin(t * 6f) * 8f; hy = abs(sin(t * 6f)) * 5f; amp = 24f; spd = 5f }
        }
        if (held) { amp = 20f; spd = 3f }
        if (sick) { base -= 10f; amp *= .5f }
        headY.to(hy, dt, 140f, .55f); headR.to(hr, dt, 110f, .6f)
        tailPh += dt * spd * 2f; tail.to(base + sin(tailPh) * amp, dt, 90f, .5f)
    }
    private fun headFace(): String = when {
        face.isNotEmpty() -> face
        state == "sleep" -> "head_sleep"
        held || state == "fall" -> "head_wow"
        blink > 0 -> "head_blink"
        state == "pet" || state == "music" -> "head_joy"
        sick || mood == "sad" -> "head_worry"
        else -> "head_neutral"
    }

    // ===================== 繪製與觸控 =====================
    @SuppressLint("ViewConstructor")
    private inner class PetView : View(svc) {
        private val paint = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG)
        private val dst = RectF()
        private val fxP = Paint(Paint.ANTI_ALIAS_FLAG)
        private val spiralP = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeCap = Paint.Cap.ROUND; color = 0xFF6B5A72.toInt() }
        private val path = Path()
        private var downX = 0f; private var downY = 0f; private var lastRawY = 0f; private var downT = 0L; private var lastTap = 0L
        private var mode = 0  // 0 未定、1 摸摸、2 抱起、3 選單
        private val longPress = Runnable { if (mode == 0) { mode = 3; performHapticFeedback(HapticFeedbackConstants.LONG_PRESS); svc.showMenu(this@PetActor) } }
        private var flingVX = 0f; private var flingVY = 0f; private var prevRX = 0f; private var prevRY = 0f; private var prevT = 0L; private var lastDx = 0f

        init { setLayerType(LAYER_TYPE_HARDWARE, null) }

        private fun img(c: Canvas, l: Layer?, dx: Float, dy: Float) {
            l ?: return; val kk = k
            dst.set((l.ox - 120f) * kk + dx, (l.oy - 255f) * kk + dy, (l.ox - 120f) * kk + dx + l.bmp.width / rs * kk, (l.oy - 255f) * kk + dy + l.bmp.height / rs * kk)
            c.drawBitmap(l.bmp, null, dst, paint)
        }

        override fun onDraw(c: Canvas) {
            val kk = k
            c.save(); c.translate(width / 2f, height.toFloat() - svc.dp(2))
            if (state == "climb" || state == "hang") c.rotate(if (wall < 0) 90f else -90f, 0f, -sizePx * .45f)
            if (state == "dizzy") c.rotate(sin(t * 3.1f) * 7f, 0f, -sizePx * .3f)
            val brk = sin(br) * (if (state == "sleep") .03f else .015f)
            var sx = 1f / sqrt(max(.4f, sq.x)); var sy = sq.x
            if (state == "sleep") { sx *= 1.1f; sy *= .8f } else if (state == "sit" || state == "watch") { sx *= 1.04f; sy *= .9f } else if (held) { sy *= 1.08f; sx *= .95f }
            val f = sign(flip.x).let { if (it == 0f) 1f else it } * max(.1f, min(1f, abs(flip.x)))
            val turnK = if (turnT >= 0) sin(PI.toFloat() * min(1f, turnT / .2f)) else 0f
            c.scale(f * sx * (1 + brk * .4f), sy * (1 - brk * .15f) * (1 + turnK * .05f))
            val moving = state == "walk" || state == "run" || state == "climb"
            c.translate(0f, (if (moving) -abs(sin(step)) * 3.5f else 0f) * kk - turnK * 5f * kk)
            val whole = layers["whole"]
            if (whole != null) {
                val h = sizePx * 1.05f; val w = h * whole.bmp.width / whole.bmp.height
                dst.set(-w / 2, -h, w / 2, 0f); c.drawBitmap(whole.bmp, null, dst, paint)
            } else {
                layers["tail"]?.let { l -> c.save(); val px = (piv[2] - 120f) * kk; val py = (piv[3] - 255f) * kk; c.rotate((if (tailRight) 1 else -1) * tail.x, px, py); img(c, l, 0f, 0f); c.restore() }
                val foot = { ph: Float -> if (moving) floatArrayOf(cos(ph) * 4f * kk, -max(0f, sin(ph)) * 6f * kk) else if (held) floatArrayOf(0f, (sin(t * 6f + ph) * 2f + 4f) * kk) else floatArrayOf(0f, 0f) }
                if (state != "sleep") { val a = foot(step); val b = foot(step + PI.toFloat()); img(c, layers["footL"], a[0], a[1]); img(c, layers["footR"], b[0], b[1]) }
                val bodyDy = (if (state == "sit" || state == "watch") 6f else if (state == "sleep") 10f else 0f) * kk
                img(c, layers["body"], 0f, bodyDy)
                if (state == "sleep") { img(c, layers["footL"], -6 * kk, -2 * kk); img(c, layers["footR"], 6 * kk, -2 * kk) }
                c.save()
                val pvx = (piv[0] - 120f) * kk; val pvy = (piv[1] - 255f) * kk
                c.translate(0f, (headY.x + sin(br) * (if (state == "sleep") 2.2f else 1.1f)) * kk + bodyDy * .6f)
                c.rotate(headR.x, pvx, pvy)
                img(c, layers[headFace()] ?: layers["head_neutral"], 0f, 0f)
                // 頭暈：螺旋眼
                if (state == "dizzy") { spiralP.strokeWidth = max(1.5f, 2.4f * kk)
                    for (ex in floatArrayOf(81f, 159f)) { val cx = (ex - 120f) * kk; val cy = (143f - 255f) * kk; path.reset()
                        for (i in 0..40) { val a = i / 40f * PI.toFloat() * 4.2f + t * 7f * (if (ex < 120) 1 else -1); val r = (1 + i / 40f * 10.5f) * kk; val px = cx + cos(a) * r; val py = cy + sin(a) * r * .9f; if (i == 0) path.moveTo(px, py) else path.lineTo(px, py) }
                        c.drawPath(path, spiralP) } }
                c.restore()
            }
            c.restore()
            // 頭暈星星、愛心、音符
            if (state == "dizzy") for (i in 0..2) { val a = t * 4f + i * 2.09f; fxP.color = if (i % 2 == 0) 0xFFFFD36E.toInt() else 0xFFFFF2B0.toInt(); star(c, width / 2f + cos(a) * sizePx * .3f, height * .12f + sin(a) * sizePx * .07f, svc.dp(5).toFloat()) }
            for (h in fx) { fxP.alpha = (min(1f, h[2]) * 255).toInt(); val s = svc.dp(7).toFloat()
                if (h[3] == 0f) { fxP.color = 0xFFF27C9B.toInt(); fxP.alpha = (min(1f, h[2]) * 255).toInt(); path.reset(); path.moveTo(h[0], h[1] + s * .35f); path.cubicTo(h[0] - s * 1.1f, h[1] - s * .35f, h[0] - s * .45f, h[1] - s * 1.05f, h[0], h[1] - s * .45f); path.cubicTo(h[0] + s * .45f, h[1] - s * 1.05f, h[0] + s * 1.1f, h[1] - s * .35f, h[0], h[1] + s * .35f); c.drawPath(path, fxP) }
                else { fxP.color = 0xFF8A7BD8.toInt(); fxP.alpha = (min(1f, h[2]) * 255).toInt(); fxP.textSize = s * 2.2f; c.drawText("♪", h[0], h[1], fxP) } }
        }
        private fun star(c: Canvas, x: Float, y: Float, s: Float) { path.reset(); path.moveTo(x, y - s); path.quadTo(x, y, x + s, y); path.quadTo(x, y, x, y + s); path.quadTo(x, y, x - s, y); path.quadTo(x, y, x, y - s); c.drawPath(path, fxP) }

        @SuppressLint("ClickableViewAccessibility")
        override fun onTouchEvent(e: MotionEvent): Boolean {
            when (e.actionMasked) {
                MotionEvent.ACTION_DOWN -> { downX = e.rawX; downY = e.rawY; lastRawY = e.rawY; downT = SystemClock.uptimeMillis(); mode = 0; prevRX = e.rawX; prevRY = e.rawY; prevT = downT; postDelayed(longPress, 450) }
                MotionEvent.ACTION_MOVE -> {
                    val now = SystemClock.uptimeMillis(); val dtm = max(1L, now - prevT) / 1000f
                    val ddx = e.rawX - prevRX
                    flingVX = flingVX * .4f + (ddx / dtm) * .6f; flingVY = flingVY * .4f + ((e.rawY - prevRY) / dtm) * .6f; prevRX = e.rawX; prevRY = e.rawY; prevT = now
                    val dx = e.rawX - downX; val dy = e.rawY - downY
                    if (mode == 0 && (abs(dx) > svc.dp(10) || abs(dy) > svc.dp(10))) {
                        removeCallbacks(longPress)
                        if (abs(dy) >= abs(dx) * .7f && state != "fall" && state != "climb" && state != "hang") { mode = 1; state = "pet"; stateT = 0f; nextT = 1e9f; petStrokes = 0; strokeDir = 0 } else startHold()
                    }
                    if (mode == 1) {
                        val d = e.rawY - lastRawY; lastRawY = e.rawY; petAcc += d; petDir = if (dx > 0) 1 else -1
                        val sgn = sign(d).toInt()
                        if (abs(petAcc) > svc.dp(14) && sgn != 0 && sgn != strokeDir) { strokeDir = sgn; petAcc = 0f; petStrokes++; sq.x = if (sgn > 0) .94f else 1.04f
                            if (petStrokes % 3 == 0) { hearts(); PetStore.addEvent(svc, this@PetActor.id, "pet") }
                            if (petStrokes % 8 == 0) say(pick("pet", "好舒服～")) }
                    } else if (mode == 2) {
                        // 甩：方向急轉計數
                        if (abs(ddx) > svc.dp(6) && lastDx != 0f && sign(ddx) != sign(lastDx)) { shake++; if (shake == 5) say("不要甩啦～") }
                        if (abs(ddx) > 2) lastDx = ddx
                        x = e.rawX; y = e.rawY + sizePx * .55f; if (abs(flingVX) > 60) turn(sign(flingVX))
                    }
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    removeCallbacks(longPress)
                    when (mode) {
                        2 -> { held = false; fallFrom = y; vx = flingVX.coerceIn(-3200f, 3200f) * .5f; vy = flingVY.coerceIn(-3200f, 3200f) * .5f; if (vy < 0) fallFrom = y + vy * .25f; state = "fall"; stateT = 0f; PetStore.addEvent(svc, this@PetActor.id, "drop"); savePos() }
                        1 -> { setState("idle"); if (petStrokes >= 6) { face = "head_joy"; faceT = 1.6f } }
                        3 -> {}
                        else -> {
                            val now = SystemClock.uptimeMillis()
                            if (now - lastTap < 320) svc.openApp()
                            else { lastTap = now; face = "head_joy"; faceT = 1.2f
                                if (state == "sleep") { setState("idle"); say("唔…早安…") }
                                else if (state == "dizzy") say("等、等一下…還在暈…")
                                else { say(pick("idle", "嗨！")); if (state != "climb" && state != "hang" && y >= svc.screenH - 1) { fallFrom = y; vy = -svc.dp(380).toFloat(); vx = 0f; sq.x = .86f; setState("jump") } } }
                        }
                    }
                    mode = 0
                }
            }
            return true
        }
        private fun startHold() { mode = 2; held = true; shake = 0; lastDx = 0f; state = "held"; stateT = 0f; nextT = 1e9f; say(pick("drop", "哇！")); performHapticFeedback(HapticFeedbackConstants.LONG_PRESS) }
    }

    // 選單動作
    fun menu(action: String) {
        when (action) {
            "pat" -> { setState("pet"); nextT = 2.5f; hearts(); hearts(); face = "head_joy"; faceT = 2f; say(pick("pet", "嘿嘿～")); PetStore.addEvent(svc, id, "pet") }
            "sleep" -> if (state == "sleep") { setState("idle"); say("唔…起床了～") } else { setState("sleep"); say("晚安…") }
            "dance" -> { setState("music"); say("啦啦啦～") }
            "hide" -> { say("我先去休息一下，等等見！"); svc.handler.postDelayed({ hideFor(10 * 60_000L) }, 1200) }
            "open" -> svc.openApp()
        }
    }
}

private const val POS = "pet_pos"
