# 架構（v4.2）

## 整體

```
┌──────────────── dist/oc-shimeji.html（單一檔案，瀏覽器或 Android WebView 載入）────────────────┐
│ core/main.js   Loop（固定步長模擬＋依效能模式限幀渲染）・Input（點擊/拖曳/滑動）・Cam・World・boot │
│ core/store.js  存檔 / 驗證 / 遷移 / 快照 / 備份 / IndexedDB 素材                               │
│ sim/*          需求、效用 AI、社交、群體、生病、記憶、願望（不碰 DOM）                           │
│ world/*        時間天氣（env）、地點（scenes）、2.5D 渲染器（renderer）                          │
│ art/*          原創圖示、3.2 貓咪 SVG、場景素材、角色分層骨架（rig）                              │
│ game/*         任務與商店、玩家互動（摸摸/餵食/抱起/甩出）、電影式演出、工坊作品與自訂事件         │
│ ui/*           HUD、抽屜、背包、商店、頁面、編輯器、繪圖工作室、工坊、佈置、開場與新手引導          │
│ core/native.js 與 Android 的橋接（只在 WebView 內有作用）                                       │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
        │ OCNative（@JavascriptInterface，只信任 https://appassets.androidplatform.net）
┌───────▼──────── Android（Kotlin） ───────────────────────────────────────────────────────────┐
│ MainActivity  WebView + WebViewAssetLoader；trusted 旗標                                     │
│ OCBridge      setPets / updatePetState / stopPets / pullPetEvents / 權限頁 / 震動 / 分享檔案    │
│ PetStore      filesDir/pets/{pets.json, <id>/<layer>.png, events.json}                        │
│ PetService    前景服務（specialUse）＋ Handler 迴圈；通知列控制；權限撤銷即停止                  │
│ PetActor      每隻夥伴一個剛好包住角色的 TYPE_APPLICATION_OVERLAY 小視窗；原生 Canvas 繪製     │
│ AppSense      （選用）UsageStatsManager 判斷前景 App 類型，讓夥伴有反應                          │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 模組與載入順序

所有模組都是 `(function(OC){…})(window.OC)` 形式，順序見 `tools/build.mjs` 的 `ORDER`，後面的模組可以用前面的。
`sim/` 與 `world/` 不碰 DOM；UI 透過 `OC.U.on/emit` 事件或直接讀 `OC.S` 更新。

## 主迴圈與渲染

- `Loop.frame`：模擬以 ≤0.05 秒的固定步長推進（`Sim.tick`），渲染依 `perf.fps` 限幀。分頁隱藏時停止，回來時補算離開時間（最多數小時，用粗步長）。
- `renderer.js` 每幀：
  1. 靜態層（地面、水、道路、地面色塊、地面陰影）畫在離屏 Canvas，**只有在 key 改變時重畫**。
     key = 相機 + 時間色調版本 + 場景 + 場景版本 + `perf.shadows`。
  2. 物件與角色依深度排序後繪製。
  3. 時間色調（multiply）與夜間燈光（lighter）。
  4. 天氣粒子（受 `weather`、`particles` 控制）。
  5. 疊加層：名字、對話泡泡（互相避讓，往上堆疊）、情緒符號、電影式黑邊。
- 角色（`art/rig.js`）：把 3.2 的貓咪 SVG 依部位光柵化成圖層（尾巴、雙腳、身體、多種表情的頭），用彈簧驅動。
  `animDetail=0` 時頭與身體直接到位（不跑次級彈簧），`2` 時多一些隨機張望。

## 模擬

- 每隻夥伴都是 `Sim.agents` 裡的 Agent，不在目前畫面的夥伴也照樣模擬（旅行、工作、社交）。
- `perf.bgTick < 1` 時，畫面外的夥伴每 `0.06/bgTick` 秒才更新一次（累積的 dt 一次補上），省電但不影響結果。
- 決策：需求缺口 × 性格／興趣權重的效用分數；群體行為（營火、拜訪、跟隨、躲雨）在 `sim/group.js`。
- 負面事件（吵架、生病、心情低落）可在設定關閉；絕交、成為戀人等重大變化一定先問玩家。

## 資料

### 存檔（`localStorage`）

| key | 內容 |
|---|---|
| `ocs4.save` | 主存檔 JSON（`v` = 存檔版本，目前 42） |
| `ocs4.save.bak` | 備援：上一次成功寫入的內容（寫入前先複製） |
| `ocs4.corrupt` | 讀取失敗時保留的原始內容（不會被覆蓋成空白） |
| `ocs.v1`、`ocs.eco.v1`… | 3.2 舊版資料（只讀，永遠不刪） |

存檔結構（節錄）：

```
{ v, created, lastSeen,
  chars:[{ id, kind:'cat'|'image', name, look, img?, anim?{frames:{state:[assetKey]}}, traits, sliders,
           needs{hunger,energy,fun,social,hygiene,comfort}, emo{joy,…}, bond, skills, memories, wishes, wear[], loc, x, z, sick? }],
  activeId, petIds[], rel{ "idA|idB":{ v, kind, … } }, pending[],
  coins, gems, xp, inv{ itemId:count }, creations[], events[], eventLog[],
  quests, shop, world{ loc, timeOffset, weather, house, houseFurn[], builds[] },
  settings{ perf, custom{…}, theme, motion, cine, pet{…}, … }, ui{…}, flags{started,…}, log[] }
