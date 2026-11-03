// 將 web/src 的模組依序內嵌成單一 HTML（瀏覽器可直接開啟、Android WebView 載入）
import fs from 'node:fs';import path from 'node:path';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const src=p=>path.join(root,'web/src',p);
export const ORDER=['core/util.js','art/cat-svg.js','sim/legacy-data.js','sim/content.js','core/store.js','sim/chars.js','world/env.js','art/sprites.js','world/scenes.js','world/renderer.js','art/rig.js','sim/actions.js','sim/sim.js','sim/social.js','game/quests.js','game/play.js','core/native.js','ui/ui.js','ui/pages.js','ui/editor.js','ui/intro.js','core/main.js'];
const shell=fs.readFileSync(src('shell.html'),'utf8');
const css=fs.readFileSync(src('style.css'),'utf8');
const js=ORDER.map(f=>`<script data-src="${f}">\n${fs.readFileSync(src(f),'utf8').replace(/<\/script/gi,'<\\/script')}\n</script>`).join('\n');
const out=shell.replace('<!--STYLE-->',()=>`<style>\n${css}\n</style>`).replace('<!--SCRIPTS-->',()=>js);
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
fs.writeFileSync(path.join(root,'dist/oc-shimeji.html'),out);
const dev=shell.replace('<!--STYLE-->','<link rel="stylesheet" href="src/style.css">').replace('<!--SCRIPTS-->',()=>ORDER.map(f=>`<script src="src/${f}"></script>`).join('\n'));
fs.writeFileSync(path.join(root,'web/index.html'),dev);
const aDir=path.join(root,'android/app/src/main/assets/web');
if(fs.existsSync(path.join(root,'android/app/src/main'))){fs.mkdirSync(aDir,{recursive:true});fs.writeFileSync(path.join(aDir,'index.html'),out)}
console.log('built dist/oc-shimeji.html',(out.length/1024).toFixed(1)+'KB');
