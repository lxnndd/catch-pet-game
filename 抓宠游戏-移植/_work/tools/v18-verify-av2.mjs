/* 校验：游戏内 AVATARS 的头像与本地新 webp 是否逐张一致 */
import { readFileSync, existsSync } from 'node:fs';
import crypto from 'node:crypto';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const F = ROOT + '/抓宠游戏-v12-clean.html';
const src = readFileSync(F, 'utf8');
const i = src.indexOf('var AVATARS = {');
const end = src.indexOf('\n};', i);
const seg = src.slice(i, end + 3);
console.log('AVATARS 块 ' + (seg.length / 1024 / 1024).toFixed(2) + ' MB');
const pairs = [...seg.matchAll(/"([a-z]+-\d+)":"([A-Za-z0-9+/=]+)"/g)];
console.log('解析到 ' + pairs.length + ' 张头像');
const h = b => crypto.createHash('sha256').update(b).digest('hex').slice(0, 12);
let same = 0, diff = [], miss = 0;
for (const [, id, b64] of pairs) {
  const f = ROOT + '/_work/v17-avatars-webp/' + id + '.webp';
  if (!existsSync(f)) { miss++; continue; }
  const local = readFileSync(f);
  if (local.toString('base64') === b64) same++; else diff.push(id);
}
console.log('与本地新 webp 一致：' + same + ' · 不一致：' + diff.length + ' · 本地缺文件：' + miss);
if (diff.length) console.log('不一致的：' + diff.slice(0, 12).join(',') + (diff.length > 12 ? ' …' : ''));
/* 六尾/哈克龙 抽查 */
for (const id of ['pk-037', 'pk-148']) {
  const m = seg.match(new RegExp('"' + id + '":"([^"]+)"'));
  const local = readFileSync(ROOT + '/_work/v17-avatars-webp/' + id + '.webp');
  console.log('  ' + id + '：游戏内 ' + (m ? Buffer.from(m[1], 'base64').length : '?') + ' 字节 sha=' + (m ? h(Buffer.from(m[1], 'base64')) : '?') +
    ' · 本地 ' + local.length + ' 字节 sha=' + h(local) + (m && m[1] === local.toString('base64') ? ' ✅' : ' ❌'));
}
