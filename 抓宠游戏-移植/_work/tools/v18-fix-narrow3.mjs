/* 修复（宽松版）：抽出插错的窄屏规则 → 补 #dpad 闭合 → 挪到媒体查询块尾 */
import { readFileSync, writeFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');
const nl = src.includes('\r\n') ? '\r\n' : '\n';
const before = src.length;
console.log('换行符：' + (nl === '\r\n' ? 'CRLF' : 'LF'));

/* 1) 抽出错插的规则块（从中文注释到 .item-btn 那行） */
const s = src.indexOf('/* v18：窄屏把对战卡片整体压紧');
if (s < 0) throw new Error('找不到注释起点');
const itemLine = src.indexOf('.item-btn{font-size:12px; padding:5px 6px;}', s);
if (itemLine < 0) throw new Error('找不到块尾');
const blockEnd = itemLine + '.item-btn{font-size:12px; padding:5px 6px;}'.length;
const block = src.slice(s, blockEnd);
src = src.slice(0, s) + src.slice(blockEnd);
console.log('抽出规则块 ' + block.length + ' 字符');

/* 2) 补 #dpad 闭合 */
const reDpad = /#dpad\{grid-template-columns:repeat\(3,52px\); grid-template-rows:repeat\(3,52px\);\s*/;
if (reDpad.test(src)) {
  src = src.replace(reDpad, '#dpad{grid-template-columns:repeat(3,52px); grid-template-rows:repeat(3,52px);}' + nl);
  console.log('✅ #dpad 已闭合');
} else console.log('⚠️ #dpad 未匹配');

/* 3) 把规则块插到媒体查询块最后一条规则之后 */
const anchor = '.pet-row .acts{width:100%; justify-content:flex-start;}';
const ai = src.indexOf(anchor);
if (ai < 0) throw new Error('找不到锚点');
const insertAt = ai + anchor.length;
src = src.slice(0, insertAt) + nl + block.trim() + src.slice(insertAt);
console.log('✅ 规则已挪到媒体查询块尾部');

writeFileSync(F, src, 'utf8');
console.log('大小 ' + (before / 1024).toFixed(0) + ' → ' + (src.length / 1024).toFixed(0) + ' KB');
/* 校验括号平衡（粗略） */
const css = src.slice(src.indexOf('<style>'), src.indexOf('</style>'));
const open = (css.match(/\{/g) || []).length, close = (css.match(/\}/g) || []).length;
console.log('CSS 花括号：' + open + ' 开 / ' + close + ' 闭 ' + (open === close ? '✅ 平衡' : '❌ 不平衡'));
