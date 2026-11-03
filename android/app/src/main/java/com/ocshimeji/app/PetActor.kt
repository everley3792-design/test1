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
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import org.json.JSONObject
import java.util.Calendar
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sign
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.random.Random

/**
 * 一隻桌面夥伴：Shimeji 式行為（待機、走、跑、坐、睡、攀爬螢幕邊緣、跳躍、掉落、被抱起）
 * 與骨架動畫（和遊戲內相同的分層：尾巴、雙腳、身體、多表情頭部），並處理點擊、上下滑動摸摸、拖曳。
 */
@SuppressLint("ViewConstructor")
class PetActor(private val svc: PetService, private val wm: WindowManager, data: JSONObject, index: Int, count: Int) {
    val id: String = data.optString("id")
    private val name = data.optString("name")
    private val kind = data.optString("kind", "cat")
    private val rs = data.optDouble("rs", 1.6).toFloat()
    private var lines = data.optJSONObject("lines") ?: JSONObject()
    private var mood = data.optString("mood", "content")
    private var sick = !data.isNull("sick") && data.optString("sick").isNotEmpty()
    private val quirks = data.optJSONObject("quirks") ?: JSONObject()
    private val layers = HashMap<String, Layer>()
    private var piv = floatArrayOf(120f, 176f, 150f, 215f, 104f, 222f, 134f, 222f)
    private var tailRight = true

    /** 尺寸：角色高度（px） */
    val sizePx: Float = svc.dp(118) * data.optDouble("scale", 1.0).toFloat().coerceIn(.5f, 2f)
    private val k get() = sizePx / 246f               // 每個 viewBox 單位的像素
    private val boxW = (sizePx * 1.05f).toInt()
    private val boxH = (sizePx * 1.25f).toInt()

    // 物理狀態（x 為腳底中心，y 為腳底；螢幕座標）
    var x = 0f; var y = 0f
    private var vx = 0f; private var vy = 0f
    private var facing = if (Random.nextBoolean()) 1f else -1f
    private var state = "fall"
    private var stateT = 0f
    private var nextT = 2f
    private var wall = 0              // 攀爬中的牆：-1 左、1 右
    private var held = false

    // 動畫通道
    private var t = 0f; private var br = Random.nextFloat() * 6f; private var step = 0f
    private var blinkT = 2f; private var blink = 0f
    private val flip = Spring(facing); private val sq = Spring(1f); private val headY = Spring(0f); private val headR = Spring(0f); private val tail = Spring(0f)
    private var tailPh = 0f
    private var face = ""; private var faceT = 0f
    private val hearts = ArrayList<FloatArray>()      // x, y, life
    private var petStrokes = 0; private var petDir = 0; private var strokeDir = 0; private var petAcc = 0f

    private val view = PetView()
    private val lp = WindowManager.LayoutParams(boxW, boxH, WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
        PixelFormat.TRANSLUCENT).apply { gravity = Gravity.TOP or Gravity.START }
    private val bubble: TextView = svc.bubbleWindow()
    private var bubbleT = 0f

    private class Layer(val bmp: Bitmap, val ox: Float, val oy: Float)
    private class Spring(var x: Float) { var v = 0f
        fun to(target: Float, dt: Float, kk: Float = 180f, z: Float = .7f): Float { val c = 2f * z * sqrt(kk); v += (kk * (target - x) - c * v) * dt; x += v * dt; return x } }

    init {
        val meta = data.optJSONObject("layerMeta") ?: JSONObject()
        for (name in meta.keys()) {
            val m = meta.getJSONObject(name)
            PetStore.bitmap(svc, id, name)?.let { layers[name] = Layer(it, m.optDouble("ox").toFloat(), m.optDouble("oy").toFloat()) }
        }
        data.optJSONObject("piv")?.let { p ->
            fun a(n: String) = p.optJSONArray(n)
            a("head")?.let { piv[0] = it.optDouble(0).toFloat(); piv[1] = it.optDouble(1).toFloat() }
            a("tail")?.let { piv[2] = it.optDouble(0).toFloat(); piv[3] = it.optDouble(1).toFloat() }
            a("footL")?.let { piv[4] = it.optDouble(0).toFloat(); piv[5] = it.optDouble(1).toFloat() }
            a("footR")?.let { piv[6] = it.optDouble(0).toFloat(); piv[7] = it.optDouble(1).toFloat() }
            tailRight = p.optBoolean("tailRight", true)
        }
        x = svc.screenW * (index + 1f) / (count + 1f); y = svc.screenH * .35f
        wm.addView(view, lp)
        place()
    }

