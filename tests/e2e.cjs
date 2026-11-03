/* OC Shimeji 端對端測試（Playwright，手機尺寸 390×844）
 * 執行：node tools/build.mjs && node tests/e2e.cjs
 * 產出：tests/out/report.json 與截圖（tests/out/*.png）
 * 涵蓋：開場創角、角色選單與聊天、餵食、商店、背包、工坊創作、自訂事件、甩動頭暈、進出屋子、
 *       時間天氣切換（就地更新）、任務分頁、深淺色主題、效能模式即時切換、重新載入、多角色資料獨立、
 *       完整備份含圖片/動畫影格、角色包、3.2 舊版遷移、每日快照還原、存檔損毀復原。 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'dist/oc-shimeji.html');
const LEGACY = 'file://' + path.join(ROOT, 'legacy/oc-shimeji-3_2-smooth.html');
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const results = []; let errs = [];
const chk = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  ' + JSON.stringify(detail).slice(0, 200) : '')); };
const wait = (p, ms) => p.waitForTimeout(ms);
const watch = p => { p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_FILE_NOT_FOUND/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 200)) }) };
const shot = (p, n) => p.screenshot({ path: path.join(OUT, n + '.png'), scale: 'css' });
const day = (p, h = 10.5, w = 'sunny') => p.evaluate(([h, w]) => { const d = new Date(); OC.S.world.timeOffset = Math.round((h - (d.getHours() + d.getMinutes() / 60)) * 3600e3); OC.S.world.weather = w; OC.Env._k = -1 }, [h, w]);
const step = async (name, fn) => { try { await fn() } catch (e) { chk(name, false, e.message.split('\n')[0]) } };
/* DOM 變動計數（判斷是否有整頁重繪或關閉重開） */
const mutStart = p => p.evaluate(() => { window.__m = 0; window.__mo && window.__mo.disconnect(); window.__mo = new MutationObserver(l => window.__m += l.length); window.__mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true }) });
const mutRead = p => p.evaluate(() => window.__m);

