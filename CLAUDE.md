# CLAUDE.md — OC Shimeji 開發須知

給之後接手的開發者（人或 AI）。改任何東西前先讀這份與 `docs/ARCHITECTURE.md`。

## 一句話

原創角色（OC）生活模擬遊戲（單一 HTML，可離線）＋ Android 系統級懸浮桌寵（Kotlin）。
原始碼在 `web/src/`，由 `tools/build.mjs` 內嵌成 `dist/oc-shimeji.html`，同一份檔案也複製進 Android assets。

## 常用指令

```bash
node tools/build.mjs        # 建置 dist/oc-shimeji.html、web/index.html（開發用）、Android assets
node tools/check.mjs        # 語法、模組清單、同一物件重複方法、建置輸出一致（任何修改後都要跑）
node tests/e2e.cjs          # 端對端測試（Playwright，390×844），報告在 tests/out/report.json
cd android && gradle assembleDebug   # 或 ./gradlew；APK 複製到 dist/oc-shimeji-v4-debug.apk
```

## 規則

1. **不要直接改 `dist/`、`web/index.html`、`android/app/src/main/assets/web/`**。它們都是建置產物。
2. **新增模組**要加進 `tools/build.mjs` 的 `ORDER`（`check.mjs` 會擋）。模組是 IIFE，掛在全域 `OC` 上，順序就是相依順序。
3. **每畫面不寫 DOM**。世界、角色、泡泡、名字、天氣都畫在 Canvas（`world/renderer.js`）。
   UI 只在資料改變時更新；面板內容改變請用 `sheet.update(html)` 就地更新，**不要關閉再重開**（會閃）。
   `tests/e2e.cjs` 會量閒置 5 秒的 DOM 變動（必須 < 30）。
4. **存檔欄位**一律加在 `core/store.js` 的 `defaults()`。欄位改名或結構改變時，提高 `VER` 並在 `MIGRATIONS` 加一步。
   會被 `validate()` 檢查與修復的欄位也一起補上。
5. **圖片不要放進存檔 JSON**，放 IndexedDB（`OC.Store.Assets.put(key, dataUrl)`），存檔只存 key。
   新的圖片引用要加進 `Store.refs()`，否則完整備份不會帶上它，`gc()` 也可能把它清掉。
6. **寫入新存檔後要重新載入時用 `OC.Store.reload()`**，不要直接 `location.reload()`。
   否則 `pagehide` 會把記憶體裡的舊狀態寫回去。
7. **效能選項**都從 `OC.Store.perf()` 讀，選項定義在 `PERF`。新的特效要尊重 `particles`、`ambient`、`weather`、`animDetail`。
8. **重大關係變化**（絕交、成為戀人、特質改變）一定要先問玩家（`UI.confirm` 或決定卡）。
9. **Android 橋接**（`OCBridge.kt`）每個方法開頭都要檢查 `ok`（目前頁面是 App 內建內容）。所有輸入都當成不受信任的資料：限制大小、用 JSON 解析。
10. **不使用 emoji 當圖示**。圖示在 `art/icons.js`（原創 SVG）。
11. 介面文字使用繁體中文。

## 除錯

- 開 `web/index.html` 可以分開載入各模組，錯誤行號比較好讀。
- Console 可用 `OC.S`（存檔）、`OC.Sim`、`OC.R`（渲染器）、`OC.Loop.timeScale = 20`（加速模擬）。
- 存檔損毀時，原始內容會留在 `localStorage['ocs4.corrupt']`。
