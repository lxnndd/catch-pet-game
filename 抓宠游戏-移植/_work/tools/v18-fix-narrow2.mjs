/* 修复上一次插错位置：把 #dpad 规则闭合，并把窄屏规则挪到正确位置（媒体查询块内、其他规则之后） */
import { readFileSync, writeFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');
const before = src.length;

/* 1) 把我上次插进 #dpad 规则里的那批规则整段抽出 */
const startMark = '\n/* v18：窄屏把对战卡片整体压紧，保证球/换宠/逃跑都在一屏内 */';
const endMark = '.item-btn{font-size:12px; padding:5px 6px;}\n';
const s = src.indexOf(startMark);
const e = src.indexOf(endMark);
if (s > 0 && e > s) {
  const block = src.slice(s, e + endMark.length);
  src = src.slice(0, s) + '\n' + src.slice(e + endMark.length);
  console.log('已抽出插错的窄屏规则（' + block.length + ' 字符）');
  /* 2) 补回被截断的 #dpad 规则闭合括号 */
  const dpadRe = /#dpad\{grid-template-columns:repeat\(3,52px\); grid-template-rows:repeat\(3,52px\);\s*\n/;
  if (dpadRe.test(src)) {
    src = src.replace(dpadRe, '#dpad{grid-template-columns:repeat(3,52px); grid-template-rows:repeat(3,52px);}\n');
    console.log('✅ #dpad 规则已补回闭合');
  } else console.log('⚠️ #dpad 未匹配（可能已闭合）');
  /* 3) 把窄屏规则插到媒体查询块的最后一条规则之后 */
  const anchor = '.pet-row .acts{width:100%; justify-content:flex-start;}';
  const ai = src.indexOf(anchor);
  if (ai > 0) {
    src = src.slice(0, ai + anchor.length) + '\n' + block.trimEnd() + src.slice(ai + anchor.length);
    console.log('✅ 窄屏规则已挪到媒体查询块尾部');
  } else console.log('⚠️ 未找到锚点 .pet-row .acts');
} else { console.log('❌ 找不到上次插入的规则块'); }

writeFileSync(F, src, 'utf8');
console.log('大小 ' + (before / 1024).toFixed(0) + ' → ' + (src.length / 1024).toFixed(0) + ' KB');
