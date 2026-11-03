# OC Shimeji v4.1 — 我的夥伴小島

原創角色（OC）生活模擬遊戲＋ Android 系統級懸浮桌寵。

- **直接遊玩**：用瀏覽器開啟 `dist/oc-shimeji.html`（單一檔案，可離線）。
- **開發記錄與待辦**：[`docs/DEVLOG.md`](docs/DEVLOG.md)

## 專案結構

```
web/src/
  shell.html          頁面骨架（build 時把 CSS／JS 內嵌進來）
  style.css           介面樣式（奶油白圓角、深淺色變數）
  core/  util.js  store.js(存檔/遷移/備份)  native.js(Android 橋接)  main.js(主迴圈/輸入/相機/啟動)
  art/   icons.js(原創圖標)  cat-svg.js(3.2 原創貓咪造型，原樣移植)  sprites.js(Low-Poly 場景素材)  rig.js(角色分層骨架動畫)
  world/ env.js(時間天氣色調)  scenes.js(地點)  renderer.js(2.5D Canvas 渲染器)
  sim/   legacy-data.js(3.2 性格資料)  content.js(物品/房屋/地點/台詞)  chars.js(角色模型)
         actions.js(生活行動)  sim.js(需求/AI/旅行/生病/記憶)  social.js(社交/吵架/絕交/戀愛)
  game/  quests.js(任務/商店)  play.js(摸摸/餵食/抱起/拋出)  cine.js(電影式互動)  creations.js(工坊作品/自製事件)
  ui/    ui.js(HUD/輪盤/通知/抽屜)  bag.js  shop.js  studio.js(繪畫)  workshop.js  deco.js(佈置/拍照/桌寵設定)  pages.js(角色/地圖/日常/設定)  editor.js(角色編輯器)  intro.js(開場/新手引導)
tools/build.mjs       產生 dist/oc-shimeji.html、web/index.html（開發用），並複製到 Android assets
android/              Android Studio 專案（Kotlin）
legacy/               3.2 原始檔（參考用）
```

## 建置

```bash
node tools/build.mjs                      # 產生 dist/oc-shimeji.html 並同步到 android/app/src/main/assets/web/
cd android && ./gradlew assembleDebug     # 需要 Android SDK 35（local.properties 指定 sdk.dir）
# APK：android/app/build/outputs/apk/debug/app-debug.apk
```

開發時可直接開 `web/index.html`（分開載入各模組，方便除錯）。

## 架構原則

- **單一迴圈、單一 Canvas**：世界、角色、天氣、光影、對話泡泡都在 `renderer.js` 繪製；DOM 只放 UI，只在資料改變時更新。
- **遊戲邏輯與 UI 分離**：`sim/` 不碰 DOM；UI 透過 `OC.U.on/emit` 事件更新。
- **存檔**：`localStorage['ocs4.save']`（每 10 分鐘另存備援），圖片放 IndexedDB `ocs4`；完整備份會把圖片一起打包。
- **Android**：WebView 透過 `OCNative` 只呼叫必要的功能；桌寵由原生服務繪製，與主 App 共用同一份角色圖層。
