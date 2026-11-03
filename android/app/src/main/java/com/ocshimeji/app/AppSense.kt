package com.ocshimeji.app

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ApplicationInfo
import android.os.BatteryManager
import android.os.Build
import android.os.Process

/**
 * 感知玩家正在使用的 App（需要使用者手動開啟「使用情況存取」）。
 * 只在手機上判斷類別，不記錄、不上傳任何使用紀錄。
 */
object AppSense {
    enum class Kind { VIDEO, MUSIC, GAME, SOCIAL, READ, CAMERA, MAP, SHOP, HOME, OTHER }

    fun hasAccess(ctx: Context): Boolean {
        val ops = ctx.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= 29) ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx.packageName)
        else @Suppress("DEPRECATION") ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx.packageName)
        return mode == AppOpsManager.MODE_ALLOWED
    }

    /** 最近一次移到前景的 App 套件名稱 */
    fun foreground(ctx: Context): String? {
        if (!hasAccess(ctx)) return null
        val um = ctx.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val end = System.currentTimeMillis()
        val ev = um.queryEvents(end - 60_000, end) ?: return null
        val e = UsageEvents.Event()
        var last: String? = null
        while (ev.hasNextEvent()) {
            ev.getNextEvent(e)
            @Suppress("DEPRECATION")
            if (e.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND || (Build.VERSION.SDK_INT >= 29 && e.eventType == UsageEvents.Event.ACTIVITY_RESUMED)) last = e.packageName
        }
        return last
    }

    private val KW = listOf(
        Kind.VIDEO to listOf("youtube", "netflix", "tiktok", "bilibili", "musically", "disney", "hulu", "twitch", "vimeo", "iqiyi", "kktv", "linetv", "catchplay", "friday"),
        Kind.MUSIC to listOf("spotify", "music", "kkbox", "soundcloud", "podcast", "deezer", "tidal"),
        Kind.SOCIAL to listOf("instagram", "facebook", "twitter", "threads", "line", "whatsapp", "telegram", "messenger", "discord", "wechat", "dcard", "plurk", "snapchat", "reddit"),
        Kind.READ to listOf("kindle", "book", "reader", "news", "webtoon", "manga", "chrome", "browser", "firefox", "notion", "docs"),
        Kind.CAMERA to listOf("camera", "snow", "ulike", "b612"),
        Kind.MAP to listOf("maps", "map", "uber", "waze"),
        Kind.SHOP to listOf("shopee", "momo", "pchome", "amazon", "taobao", "ruten", "shop"))

    fun kind(ctx: Context, pkg: String): Kind {
        if (pkg == ctx.packageName) return Kind.OTHER
        val launcher = ctx.packageManager.resolveActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME), 0)?.activityInfo?.packageName
        if (pkg == launcher) return Kind.HOME
        val p = pkg.lowercase()
        for ((k, words) in KW) if (words.any { p.contains(it) }) return k
        val cat = try { ctx.packageManager.getApplicationInfo(pkg, 0).category } catch (_: Exception) { -1 }
        return when (cat) {
            ApplicationInfo.CATEGORY_GAME -> Kind.GAME
            ApplicationInfo.CATEGORY_VIDEO -> Kind.VIDEO
            ApplicationInfo.CATEGORY_AUDIO -> Kind.MUSIC
            ApplicationInfo.CATEGORY_SOCIAL -> Kind.SOCIAL
            ApplicationInfo.CATEGORY_NEWS -> Kind.READ
            ApplicationInfo.CATEGORY_MAPS -> Kind.MAP
            ApplicationInfo.CATEGORY_IMAGE -> Kind.CAMERA
            else -> Kind.OTHER
        }
    }

    val LINES = mapOf(
        Kind.VIDEO to listOf("在看什麼？我也要看！", "這部好好看喔～", "爆米花在哪裡？", "嘘…看到精彩的地方了！"),
        Kind.MUSIC to listOf("這首歌好好聽～", "啦啦啦～一起跳舞吧！", "音樂讓尾巴想擺動！"),
        Kind.GAME to listOf("加油加油！", "哇，好厲害！", "這關一定過得了！", "我也想玩～"),
        Kind.SOCIAL to listOf("在跟誰聊天呀？", "幫我也打聲招呼～", "有好玩的貼文嗎？"),
        Kind.READ to listOf("你在讀什麼？", "我也來看看…", "字好多喔，眼睛要休息一下唷。"),
        Kind.CAMERA to listOf("要拍照嗎？我比個耶！", "幫我拍可愛一點！"),
        Kind.MAP to listOf("要去哪裡？帶我去！", "路上小心喔～"),
        Kind.SHOP to listOf("要買什麼好東西？", "這個看起來不錯！", "錢包還好嗎…？"),
        Kind.HOME to listOf("回到桌面啦～", "要陪我玩嗎？", "今天也辛苦了。"))

    fun battery(ctx: Context): Pair<Int, Boolean> {
        val i = ctx.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED)) ?: return 100 to false
        val lv = i.getIntExtra(BatteryManager.EXTRA_LEVEL, 100); val sc = i.getIntExtra(BatteryManager.EXTRA_SCALE, 100)
        val st = i.getIntExtra(BatteryManager.EXTRA_STATUS, -1)
        return (lv * 100 / maxOf(1, sc)) to (st == BatteryManager.BATTERY_STATUS_CHARGING || st == BatteryManager.BATTERY_STATUS_FULL)
    }
}
