package com.ocshimeji.app

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * 桌寵資料：主 App 與懸浮服務共用的唯一來源。
 * 圖層 PNG 存在 filesDir/pets/<id>/，設定存 pets.json；互動紀錄排入 events.json，
 * 由主 App 回到前景時取回並寫進遊戲存檔（服務本身不模擬需求，避免重複計算）。
 */
object PetStore {
    private val lock = Any()
    private fun dir(ctx: Context) = File(ctx.filesDir, "pets").apply { mkdirs() }
    private val idOk = Regex("^[\\w\\-]{1,48}$")
    private val layerOk = Regex("^[A-Za-z_]{1,24}$")

    fun save(ctx: Context, o: JSONObject): Boolean = synchronized(lock) {
        val pets = o.optJSONArray("pets") ?: return false
        val root = dir(ctx)
        root.listFiles()?.forEach { if (it.isDirectory) it.deleteRecursively() }
        val meta = JSONArray()
        for (i in 0 until minOf(pets.length(), 4)) {
            val p = pets.optJSONObject(i) ?: continue
            val id = p.optString("id")
            if (!idOk.matches(id)) continue
            val pd = File(root, id).apply { mkdirs() }
            val layers = p.optJSONObject("layers") ?: continue
            val outLayers = JSONObject()
            for (k in layers.keys()) {
                if (!layerOk.matches(k)) continue
                val L = layers.optJSONObject(k) ?: continue
                val png = L.optString("png")
                if (!png.startsWith("data:image/png;base64,")) continue
                val bytes = try { Base64.decode(png.substringAfter(","), Base64.DEFAULT) } catch (_: Exception) { continue }
                if (bytes.size > 6_000_000) continue
                File(pd, "$k.png").writeBytes(bytes)
                outLayers.put(k, JSONObject().put("ox", L.optDouble("ox", 0.0)).put("oy", L.optDouble("oy", 0.0)))
            }
            p.remove("layers")
            p.put("layerMeta", outLayers)
            meta.put(p)
        }
        File(root, "pets.json").writeText(JSONObject().put("pets", meta).put("cfg", o.optJSONObject("cfg") ?: JSONObject()).toString())
        meta.length() > 0
    }

    fun hasPets(ctx: Context): Boolean = synchronized(lock) {
        val f = File(dir(ctx), "pets.json")
        f.exists() && (try { JSONObject(f.readText()).optJSONArray("pets")?.length() ?: 0 } catch (_: Exception) { 0 }) > 0
    }

    fun load(ctx: Context): JSONObject? = synchronized(lock) {
        val f = File(dir(ctx), "pets.json")
        if (!f.exists()) null else try { JSONObject(f.readText()) } catch (_: Exception) { null }
    }

    fun bitmap(ctx: Context, id: String, layer: String): Bitmap? {
        if (!idOk.matches(id) || !layerOk.matches(layer)) return null
        val f = File(File(dir(ctx), id), "$layer.png")
        return if (f.exists()) BitmapFactory.decodeFile(f.path) else null
    }

    /** 只更新心情、台詞等小資料，不重新寫圖片 */
    fun updateState(ctx: Context, json: String) = synchronized(lock) {
        val arr = JSONArray(json)
        val f = File(dir(ctx), "pets.json")
        if (!f.exists()) return@synchronized
        val o = JSONObject(f.readText())
        val pets = o.optJSONArray("pets") ?: return@synchronized
        for (i in 0 until arr.length()) {
            val s = arr.optJSONObject(i) ?: continue
            for (j in 0 until pets.length()) {
                val p = pets.getJSONObject(j)
                if (p.optString("id") == s.optString("id")) {
                    p.put("mood", s.optString("mood")); p.put("sick", s.opt("sick") ?: JSONObject.NULL)
                    s.optJSONObject("lines")?.let { p.put("lines", it) }
                }
            }
        }
        f.writeText(o.toString())
    }

    fun addEvent(ctx: Context, id: String, type: String) = synchronized(lock) {
        val f = File(dir(ctx), "events.json")
        val arr = try { if (f.exists()) JSONArray(f.readText()) else JSONArray() } catch (_: Exception) { JSONArray() }
        if (arr.length() > 500) return@synchronized
        arr.put(JSONObject().put("id", id).put("type", type).put("t", System.currentTimeMillis()))
        f.writeText(arr.toString())
    }

    fun drainEvents(ctx: Context): String = synchronized(lock) {
        val f = File(dir(ctx), "events.json")
        if (!f.exists()) return@synchronized "[]"
        val s = try { JSONArray(f.readText()).toString() } catch (_: Exception) { "[]" }
        f.delete()
        s
    }
}