```

- 每隻角色有唯一 `id`，需求、情緒、記憶、技能、穿戴都放在自己的物件裡（`tests/e2e.cjs` 驗證不共用參照）。
- 物品、背包、金幣、商店、家具、場景、任務、成就／圖鑑、事件、設定都在同一份存檔裡，用同一個 `Store.save()`（400ms 防抖）與 `flush()` 寫入。

### 載入流程

```
load()  主存檔 → (失敗) 備援 → (失敗) 標記 corrupt，原文存到 ocs4.corrupt
recover()  corrupt 時從最新每日快照還原
migrate()  依 MIGRATIONS 從舊版本一步步升級
validate() 修復：重複／缺少的角色 ID、activeId、petIds、關係 key、金幣範圍、不存在的物品、家具與建築、記錄長度
Assets.preload(refs())  所有圖片先讀進記憶體，介面可以同步顯示（不會先空白再出現）
```

`flush()` 遇到容量不足會先 `shrink()`（裁記錄）再重試。

### 素材（IndexedDB `ocs4`）

- `kv`：圖片 dataURL，key 例如 `img_…`（角色）、`cr_img_…`（工坊作品）、`fr_…`（動畫影格）。
- `snap`：每日快照（每天一份，最多 7 份），以及匯入、還原、重新開始前的保護快照。
- `Store.refs(S)` 列出存檔引用的所有素材；`gc()` 只刪除既不在存檔也不在任何快照中的素材。

### 匯出入

| 功能 | 內容 |
|---|---|
| 完整備份 `exportAll()` | 整份存檔＋所有引用的圖片（角色圖、動畫影格、工坊作品圖與影格），缺少的列在 `missing` |
| 匯入備份 `importAll()` | 驗證格式 → 先存快照 → 寫入素材 → 遷移＋驗證 → `Store.reload()` |
| 角色包 `exportChar()` | 角色＋圖片＋動畫影格＋穿戴中的工坊飾品（含圖） |
| 匯入角色包 `importChar()` | 一律給新 ID 與新素材 key，不覆蓋現有角色 |
| 作品包（工坊） | `Creations.exportPack/importPack`，含圖片與影格 |
| 3.2 舊版 | `importLegacy()`，讀 localStorage 與 3.2 的 IndexedDB，可重複執行（不重複新增） |

## 與 Android 桌寵共享資料（現況與規劃）

**現況（v4.2）**

- App → 桌寵：`OCNative.setPets(json)` 傳出選定夥伴的部位圖層 PNG、支點、台詞、心情、生病狀態與桌寵設定。
  `PetStore` 寫到 `filesDir/pets/`。之後的心情與狀態變化用較小的 `updatePetState`。
- 桌寵 → App：互動（摸摸、甩出）寫入 `events.json`。App 回到前景（`onResume`）或啟動時用 `pullPetEvents` 取回並清空，
  所以不會重複計算。桌寵本身**不模擬需求**，存檔唯一的真實來源是 WebView 裡的 `OC.S`。
- 桌寵位置以螢幕比例存在 `SharedPreferences("pet_pos")`。

**規劃（第二階段）**

1. 為 `pets.json` 加上 `schema` 版本欄位，`PetStore.load` 遇到未知版本時不崩潰並要求 App 重送。
2. App 不在前景時，桌寵需求的近似變化由 App 在 `visibilitychange` 回來後依時間補算（已有離線補算機制），桌寵端只紀錄事件。
3. 若要讓桌寵在 App 未開啟時也能顯示最新心情，由 App 每次存檔時順便 `updatePetState`（已做），並加上「最後同步時間」顯示。

## Android 原生安全與生命週期

- WebView 只載入 `https://appassets.androidplatform.net/assets/web/index.html`。外部網址不在 WebView 內開啟。
  `onPageStarted` 依網址設定 `trusted`，橋接每個方法都先檢查。不開放 file:// 存取。
- 前景服務 `specialUse`。`startForeground` 失敗（例如 Android 12+ 從背景啟動）時安全結束，下次開 App 再啟動。
- 每幀檢查 `canDrawOverlays`，權限被撤銷就停止服務。螢幕關閉時停止繪製。
- `onConfigurationChanged`（旋轉）時重新量測螢幕，夥伴落回地面。
- 每隻夥伴一個小視窗（`FLAG_NOT_FOCUSABLE | FLAG_NOT_TOUCH_MODAL`），視窗外的觸控直接交給底下的 App。
  視窗內透明區域的觸控目前仍由桌寵接收。見 ROADMAP。
