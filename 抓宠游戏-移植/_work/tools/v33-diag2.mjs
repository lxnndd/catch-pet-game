/* 验证洛克不进化的根因：EVO 目标是否有坏引用（一条坏引用就会让 runEvoCheck 整轮中断） */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = readFileSync(ROOT + '/抓宠游戏-v12-clean.html', 'utf8');
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
const declAt = n => { const m = new RegExp('var\\s+' + n + '\\s*=').exec(src); return m ? m.index + m[0].length : -1; };
const lit = n => { const i = declAt(n); if (i < 0) throw new Error('找不到 var ' + n); return new Function('return (' + sliceLiteral(src, i) + ')')(); };
const SPECIES = lit('SPECIES'), EVO = lit('EVO');
const byId = {}; SPECIES.forEach(s => byId[s.id] = s);

console.log('══ 1. EVO 目标坏引用检查（runEvoCheck 会因它整轮中断）══');
let bad = [], badKz = [];
Object.keys(EVO).forEach(k => {
  if (!byId[k]) bad.push('源 ' + k + ' 不存在');
  const t = EVO[k].to;
  (Array.isArray(t) ? t : [t]).forEach(x => {
    if (!byId[x]) { bad.push(k + '(' + (byId[k] ? byId[k].name : k) + ') → 目标 ' + x + ' 不存在'); if (k.startsWith('kz-')) badKz.push(k); }
  });
  if (!(EVO[k].lv > 0)) bad.push('lv 非法: ' + k + ' lv=' + EVO[k].lv);
});
console.log('  坏引用共 ' + bad.length + ' 条' + (badKz.length ? '（其中洛克侧 ' + badKz.length + ' 条）' : ''));
bad.slice(0, 12).forEach(b => console.log('    ' + b));

console.log('\n══ 2. 洛克 EVO 等级分布 ══');
const kzEvo = Object.keys(EVO).filter(k => k.startsWith('kz-'));
const dist = {};
kzEvo.forEach(k => { const v = EVO[k].lv; dist[v] = (dist[v] || 0) + 1; });
Object.keys(dist).sort((a, b) => a - b).forEach(k => console.log('   lv=' + k + ' : ' + dist[k] + ' 条'));
console.log('  洛克 EVO 共 ' + kzEvo.length + ' 条 · 宝可梦侧 ' + Object.keys(EVO).filter(k => k.startsWith('pk-')).length + ' 条');

console.log('\n══ 3. 模拟 runEvoCheck（会不会抛异常）══');
function simulate() {
  const logs = [];
  try {
    const fake = kzEvo.map(k => ({ sp: k, lv: 60 }));
    fake.forEach(p => {
      const chain = EVO[p.sp];
      if (chain && p.lv >= chain.lv) {
        const arr = (chain.to instanceof Array) ? chain.to : [chain.to];
        const to = arr[0];
        const fromName = byId[p.sp].name;        /* ← 若 byId 返回 null 这里就炸 */
        logs.push(fromName + ' → ' + byId[to].name);
      }
    });
    console.log('  ✅ 全部走完，共会进化 ' + logs.length + ' 只');
    logs.slice(0, 6).forEach(l => console.log('     ' + l));
  } catch (e) {
    console.log('  ❌ 抛异常: ' + e.message);
    console.log('     → runEvoCheck 在这一只处中断，后面的宠永远不会检查到进化');
    console.log('     已经处理到: ' + logs.length + ' 只（' + logs.slice(-2).join(' / ') + '）');
  }
}
simulate();

console.log('\n══ 4. 喷火龙在 v17 数据源里的 pools（看是不是混了 TM 招）══');
try {
  const d = readFileSync(ROOT + '/_work/v17-data/poke-kanto-johto.mjs', 'utf8');
  const i = d.indexOf('喷火龙');
  if (i < 0) console.log('  数据源里找不到「喷火龙」字样');
  else {
    const seg = d.slice(Math.max(0, i - 120), i + 900);
    const m = seg.match(/pools:\s*\{[\s\S]*?\}/);
    console.log('  ' + (m ? m[0].slice(0, 700) : seg.slice(0, 500)));
  }
} catch (e) { console.log('  读取数据源失败: ' + e.message); }