    // ===================== 行為 =====================
    fun tick(dt: Float) {
        t += dt; stateT += dt
        br += dt * (if (state == "sleep") 1.05f else if (sick) 2.2f else 1.7f)
        blinkT -= dt; if (blinkT <= 0) { blink = .13f; blinkT = if (Random.nextFloat() < .2f) .28f else 2.2f + Random.nextFloat() * 3.3f }; if (blink > 0) blink -= dt
        if (faceT > 0) { faceT -= dt; if (faceT <= 0) face = "" }
        val ground = svc.screenH.toFloat()
        if (!held) when (state) {
            "fall" -> { vy += 2600f * dt; y += vy * dt; x += vx * dt; vx *= .99f
                if (y >= ground) { y = ground; if (vy > 1400f) { say(pick("drop", "哇啊！")); sq.x = .72f } else sq.x = .86f; vy = 0f; vx = 0f; setState("idle") } }
            "walk", "run" -> { val sp = (if (state == "run") 2.4f else 1f) * svc.dp(46) * walkSpeed(); vx = facing * sp; x += vx * dt
                if (x < boxW * .5f || x > svc.screenW - boxW * .5f) {
                    // 走到螢幕邊緣：有時候會爬上牆
                    if (Random.nextFloat() < .45f) { wall = if (x < svc.screenW / 2) -1 else 1; x = if (wall < 0) boxW * .35f else svc.screenW - boxW * .35f; setState("climb") }
                    else { facing = -facing; x = x.coerceIn(boxW * .5f, svc.screenW - boxW * .5f) }
                }
                step += dt * PI.toFloat() * 2f * (if (state == "run") 3.1f else 2.2f)
                if (stateT > nextT) decide() }
            "climb" -> { y -= svc.dp(34) * dt; step += dt * PI.toFloat() * 3.2f
                if (y < svc.screenH * .25f || stateT > nextT) { setState(if (Random.nextFloat() < .5f) "hang" else "fall"); vx = -wall * svc.dp(60).toFloat() } }
            "hang" -> if (stateT > 2.5f + Random.nextFloat() * 3f) { setState("fall"); vx = -wall * svc.dp(40).toFloat(); wall = 0 }
            "jump" -> { vy += 2600f * dt; y += vy * dt; x += vx * dt; if (y >= ground && vy > 0) { y = ground; vy = 0f; sq.x = .84f; setState("idle") } }
            else -> if (stateT > nextT) decide()
        }
        if (state != "climb" && state != "hang") wall = 0
        y = min(y, ground)
        animate(dt)
        hearts.removeAll { it[2] -= dt; it[1] -= dt * svc.dp(40); it[2] <= 0 }
        if (bubbleT > 0) { bubbleT -= dt; if (bubbleT <= 0) bubble.visibility = View.GONE else placeBubble() }
        place()
        view.invalidate()
    }

    private fun walkSpeed(): Float = when (quirks.optString("walk")) { "shuffle" -> .78f; "tiptoe", "bouncy" -> 1.06f; else -> 1f } * (if (sick) .65f else 1f)

    private fun decide() {
        val h = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        val night = h >= 22 || h < 6
        val opts = mutableListOf("idle" to 3f, "walk" to 3f, "sit" to 1.4f, "run" to (if (sick) .1f else .6f), "jump" to (if (sick) 0f else .5f),
            "sleep" to (if (night || mood == "sleepy" || sick) 3f else .4f))
        var r = Random.nextFloat() * opts.sumOf { it.second.toDouble() }.toFloat()
        val pick = opts.first { r -= it.second; r <= 0 }.first
        when (pick) {
            "walk", "run" -> { if (Random.nextFloat() < .4f) facing = -facing; setState(pick) }
            "jump" -> { vy = -svc.dp(520).toFloat(); vx = facing * svc.dp(70); sq.x = .85f; setState("jump") }
            else -> setState(pick)
        }
        if (Random.nextFloat() < .12f && state != "sleep") say(pick("idle", "…"))
    }

