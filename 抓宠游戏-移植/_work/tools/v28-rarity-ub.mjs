/* v28b：究极异兽（Ultra Beast）提升到神兽档 rarity=2
   依据：PokéAPI 把异兽标为 is_legendary=false / is_mythical=false（它属于独立的 Ultra Beast 分类），
        所以 v19 用 is_legendary||is_mythical 建的名册里没有它们 —— 幻兽 23 只本来就在 r2，只有异兽漏了。
        官方究极异兽共 11 只（第七世代）：#793~#799、#803~#806。
   用户要求：异兽与幻兽、神兽使用同一档刷新概率。
   用法：node v28-rarity-ub.mjs --apply */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v28b-ubrarity.html';
const apply = process.argv.includes('--apply');
const UB = [
  ['pk-793', '虚吾伊德'], ['pk-794', '爆肌蚊'], ['pk-795', '费洛美螂'], ['pk-796', '电束木'],
  ['pk-797', '铁火辉夜'], ['pk-798', '纸御剑'], ['pk-799', '恶食大王'],
  ['pk-803', '毒贝比'], ['pk-804', '四颚针龙'], ['pk-805', '垒磊石'], ['pk-806', '砰头小丑'],
];
let work = readFileSync(FILE, 'utf8');
const before = {};
/* 现状 */
const cur = {};
UB.forEach(([id, nm]) => {
  const re = new RegExp('"id":"' + id + '"[^}]*?"rarity":(\\d+)');
  const m = work.match(re);
  if (!m) { console.error('!! 找不到 ' + id + ' ' + nm); process.exit(1); }
  cur[id] = { nm, r: +m[1] };
  before[+m[1]] = (before[+m[1]] || 0) + 1;
});
console.log('== 异兽现状 ==');
Object.keys(cur).forEach(id => console.log('  ' + id + ' ' + cur[id].nm.padEnd(6) + ' rarity=' + cur[id].r + (cur[id].r === 2 ? '  （已是神兽档）' : '  → 将改为 2')));
const todo = Object.keys(cur).filter(id => cur[id].r !== 2);
if (!todo.length) { console.log('\n全部已是 rarity=2，无需改动'); process.exit(0); }
console.log('\n需要改 ' + todo.length + ' 只');
if (!apply) { console.log('（未加 --apply，仅预演）'); process.exit(0); }
todo.forEach(id => {
  const re = new RegExp('("id":"' + id + '"[^}]*?"rarity":)(\\d+)');
  work = work.replace(re, '$1' + 2);
});
/* 校验 */
let bad = [];
todo.forEach(id => { const m = work.match(new RegExp('"id":"' + id + '"[^}]*?"rarity":(\\d+)')); if (!m || +m[1] !== 2) bad.push(id); });
if (bad.length) { console.error('!! 校验失败: ' + bad.join(',')); process.exit(1); }
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
writeFileSync(FILE, work, 'utf8');
console.log('已写入 ' + FILE + ' (' + Buffer.byteLength(work, 'utf8') + ' 字节)');
console.log('rarity=2 总数: ' + (work.match(/"rarity":2/g) || []).length + '（原 94）');