/* 從開場一路建立新遊戲：選示範夥伴 + 自己創一隻 */
async function newGame(p) {
  await p.goto(URL); await wait(p, 1200);
  await p.click('[data-go]'); await wait(p, 500); await p.click('.in-cap [data-skip]'); await wait(p, 700);
  for (const d of ['mochi', 'yuzu']) await p.click(`[data-demo=${d}]`);
  await p.click('.sw:has(#skipTut)'); await p.click('[data-opt=both]'); await wait(p, 1300);
  await p.click('[data-rand]'); await wait(p, 600); await shot(p, '01-editor'); await p.click('[data-save]'); await wait(p, 1000);
  await p.click('[data-place]'); await wait(p, 800); await p.click('[data-ok]'); await wait(p, 8000);
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true });
  const p = await ctx.newPage(); watch(p);

  await step('開場與創角', async () => {
    await newGame(p);
    const st = await p.evaluate(() => ({ started: OC.S.flags.started, n: OC.S.chars.length, ids: OC.S.chars.map(c => c.id), intro: document.querySelector('#intro').className }));
    chk('開場與創角', st.started && st.n === 3 && new Set(st.ids).size === 3, st);
  });
  await day(p, 10.5, 'sunny'); await wait(p, 800); await shot(p, '02-hud');

  const pos = () => p.evaluate(() => { const a = OC.Sim.active(); OC.Cam.followA(a); return { x: a.sx, y: a.sy - a.ss * .6 } });
  await step('角色選單與聊天', async () => {
    await p.evaluate(() => { const a = OC.Sim.active(); if (a.task) OC.Sim.finish(a, false); a.goal = null; a.vx = a.vz = 0 }); await wait(p, 600);
    const a = await pos(); await p.mouse.click(a.x, a.y); await wait(p, 700);
    const n = await p.$$eval('.rd-b', l => l.length); await shot(p, '03-radial');
    await p.click('.rd-b[data-k=talk]'); await wait(p, 500); await p.click('.rd-b[data-k=chat]'); await wait(p, 1500);
    const ch = await p.$$eval('.choice button', l => l.length); await shot(p, '04-chat');
    if (ch) await p.click('.choice button'); await wait(p, 3000);
    chk('角色選單與聊天', n >= 4 && ch > 0, { buttons: n, choices: ch });
  });

  await step('快捷背包餵食', async () => {
    const before = await p.evaluate(() => ({ apple: OC.S.inv.apple || 0, hunger: OC.Sim.active().c.needs.hunger }));
    if (!before.apple) await p.evaluate(() => { OC.S.inv.apple = 3 });
    await p.click('#hTray'); await wait(p, 500); await shot(p, '05-tray');
    await p.click('.ti[data-id=apple]'); await wait(p, 6500);
    const after = await p.evaluate(() => ({ apple: OC.S.inv.apple || 0, hunger: OC.Sim.active().c.needs.hunger }));
    chk('快捷背包餵食（物品只扣一次）', after.apple === (before.apple || 3) - 1 && after.hunger >= before.hunger, { before, after });
  });

  await step('商店購買（連點不重複扣款）', async () => {
    await p.evaluate(() => { OC.S.coins = 5000 });
    await p.click('#nav [data-p=shop]'); await wait(p, 600); await shot(p, '06-shop');
    await p.click('.pc'); await wait(p, 500);
    const st0 = await p.evaluate(() => ({ coins: OC.S.coins, inv: JSON.stringify(OC.S.inv) }));
    await p.click('[data-buy]'); await wait(p, 900);
    const st1 = await p.evaluate(() => ({ coins: OC.S.coins, inv: OC.S.inv }));
    const inv0 = JSON.parse(st0.inv), gained = Object.keys(st1.inv).reduce((s, k) => s + Math.max(0, st1.inv[k] - (inv0[k] || 0)), 0);
    chk('商店購買（連點不重複扣款）', st1.coins < st0.coins && gained >= 1, { spent: st0.coins - st1.coins, gained });
    await p.keyboard.press('Escape'); await wait(p, 300);
  });

  await step('背包', async () => {
    await p.click('#nav [data-p=bag]'); await wait(p, 600); await shot(p, '07-bag');
    const n = await p.$$eval('.bi', l => l.length); await p.click('.bi'); await wait(p, 500); await shot(p, '08-item');
    chk('背包', n > 0 && await p.$('.sheet'), { items: n }); await p.keyboard.press('Escape'); await wait(p, 300);
  });

  await step('任務分頁切換', async () => {
    await p.evaluate(() => OC.Pages.open('life', 'quest')); await wait(p, 500); await mutStart(p);
    for (const t of ['codex', 'story', 'home', 'quest']) { await p.click(`[data-ltab=${t}]`); await wait(p, 250) }
    const m = await mutRead(p); await shot(p, '09-life');
    chk('任務分頁切換', (await p.$$('[data-ltab]')).length === 4, { mutations: m });
    await p.evaluate(() => OC.Pages.close()); await wait(p, 300);
  });

  await step('工坊繪製物品', async () => {
    await p.click('#nav [data-p=more]'); await wait(p, 500); await p.click('[data-hub=workshop]'); await wait(p, 700);
    await p.click('[data-new=item]'); await wait(p, 800);
    const bb = await (await p.$('#stCv')).boundingBox(); const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
    await p.mouse.move(cx - 60, cy); await p.mouse.down(); for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2; await p.mouse.move(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60) } await p.mouse.up();
    await p.click('[data-tool=fill]'); await p.mouse.click(cx, cy); await shot(p, '10-studio');
    await p.click('[data-done]'); await wait(p, 700); await p.fill('[data-f=name]', '星空棉花糖'); await p.click('[data-cat=food]'); await wait(p, 200);
    await p.click('[data-save]'); await wait(p, 1500); await shot(p, '11-mine');
    const cr = await p.evaluate(async () => { const it = OC.Creations.all().find(i => i.name === '星空棉花糖'); return it ? { id: it.id, img: !!(it.img && await OC.Store.Assets.get(it.img)) } : null });
    chk('工坊繪製物品（圖片存入 IndexedDB）', cr && cr.img, cr);
  });

  await step('自訂事件', async () => {
    await p.click('[data-wt=events]'); await wait(p, 400); await p.click('[data-evnew]'); await wait(p, 500);
    await p.fill('[data-e=title]', '測試事件'); await p.fill('[data-e=lines]', '好開心！'); await p.click('[data-esave]'); await wait(p, 500);
    const n = await p.evaluate(() => (OC.S.events || []).filter(e => e.title === '測試事件').length);
    chk('自訂事件', n === 1, { n }); await p.keyboard.press('Escape'); await p.evaluate(() => OC.Pages.close()); await wait(p, 400);
  });

  await step('甩動後頭暈', async () => {
    await p.evaluate(async () => { const a = OC.Sim.active(); OC.Play.pick(a); const s = { x: a.sx, y: a.sy }; let prev = { ...s };
      for (let i = 0; i < 10; i++) { const q = { x: s.x + (i % 2 ? 70 : -70), y: s.y - 30 }; OC.Play.holdMove(a, q, prev); prev = q; await new Promise(r => setTimeout(r, 30)) }
      a.held.hist = [{ x: s.x, y: s.y, t: performance.now() - 60 }, { x: s.x, y: s.y - 300, t: performance.now() }]; OC.Play.release(a) });
    await wait(p, 2200); const st = await p.evaluate(() => { const a = OC.Sim.active(); return { dizzy: a.dizzy, pose: a.pose } }); await shot(p, '12-dizzy');
    chk('甩動後頭暈', st.dizzy > 0 && st.pose === 'dizzy', st);
  });

  await step('進出屋子（門）', async () => {
    await p.evaluate(() => OC.World.go('house')); await wait(p, 1500); await shot(p, '13-house');
    const inId = await p.evaluate(() => OC.R.sc.id);
    const door = await p.evaluate(() => { const d = OC.R.pick.find(q => q.o.act === 'exit'); return d ? { x: d.x + d.w / 2, y: d.y + d.h * .3 } : null });
    if (door) { await p.mouse.click(door.x, door.y); await wait(p, 1500) }
    const outId = await p.evaluate(() => OC.R.sc.id);
    chk('進出屋子（門）', inId === 'house' && door && outId === 'home', { inId, door: !!door, outId });
  });

  await step('時間天氣切換（就地更新，不關閉重開）', async () => {
    await p.evaluate(() => OC.Pages.timeWeather()); await wait(p, 500);
    const tag = await p.evaluate(() => { const s = document.querySelector('.sheet:last-of-type'); s.__t = 1; return !!s });
    await mutStart(p);
    for (const sel of ['[data-h="18"]', '[data-w="rain"]', '[data-h="21"]', '[data-w="snow"]', '[data-h="12"]', '[data-w=""]']) { const e = await p.$(sel); if (e) { await e.click(); await wait(p, 400) } }
    const m = await mutRead(p); const same = await p.evaluate(() => { const s = document.querySelector('.sheet:last-of-type'); return !!(s && s.__t) });
    await shot(p, '14-timeweather');
    chk('時間天氣切換（就地更新，不關閉重開）', tag && same && m < 400, { sameSheet: same, mutations: m });
    await p.keyboard.press('Escape'); await wait(p, 300);
  });

  await step('閒置時畫面無 DOM 重繪', async () => {
    await mutStart(p); await wait(p, 5000); const m = await mutRead(p);
    chk('閒置時畫面無 DOM 重繪（5 秒）', m < 30, { mutations: m });
  });

  await step('深色／淺色主題', async () => {
    const bg = async () => p.evaluate(() => getComputedStyle(document.body).backgroundColor + '|' + getComputedStyle(document.querySelector('#nav')).backgroundColor);
    await p.evaluate(() => { OC.S.settings.theme = 'dark'; OC.Pages.applyTheme() }); await wait(p, 400); const d = await bg(); await p.evaluate(() => OC.Pages.settings()); await wait(p, 500); await shot(p, '15-dark');
    await p.keyboard.press('Escape'); await p.evaluate(() => { OC.S.settings.theme = 'light'; OC.Pages.applyTheme() }); await wait(p, 400); const l = await bg(); await shot(p, '16-light');
    chk('深色／淺色主題', d !== l, { dark: d, light: l });
  });

  await step('效能模式即時切換（不重新載入、角色保留）', async () => {
    await p.evaluate(() => { window.__noReload = 1; OC.R.actors.forEach(a => a.__mark = 1) });
    const out = [];
    for (const m of ['quality', 'battery', 'balanced']) {
      await p.evaluate(m => { OC.S.settings.perf = m; OC.R.resize() }, m); await wait(p, 1600);
      out.push(await p.evaluate(() => ({ perf: OC.S.settings.perf, w: OC.R.cv.width, fps: OC.Loop.fps, cap: OC.Store.perf().fps, kept: OC.R.actors.every(a => a.__mark), alive: !!window.__noReload })));
    }
    await p.evaluate(() => { OC.S.settings.perf = 'custom'; Object.assign(OC.S.settings.custom, { weather: 0, particles: 0, animDetail: 0, bgTick: .25 }); OC.R.resize() }); await wait(p, 800);
    const cu = await p.evaluate(() => { const P = OC.Store.perf(); return { weather: P.weather, anim: P.animDetail, bg: P.bgTick } });
    await p.evaluate(() => { OC.S.settings.perf = 'balanced'; OC.R.resize() });
    const widths = new Set(out.map(o => o.w));
    chk('效能模式即時切換（不重新載入、角色保留）', out.every(o => o.kept && o.alive) && widths.size >= 2 && out[1].cap === 30 && cu.weather === 0, { out, custom: cu });
  });

  await step('多角色資料獨立', async () => {
    const r = await p.evaluate(() => { const [a, b] = OC.S.chars; const bh = b.needs.hunger, bj = b.emo.joy; a.needs.hunger = 3; a.emo.joy = .01; a.coinsTest = 1;
      OC.UI.setActive(b.id);
      return { distinctObj: a.needs !== b.needs && a.emo !== b.emo, bh: b.needs.hunger === bh, bj: b.emo.joy === bj, active: OC.S.activeId === b.id } });
    chk('多角色資料獨立', r.distinctObj && r.bh && r.bj, r);
  });

  await step('重新載入後資料保留', async () => {
    const before = await p.evaluate(() => { OC.S.coins = 4321; OC.Store.flush(); return { names: OC.S.chars.map(c => c.name).join(','), active: OC.S.activeId, cr: OC.Creations.listed().length } });
    await p.reload(); await wait(p, 4500);
    const after = await p.evaluate(() => ({ names: OC.S.chars.map(c => c.name).join(','), active: OC.S.activeId, cr: OC.Creations.listed().length, coins: OC.S.coins, intro: document.querySelector('#intro').className }));
    chk('重新載入後資料保留', after.coins === 4321 && after.names === before.names && after.active === before.active && after.cr === before.cr, { before, after });
  });

  /* 給第一隻夥伴加上動畫影格（工坊角色動畫）以測試備份是否帶上實際圖片 */
  await step('完整備份（含圖片與動畫影格）', async () => {
    const r = await p.evaluate(async () => {
      const mk = col => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); g.fillStyle = col; g.fillRect(4, 4, 24, 24); return c.toDataURL() };
      const c = OC.S.chars[0]; const k1 = 'test_f1', k2 = 'test_f2'; await OC.Store.Assets.put(k1, mk('#e08')); await OC.Store.Assets.put(k2, mk('#08e'));
      c.anim = { frames: { idle: [k1, k2] }, fps: 6 }; OC.Store.flush();
      const t = await OC.Store.exportAll(); const o = JSON.parse(t);
      return { t, hasF: !!(o.assets && o.assets[k1] && o.assets[k2]), nAssets: Object.keys(o.assets || {}).length, missing: o.missing || [] }
    });
    await p.evaluate(async () => { localStorage.removeItem('ocs4.save'); localStorage.removeItem('ocs4.save.bak'); for (const k of await OC.Store.Assets.keys()) await OC.Store.Assets.del(k) });
    await p.evaluate(t => OC.Store.importAll(t).catch(e => e.message), r.t); await wait(p, 4500);
    const after = await p.evaluate(async () => { const c = OC.S.chars[0]; const cr = OC.Creations.all().find(i => i.name === '星空棉花糖');
      return { n: OC.S.chars.length, f: !!(c.anim && await OC.Store.Assets.get(c.anim.frames.idle[0])), cr: !!(cr && await OC.Store.Assets.get(cr.img)), coins: OC.S.coins } });
    chk('完整備份（含圖片與動畫影格）', r.hasF && after.f && after.cr && after.n === 3, { assets: r.nAssets, missing: r.missing, after });
  });

  await step('角色包匯出匯入（新 ID、含影格）', async () => {
    const r = await p.evaluate(async () => { const c = OC.S.chars[0]; const t = await OC.Store.exportChar(c.id); const n0 = OC.S.chars.length; const nc = await OC.Store.importChar(t); OC.S.chars.push(nc);
      const imp = OC.S.chars[OC.S.chars.length - 1]; const fk = imp.anim && imp.anim.frames.idle[0];
      return { n0, n1: OC.S.chars.length, newId: imp.id !== c.id, frameKeyNew: fk && fk !== c.anim.frames.idle[0], frameOk: !!(fk && await OC.Store.Assets.get(fk)), separateNeeds: imp.needs !== c.needs } });
    chk('角色包匯出匯入（新 ID、含影格）', r.n1 === r.n0 + 1 && r.newId && r.frameOk && r.frameKeyNew, r);
  });

  await step('每日快照還原', async () => {
    const r = await p.evaluate(async () => { OC.S.coins = 1111; OC.Store.flush(); await OC.Store.snapshot('test'); const l = await OC.Store.snapshots(); OC.S.coins = 9; OC.Store.flush(); return { k: l.find(x => x.tag === 'test').k, n: l.length } });
    await p.evaluate(k => OC.Store.restoreSnapshot(k), r.k).catch(() => {}); await wait(p, 4500);
    const c = await p.evaluate(() => OC.S.coins);
    chk('每日快照還原', c === 1111, { coins: c, snaps: r.n });
  });

  await step('存檔損毀復原（主存檔→備援→快照）', async () => {
    await p.evaluate(() => { OC.S.coins = 2222; OC.Store.flush(); OC.Store.flush() });
    await p.evaluate(() => { localStorage.setItem('ocs4.save', '{"broken'); window.onbeforeunload = null; OC.Store.flush = () => {} });
    await p.reload(); await wait(p, 4500);
    const a = await p.evaluate(() => ({ src: OC.Store.loadInfo.src, coins: OC.S.coins, n: OC.S.chars.length }));
    await p.evaluate(() => { localStorage.setItem('ocs4.save', 'xx'); localStorage.setItem('ocs4.save.bak', 'yy'); OC.Store.flush = () => {} });
    await p.reload(); await wait(p, 5000);
    const s = await p.evaluate(() => ({ src: OC.Store.loadInfo.src, n: OC.S.chars.length, started: OC.S.flags.started, corruptKept: !!localStorage.getItem('ocs4.corrupt') }));
    chk('存檔損毀復原（主存檔→備援→快照）', a.src === 'backup' && a.n >= 3 && s.src === 'snapshot' && s.n >= 3 && s.started, { backup: a, snapshot: s });
  });

  /* 舊版 3.2 遷移（獨立環境） */
  await step('3.2 舊版遷移', async () => {
    const c2 = await b.newContext({ viewport: { width: 390, height: 844 } }); const q = await c2.newPage(); watch(q);
    await q.goto(LEGACY); await wait(q, 4000);
    await q.evaluate(async () => { Cfg.v.overrides.mochi = { name: '小星星' }; Cfg.v.active = 'yuzu'; Cfg.flush(); Eco.v.coins = 777; Eco.save();
      const c = document.createElement('canvas'); c.width = 64; c.height = 96; const g = c.getContext('2d'); g.fillStyle = '#E08080'; g.fillRect(8, 8, 48, 80); const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      await DB.put({ id: 'c_custom1', uid: 'c_custom1', name: '自創小紅', blob, w: 64, h: 96, created: Date.now(), data: { pers: { sl: { lively: 80 }, traits: ['curious'] } }, look: {} }) });
    errs = errs.filter(e => !/^PAGEERR|^CONSOLE/.test(e) || true);
    const q2 = await c2.newPage(); watch(q2); await q2.goto(URL); await wait(q2, 5500); await shot(q2, '17-migrated');
    const r = await q2.evaluate(async () => { const im = OC.S.chars.find(c => c.kind === 'image'); return { names: OC.S.chars.map(c => c.name), coins: OC.S.coins, img: !!(im && await OC.Store.Assets.get(im.img)), legacyKept: !!localStorage.getItem('ocs.v1') } });
    chk('3.2 舊版遷移', r.names.includes('小星星') && r.names.includes('自創小紅') && r.coins >= 777 && r.img && r.legacyKept, r);
    await c2.close();
  });

  const pageErrs = errs.filter(e => /PAGEERR/.test(e));
  chk('整個流程無 JavaScript 錯誤', pageErrs.length === 0, pageErrs.slice(0, 5));
  const pass = results.filter(r => r.ok).length;
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ at: new Date().toISOString(), pass, total: results.length, results, errors: errs.slice(0, 40) }, null, 1));
  console.log(`\n${pass}/${results.length} 通過`); await b.close(); process.exit(pass === results.length ? 0 : 1);
})();