    private fun setState(s: String) {
        state = s; stateT = 0f
        nextT = when (s) { "sleep" -> 25f + Random.nextFloat() * 40f; "sit" -> 6f + Random.nextFloat() * 8f; "walk" -> 3f + Random.nextFloat() * 5f; "run" -> 1.5f + Random.nextFloat() * 2f; "climb" -> 3f + Random.nextFloat() * 4f; else -> 2f + Random.nextFloat() * 4f }
    }

    fun isResting() = (state == "sleep" || state == "sit") && !held && hearts.isEmpty() && bubbleT <= 0
    fun canChat() = !held && state != "sleep" && state != "climb" && state != "fall" && bubbleT <= 0
    fun faceTo(px: Float) { facing = if (px > x) 1f else -1f; if (state == "walk" || state == "run") setState("idle") }
    fun hearts() { repeat(2) { hearts.add(floatArrayOf(boxW / 2f + (Random.nextFloat() - .5f) * sizePx * .4f, boxH * .25f, 1.2f)) } }

    fun updateState(p: JSONObject) { mood = p.optString("mood", mood); sick = !p.isNull("sick") && p.optString("sick").isNotEmpty(); p.optJSONObject("lines")?.let { lines = it } }
    fun onScreenChanged() { x = x.coerceIn(boxW * .5f, svc.screenW - boxW * .5f); if (y > svc.screenH) y = svc.screenH.toFloat(); if (state != "held") setState("fall") }
    fun setVisible(v: Boolean) { view.visibility = if (v) View.VISIBLE else View.GONE; if (!v) bubble.visibility = View.GONE }

    private fun pick(kind: String, def: String): String { val a = lines.optJSONArray(kind); return if (a != null && a.length() > 0) a.optString(Random.nextInt(a.length())) else def }

    fun say(text: String) {
        if (text.isBlank()) return
        bubble.text = text; bubble.visibility = View.VISIBLE; bubbleT = 2.4f + text.length * .12f; placeBubble()
    }
    private fun placeBubble() {
        val blp = bubble.layoutParams as? WindowManager.LayoutParams ?: return
        val w = if (bubble.width > 0) bubble.width else svc.dp(120)
        blp.x = (x - w / 2f).toInt().coerceIn(0, max(0, svc.screenW - w)); blp.y = (y - sizePx * 1.2f - (if (bubble.height > 0) bubble.height else svc.dp(36))).toInt().coerceAtLeast(0)
        try { wm.updateViewLayout(bubble, blp) } catch (_: Exception) {}
    }

    private var lastX = -1; private var lastY = -1
    private fun place() {
        val nx = (x - boxW / 2f).toInt(); val ny = (y - boxH).toInt()
        if (nx == lastX && ny == lastY) return
        lastX = nx; lastY = ny; lp.x = nx; lp.y = ny
        try { wm.updateViewLayout(view, lp) } catch (_: Exception) {}
    }

    fun remove() { try { wm.removeView(view) } catch (_: Exception) {}; try { wm.removeView(bubble) } catch (_: Exception) {}; layers.values.forEach { it.bmp.recycle() } }

    // ===================== 動畫 =====================
    private fun animate(dt: Float) {
        flip.to(facing, dt, 260f, .82f); sq.to(1f, dt, 200f, .38f)
        val moving = state == "walk" || state == "run" || state == "climb"
        var hy = 0f; var hr = 0f; var amp = 10f; var spd = 1.6f; var base = 0f
        if (moving) { hy = abs(sin(step)) * 3f; spd = 2.6f; amp = 12f }
        when (state) {
            "sit" -> { hy += 8f; amp = 6f; spd = 1f }
            "sleep" -> { hy += 14f; hr = 12f; amp = 3f; spd = .5f; base = 8f }
            "pet" -> { hr = petDir * 9f; amp = 22f; spd = 4.2f }
            "held" -> { hy = -4f; amp = 20f; spd = 3f; hr = sin(t * 5f) * 5f }
            "hang" -> { amp = 18f; spd = 2.5f }
        }
        if (held) { amp = 20f; spd = 3f }
        if (sick) { base -= 10f; amp *= .5f }
        headY.to(hy, dt, 140f, .55f); headR.to(hr, dt, 110f, .6f)
        tailPh += dt * spd * 2f; tail.to(base + sin(tailPh) * amp, dt, 90f, .5f)
    }
    private fun headFace(): String = when {
        face.isNotEmpty() -> face
        state == "sleep" -> "head_sleep"
        blink > 0 -> "head_blink"
        held -> "head_wow"
        state == "pet" -> "head_joy"
        sick || mood == "sad" -> "head_worry"
        else -> "head_neutral"
    }

