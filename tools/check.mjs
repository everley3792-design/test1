// 靜態檢查：語法、模組清單完整、同一物件內重複定義的方法、建置輸出
// 執行：node tools/check.mjs（失敗時 exit code 1）
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
import { ORDER } from './build.mjs';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const srcDir = path.join(root, 'web/src');
const KW = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'with']);
let bad = 0; const warn = []; const log = (ok, m) => { console.log((ok ? 'ok   ' : 'FAIL ') + m); if (!ok) bad++ };

// 1) 每個模組可被解析
for (const f of ORDER) {
  const code = fs.readFileSync(path.join(srcDir, f), 'utf8');
  try { new vm.Script(code, { filename: f }); } catch (e) { log(false, `${f}: ${e.message}`); continue }
  // 2) 同一個物件字面量（const X={ … }）裡，同名方法只能出現一次（後者會靜默覆蓋前者）
  let cur = null, seen = new Map();
  code.split('\n').forEach((line, i) => {
    const o = line.match(/^(?:const|let|var)\s+(\w+)\s*=\s*\{/) || line.match(/^(?:OC\.\w+)\s*=\s*\{/);
    if (o) { cur = o[1] || line; seen = new Map() } else if (/^\}/.test(line)) cur = null;
    const m = cur && line.match(/^ (?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/);
    if (m && !KW.has(m[1])) { if (seen.has(m[1])) warn.push(`${f}:${i + 1} ${cur}.${m[1]} 重複定義（第一次在第 ${seen.get(m[1])} 行）`); else seen.set(m[1], i + 1) }
  });
}
log(true, `語法檢查 ${ORDER.length} 個模組`);

// 3) web/src 下每個 .js 都在建置清單內（避免寫了卻沒被打包）
const all = []; const walk = d => { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) walk(p); else if (n.endsWith('.js')) all.push(path.relative(srcDir, p)) } }; walk(srcDir);
const missing = all.filter(f => !ORDER.includes(f));
log(missing.length === 0, missing.length ? `未列入建置：${missing.join(', ')}` : '所有模組都已列入建置清單');

// 4) 重複方法
log(warn.length === 0, warn.length ? `重複的方法定義：\n  ${warn.join('\n  ')}` : '沒有重複的方法定義');

// 5) 建置輸出（匯入 build.mjs 時已重新建置）
const out = fs.readFileSync(path.join(root, 'dist/oc-shimeji.html'), 'utf8');
log(ORDER.every(f => out.includes(`data-src="${f}"`)), 'dist/oc-shimeji.html 包含所有模組');
const aw = path.join(root, 'android/app/src/main/assets/web/index.html');
log(!fs.existsSync(aw) || fs.readFileSync(aw, 'utf8') === out, 'Android assets 與 dist 一致');
console.log(bad ? `\n${bad} 項失敗` : '\n全部通過'); process.exit(bad ? 1 : 0);
