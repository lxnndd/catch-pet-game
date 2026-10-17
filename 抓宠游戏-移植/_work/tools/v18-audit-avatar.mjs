/* 头像映射审查：检查每只宠的头像文件与它的图鉴号是否对应 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const F = ROOT + '/抓宠游戏-v12-clean.html';
const src = readFileSync(F, 'utf8');
function sliceLiteral(s, i) {
  const o = s.slice(i).search(/[[{]/); const from = i + o;
  const oc = s[from], cc = oc === '[' ? ']' : '}';
  let d = 0, j = from, inStr = null, esc = false;
  for (; j < s.length; j++) { const c = s[j];
    if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"') { inStr = c; continue; }
    if (c === oc) d++; else if (c === cc) { d--; if (d === 0) { j++; break; } } }
  return s.slice(from, j);
}
const g = (n) => { const i = src.indexOf('var ' + n + '='); return i < 0 ? null : new Function('return (' + sliceLiteral(src, i + ('var ' + n + '=').length) + ')')(); };
const SP = g('SPECIES'), AV = g('AVATARS');
const D = ROOT + '/_work/v17-data/';
const nameId = JSON.parse(readFileSync(D + 'poke-name-id.json', 'utf8'));
const AV_DIR = ROOT + '/_work/v17-avatars';

/* 1) 六尾 详情 */
console.log('═══ 1. 六尾 / 哈克龙 的 id 与名称映射 ═══');
['六尾', '九尾', '哈克龙', '迷你龙', '快龙'].forEach(n => {
  const sp = SP.find(s => s.name === n);
  console.log('  ' + n.padEnd(5) + ' 物种表 id=' + (sp ? sp.id : '未找到').padEnd(8) +
    ' poke-name-id=' + (nameId[n] !== undefined ? nameId[n] : '无').toString().padEnd(6) +
    ' 头像文件=' + (sp && existsSync(AV_DIR + '/' + sp.id + '.png') ? '有' : '无'));
});

/* 2) 关键：用已知权威对照，检查 id 是否等于官方图鉴号 */
console.log('\n═══ 2. 权威图鉴号对照（物种表 id 是否等于官方图鉴号）═══');
const OFFICIAL = {
  '妙蛙种子': 1, '妙蛙草': 2, '妙蛙花': 3, '小火龙': 4, '杰尼龟': 7, '皮卡丘': 25, '六尾': 37, '九尾': 38,
  '喵喵': 52, '卡蒂狗': 58, '迷你龙': 147, '哈克龙': 148, '快龙': 149, '超梦': 150, '梦幻': 151,
  '菊草叶': 152, '火球鼠': 155, '小锯鳄': 158, '火岩鼠': 156, '木守宫': 252, '火稚鸡': 255,
  '水跃鱼': 258, '木木枭': 722, '火斑喵': 725, '球球海狮': 728, '苍响': 888, '新叶喵': 906,
};
let mismatch = [];
Object.entries(OFFICIAL).forEach(([n, id]) => {
  const sp = SP.find(s => s.name === n);
  const realNow = sp ? Number(String(sp.id).replace(/^pk-0*/, '')) : -1;
  const ok = realNow === id;
  if (!ok) mismatch.push(n + ' 物种表=' + (sp ? sp.id : '缺') + ' 官方=#' + id);
  console.log('  ' + n.padEnd(6) + '官方#' + String(id).padStart(4) + ' · 物种表 ' + String(sp ? sp.id : '缺').padEnd(8) +
    ' · poke-name-id ' + String(nameId[n] === undefined ? '无' : nameId[n]).padEnd(6) + (ok ? '✅' : '❌'));
});
console.log('\n不一致的：' + (mismatch.length ? mismatch.join(' | ') : '无'));

/* 3) 检查 poke-name-id.json 自身的错位（与官方表比） */
console.log('\n═══ 3. poke-name-id.json 的错误条目 ═══');
let badId = [];
Object.entries(OFFICIAL).forEach(([n, id]) => {
  if (nameId[n] !== undefined && nameId[n] !== id) badId.push(n + '：表里=' + nameId[n] + ' 官方=' + id);
});
console.log(badId.length ? badId.join('\n') : '  （常见名字对得上）');
/* 抽查：有没有两个名字指向同一 id（说明表串了） */
const byId = {};
Object.entries(nameId).forEach(([n, i]) => { (byId[i] = byId[i] || []).push(n); });
const dup = Object.entries(byId).filter(([i, ns]) => ns.length > 1);
console.log('同 id 多名（前 10）：' + (dup.length ? dup.slice(0, 10).map(([i, ns]) => i + '=' + ns.slice(0, 3).join('/')).join(' | ') : '无'));
console.log('poke-name-id 总条目 ' + Object.keys(nameId).length);

/* 4) 头像文件数与物种数 */
const files = readdirSync(AV_DIR).filter(f => f.endsWith('.png'));
console.log('\n═══ 4. 头像文件 ═══');
console.log('  PNG 文件 ' + files.length + ' 个 · 物种 ' + SP.length + ' 只');
const missing = SP.filter(s => !existsSync(AV_DIR + '/' + s.id + '.png'));
console.log('  物种缺头像 ' + missing.length + (missing.length ? '：' + missing.slice(0, 8).map(s => s.name + '(' + s.id + ')').join('、') : ''));