    // ===================== 繪製與觸控 =====================
    @SuppressLint("ViewConstructor")
    private inner class PetView : View(svc) {
        private val paint = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG)
        private val dst = RectF()
        private val heartP = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFF27C9B.toInt() }
        private val heart = Path()
        private var downX = 0f; private var downY = 0f; private var lastRawY = 0f; private var downT = 0L; private var lastTap = 0L
        private var mode = 0  // 0 未定、1 摸摸、2 抱起
        private val longPress = Runnable { if (mode == 0) startHold() }
        private var flingVX = 0f; private var flingVY = 0f; private var prevRX = 0f; private var prevRY = 0f; private var prevT = 0L

        init { setLayerType(LAYER_TYPE_HARDWARE, null) }

        private fun img(c: Canvas, l: Layer?, dx: Float, dy: Float) {
            l ?: return
            val kk = k
            dst.set((l.ox - 120f) * kk + dx, (l.oy - 255f) * kk + dy, (l.ox - 120f) * kk + dx + l.bmp.width / rs * kk, (l.oy - 255f) * kk + dy + l.bmp.height / rs * kk)
            c.drawBitmap(l.bmp, null, dst, paint)
        }

        override fun onDraw(c: Canvas) {
            val kk = k
            c.save()
            c.translate(width / 2f, height.toFloat() - svc.dp(2))
            // 攀牆：整隻轉 90 度，腳貼著牆
            if (state == "climb" || state == "hang") { c.rotate(if (wall < 0) 90f else -90f, 0f, -sizePx * .45f) }
            val brk = sin(br) * (if (state == "sleep") .03f else .015f)
            var sx = 1f / sqrt(max(.4f, sq.x)); var sy = sq.x
            if (state == "sleep") { sx *= 1.1f; sy *= .8f } else if (state == "sit") { sx *= 1.04f; sy *= .9f } else if (held) { sy *= 1.08f; sx *= .95f }
            val fx = sign(flip.x).let { if (it == 0f) 1f else it } * max(.3f, min(1f, abs(flip.x)))
            c.scale(fx * sx * (1 + brk * .4f), sy * (1 - brk * .15f))
            val moving = state == "walk" || state == "run" || state == "climb"
            if (moving) c.translate(0f, -abs(sin(step)) * 3.5f * kk)
            val whole = layers["whole"]
            if (whole != null) {
                val h = sizePx * 1.05f; val w = h * whole.bmp.width / whole.bmp.height
                dst.set(-w / 2, -h, w / 2, 0f); c.drawBitmap(whole.bmp, null, dst, paint)
            } else {
                // 尾巴
                layers["tail"]?.let { l -> c.save(); val px = (piv[2] - 120f) * kk; val py = (piv[3] - 255f) * kk; c.rotate((if (tailRight) 1 else -1) * tail.x, px, py); img(c, l, 0f, 0f); c.restore() }
                // 腳
                val foot = { ph: Float -> if (moving) floatArrayOf(cos(ph) * 4f * kk, -max(0f, sin(ph)) * 6f * kk) else if (held) floatArrayOf(0f, (sin(t * 6f + ph) * 2f + 4f) * kk) else floatArrayOf(0f, 0f) }
                if (state != "sleep") { val a = foot(step); val b = foot(step + PI.toFloat()); img(c, layers["footL"], a[0], a[1]); img(c, layers["footR"], b[0], b[1]) }
                val bodyDy = (if (state == "sit") 6f else if (state == "sleep") 10f else 0f) * kk
                img(c, layers["body"], 0f, bodyDy)
                if (state == "sleep") { img(c, layers["footL"], -6 * kk, -2 * kk); img(c, layers["footR"], 6 * kk, -2 * kk) }
                // 頭
                c.save()
                val pvx = (piv[0] - 120f) * kk; val pvy = (piv[1] - 255f) * kk
                c.translate(0f, (headY.x + sin(br) * (if (state == "sleep") 2.2f else 1.1f)) * kk + bodyDy * .6f)
                c.rotate(headR.x, pvx, pvy)
                img(c, layers[headFace()] ?: layers["head_neutral"], 0f, 0f)
                c.restore()
            }
            c.restore()
            // 愛心
            for (h in hearts) { heartP.alpha = (min(1f, h[2]) * 255).toInt(); val s = svc.dp(7).toFloat(); heart.reset()
                heart.moveTo(h[0], h[1] + s * .35f); heart.cubicTo(h[0] - s * 1.1f, h[1] - s * .35f, h[0] - s * .45f, h[1] - s * 1.05f, h[0], h[1] - s * .45f)
                heart.cubicTo(h[0] + s * .45f, h[1] - s * 1.05f, h[0] + s * 1.1f, h[1] - s * .35f, h[0], h[1] + s * .35f); c.drawPath(heart, heartP) }
        }

        @SuppressLint("ClickableViewAccessibility")
        override fun onTouchEvent(e: MotionEvent): Boolean {
            when (e.actionMasked) {
                MotionEvent.ACTION_DOWN -> { downX = e.rawX; downY = e.rawY; lastRawY = e.rawY; downT = SystemClock.uptimeMillis(); mode = 0; prevRX = e.rawX; prevRY = e.rawY; prevT = downT
                    postDelayed(longPress, 420) }
                MotionEvent.ACTION_MOVE -> {
                    val now = SystemClock.uptimeMillis(); val dtm = max(1L, now - prevT) / 1000f
                    flingVX = (e.rawX - prevRX) / dtm; flingVY = (e.rawY - prevRY) / dtm; prevRX = e.rawX; prevRY = e.rawY; prevT = now
                    val dx = e.rawX - downX; val dy = e.rawY - downY
                    if (mode == 0 && (abs(dx) > svc.dp(10) || abs(dy) > svc.dp(10))) {
                        removeCallbacks(longPress)
                        // 上下滑動 → 摸摸；橫向大幅拖動 → 抱起
                        if (abs(dy) >= abs(dx)) { mode = 1; state = "pet"; stateT = 0f; nextT = 1e9f; petStrokes = 0; strokeDir = 0 } else startHold()
                    }
                    if (mode == 1) {
                        val d = e.rawY - lastRawY; lastRawY = e.rawY; petAcc += d; petDir = if (dx > 0) 1 else -1
                        val sgn = sign(d).toInt()
                        if (abs(petAcc) > svc.dp(14) && sgn != 0 && sgn != strokeDir) { strokeDir = sgn; petAcc = 0f; petStrokes++; sq.x = if (sgn > 0) .94f else 1.04f
                            if (petStrokes % 3 == 0) { hearts(); PetStore.addEvent(svc, this@PetActor.id, "pet") }
                            if (petStrokes % 8 == 0) say(pick("pet", "好舒服～")) }
                    } else if (mode == 2) { x = e.rawX; y = e.rawY + sizePx * .55f; if (abs(flingVX) > 50) facing = sign(flingVX) }
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    removeCallbacks(longPress)
                    when (mode) {
                        2 -> { held = false; state = "fall"; stateT = 0f; vx = flingVX.coerceIn(-3000f, 3000f) * .5f; vy = flingVY.coerceIn(-3000f, 3000f) * .5f; PetStore.addEvent(svc, this@PetActor.id, "drop") }
                        1 -> { setState("idle"); if (petStrokes >= 6) { face = "head_joy"; faceT = 1.6f } }
                        else -> {
                            val now = SystemClock.uptimeMillis()
                            if (now - lastTap < 320) { svc.openApp() }   // 點兩下：打開小島
                            else { lastTap = now; face = "head_joy"; faceT = 1.2f; if (state == "sleep") { setState("idle"); say("唔…早安…") } else { say(pick("idle", "嗨！")); if (state != "climb" && state != "hang" && y >= svc.screenH - 1) { vy = -svc.dp(380).toFloat(); vx = 0f; sq.x = .86f; setState("jump") } } }
                        }
                    }
                    mode = 0
                }
            }
            return true
        }

        private fun startHold() { mode = 2; held = true; state = "held"; stateT = 0f; nextT = 1e9f; say(pick("drop", "哇！")); performHapticFeedback(android.view.HapticFeedbackConstants.LONG_PRESS) }
    }
}
