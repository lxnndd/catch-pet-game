import { readFileSync, writeFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');
const nl = src.includes('\r\n') ? '\r\n' : '\n';
const bad = '#dpad{grid-template-columns:repeat(3,52px); grid-template-rows:repeat(3,52px);}' + nl + '}' + nl;
const good = '#dpad{grid-template-columns:repeat(3,52px); grid-template-rows:repeat(3,52px);}' + nl;
if (src.includes(bad)) { src = src.replace(bad, good); console.log('✅ 删掉了多余的 }'); }
else console.log('⚠️ 未匹配到多余括号');
writeFileSync(F, src, 'utf8');
const css = src.slice(src.indexOf('<style>'), src.indexOf('</style>'));
const o = (css.match(/\{/g) || []).length, c = (css.match(/\}/g) || []).length;
console.log('CSS 花括号 ' + o + ' 开 / ' + c + ' 闭 ' + (o === c ? '✅ 平衡' : '❌ 不平衡'));
