/* v18 步骤3：视野比例改为宽屏 + 进入世界时提示带地区等级段 */
import { readFileSync, writeFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');
const before = src.length;

/* 1) #stage 从 1:1 改成 1.6:1（216×156 的宽地图需要宽视野，否则只看到一小条） */
const OLD = '#stage{aspect-ratio:1/1; max-height:52dvh;}';
const NEW = '#stage{aspect-ratio:1.6/1; max-height:56dvh;}';
if (!src.includes(OLD)) {
  const alt = /#stage\{aspect-ratio:1\/1;[^}]*\}/;
  if (!alt.test(src)) throw new Error('找不到 stage 比例');
  src = src.replace(alt, NEW);
  console.log('  （用正则替换了 stage 比例）');
} else { src = src.replace(OLD, NEW); }

/* 2) 进入世界时，hint 显示当前地区 + 等级段（原来只有静态文案） */
const OLD_EW = /function enterWorld\(\)\{\r?\n  \$\("screen-title"\)\.classList\.add\("hidden"\);/;
const NEW_EW = `function enterWorld(){
  $("screen-title").classList.add("hidden");`;
if (!OLD_EW.test(src)) throw new Error('找不到 enterWorld');
src = src.replace(OLD_EW, NEW_EW);
/* 在 enterWorld 的 resizeCanvas 之前插入提示刷新 */
const OLD_EW2 = /(function enterWorld\(\)\{[\s\S]*?)(  resizeCanvas\(\); updateHUD\(\); save\(\);)/;
if (!OLD_EW2.test(src)) throw new Error('找不到 enterWorld 主体');
src = src.replace(OLD_EW2, (m, head, tail) => head +
  `  /* v18：进入世界时把当前地区与等级段写进提示条 */\n` +
  `  if(typeof regionHint==="function" && typeof S!=="undefined" && S && S.pos){\n` +
  `    $("hint").textContent="当前"+REGION_NAME[regionAt(S.pos.x,S.pos.y)]+" · "+regionHint(S.pos.x,S.pos.y)+" 🏥 小屋可治疗与存取仓库";\n` +
  `  }\n` + tail);

writeFileSync(F, src, 'utf8');
console.log('写入完成：' + (before / 1024).toFixed(0) + ' KB → ' + (src.length / 1024).toFixed(0) + ' KB');
console.log('  视野比例 1.6:1: ' + (src.includes('aspect-ratio:1.6/1') ? '✅' : '❌'));
console.log('  进世界刷新提示: ' + (src.includes('进入世界时把当前地区与等级段写进提示条') ? '✅' : '❌'));
