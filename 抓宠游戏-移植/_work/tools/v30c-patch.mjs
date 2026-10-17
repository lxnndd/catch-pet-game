/* v30c：按用户澄清修正 —— 治疗按钮应该在「医院面板」的右上角，不是主界面
   ①撤掉 v30 加在 HUD 的「🏥 治疗」按钮
   ②在医院面板 modal-head（右上角）加常驻「🛏 全队治疗」按钮，不随内容滚动
   用法：node v30c-patch.mjs --apply */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v30c.html';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const done = [];
const rep = (a, b, tag) => {
  if (!work.includes(a)) { console.error('  !! 找不到锚点: ' + tag); process.exit(1); }
  work = work.replace(a, b); done.push(tag); console.log('  [改动] ' + tag);
};

/* ① 撤掉主界面 HUD 上那个加错的按钮 */
const hudBtnRe = /[ \t]*<button class="btn-sm healfix" id="btn-heal">[^<]*<\/button>[ \t]*\r?\n?/;
if (hudBtnRe.test(work)) { work = work.replace(hudBtnRe, ''); done.push('撤掉主界面「🏥 治疗」按钮（位置加错）'); console.log('  [改动] 撤掉主界面治疗按钮'); }
else console.log('  [跳过] 主界面治疗按钮已不存在');

/* ② 医院面板右上角加常驻「全队治疗」 */
rep(
  '<div class="modal-head"><h2>🏥 宠物医院 <span id="hosp-coins"></span></h2><button class="x-btn" data-close="panel-hosp">✕</button></div>',
  '<div class="modal-head"><h2>🏥 宠物医院 <span id="hosp-coins"></span></h2><button class="btn-sm healfix" id="hosp-heal-all" title="全队（含仓库）满血 + PP 全满 + 清异常，免费">🛏 全队治疗</button><button class="x-btn" data-close="panel-hosp">✕</button></div>',
  '医院面板右上角新增常驻「🛏 全队治疗」按钮');

/* ③ 绑定（把原来绑到主界面按钮的监听改到医院面板按钮） */
const bindOld = 'if($("btn-heal")) $("btn-heal").addEventListener("click",quickHealAll);   /* v30：右上角常驻治疗 */';
if (work.includes(bindOld)) {
  work = work.replace(bindOld,
    '/* v30c：治疗按钮改到医院面板右上角；点完顺手刷新面板上的金币与按钮状态 */\n' +
    'if($("hosp-heal-all")) $("hosp-heal-all").addEventListener("click",function(){\n' +
    '  quickHealAll();\n' +
    '  if($("panel-hosp") && !$("panel-hosp").classList.contains("hidden")) openHospital();\n' +
    '});');
  done.push('治疗按钮监听改到医院面板'); console.log('  [改动] 绑定改到医院面板按钮');
} else if (work.includes('if($("hosp-heal-all"))')) {
  console.log('  [跳过] 绑定已改过');
} else {
  /* 兜底：直接追加绑定 */
  work = work.replace('$("tab-treat").addEventListener("click",function(){ setHospTab("treat"); });',
    '$("tab-treat").addEventListener("click",function(){ setHospTab("treat"); });\n' +
    'if($("hosp-heal-all")) $("hosp-heal-all").addEventListener("click",function(){ quickHealAll(); if($("panel-hosp") && !$("panel-hosp").classList.contains("hidden")) openHospital(); });');
  done.push('追加医院面板治疗按钮绑定（兜底路径）'); console.log('  [改动] 追加绑定（兜底）');
}

/* 校验 */
if (work.includes('id="btn-heal"')) { console.error('!! 主界面按钮仍在'); process.exit(1); }
if (!work.includes('id="hosp-heal-all"')) { console.error('!! 医院面板按钮没加上'); process.exit(1); }
if (!work.includes('$("hosp-heal-all").addEventListener')) { console.error('!! 绑定没生效'); process.exit(1); }
console.log('\n共 ' + done.length + ' 项改动' + (apply ? '' : '（未加 --apply，仅预演）'));
if (!apply) process.exit(0);
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE);
