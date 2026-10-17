/* v26 提取 dvg 列表中「图 ↔ 名字」的上下文，验证编号映射 */
import { readFileSync } from 'node:fs';
const s = readFileSync('C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/out/dvg-spirits-utf8.html', 'utf8');
const txt = s.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, '|').replace(/\|+/g, '|').replace(/&nbsp;/g, ' ');
const pick = [...s.matchAll(/spirit\/300\/(\d+)-\.png/g)].map(m => m[1]);
console.log('列表中的图编号（' + pick.length + '）: ' + pick.join(','));
for (const num of pick.slice(0, 8)) {
  const i = txt.indexOf(num + '-.png');
  console.log('\n--- ' + num + ' ---');
  console.log(txt.slice(Math.max(0, i - 40), i + 260).replace(/\s+/g, ' '));
}
/* 也看看页面里有没有 JSON 数据块 */
const j = [...s.matchAll(/\{[^{}]{0,400}(?:name|spirit)[^{}]{0,400}\}/gi)].slice(0, 3);
for (const x of j) console.log('\nJSON样本: ' + x[0].slice(0, 300));
