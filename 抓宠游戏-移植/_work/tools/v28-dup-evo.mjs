/* 查「来路等级 lo ≥ 去路等级 nl」的矛盾进化数据 */
import { readFileSync } from 'node:fs';
const src = readFileSync('C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html', 'utf8');
function sliceLiteral(s, i) {
  const o = s.slice(i).search(/[[{]/); const from = i + o;
  const oc = s[from], cc = oc === '[' ? ']' : '}';
  let d = 0, j = from, inStr = null, esc = false;
  for (; j < s.length; j++) {
    const c = s[j];
    if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"') { inStr = c; continue; }
    if (c === oc) d++; else if (c === cc) { d--; if (d === 0) { j++; break; } }
  }
  return s.slice(from, j);
}
const lit = n => new Function('return (' + sliceLiteral(src, src.indexOf('var ' + n + '=') + ('var ' + n + '=').length) + ')')();
const SPECIES = lit('SPECIES'), EVO = lit('EVO');
const byId = {}; SPECIES.forEach(s => byId[s.id] = s);
const nm = id => (byId[id] ? byId[id].name : id);
const incoming = {};
for (const k of Object.keys(EVO)) {
  const e = EVO[k]; const lv = (typeof e.lv === 'number' && e.lv > 0) ? e.lv : 0;
  const arr = (typeof e.to === 'string') ? [e.to] : (e.to || []);
  arr.forEach(t => { (incoming[t] = incoming[t] || []).push({ from: k, lv: lv, raw: e.lv }); });
}
const bad = [];
for (const id of Object.keys(incoming)) {
  const ins = incoming[id];
  const lo = Math.min(...ins.map(x => x.lv || 32));
  const out = EVO[id];
  if (!out) continue;
  const nl = (typeof out.lv === 'number' && out.lv > 0) ? out.lv : 32;
  if (lo >= nl) bad.push({ id, lo, nl, ins, out });
}
console.log('== 矛盾条目（来路等级 ≥ 去路等级）共 ' + bad.length + ' 只 ==\n');
bad.forEach(b => {
  console.log(nm(b.id) + '(' + b.id + ')  来路 lo=' + b.lo + ' · 去路 nl=' + b.nl + '   （宝可梦实际：' + (EVO[b.id] ? '' : '') + '）');
  b.ins.forEach(x => console.log('    ← ' + nm(x.from) + ' 原始lv=' + x.raw + (x.lv ? '' : '（0 → 兜底32）')));
  const t = Array.isArray(b.out.to) ? b.out.to : [b.out.to];
  console.log('    → ' + t.map(nm).join('/') + ' 原始lv=' + b.out.lv);
  console.log('');
});
/* 附带：全库中 lo >= nl 的比例 + 三段链正常的对照 */
console.log('对比：正常三段链示例');
[['绿毛虫', '铁甲蛹', '巴大蝶'], ['妙蛙种子', '妙蛙草', '妙蛙花']].forEach(([a, b, c]) => {
  const A = SPECIES.find(s => s.name === a), B = SPECIES.find(s => s.name === b), C = SPECIES.find(s => s.name === c);
  if (A && B && C) console.log('  ' + a + ' --Lv' + EVO[A.id].lv + '--> ' + b + ' --Lv' + EVO[B.id].lv + '--> ' + c);
});
