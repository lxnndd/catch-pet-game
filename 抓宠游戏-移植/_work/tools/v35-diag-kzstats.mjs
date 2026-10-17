/* 对比洛克宠的「真实六维」与「游戏内数值」，验证用户的换算规则：洛克值 × 0.85 ≈ 宝可梦值 */
import { readFileSync, existsSync } from 'node:fs';
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
const SPECIES = new Function('return (' + sliceLiteral(src, declAt('SPECIES')) + ')')();
const byId = {}; SPECIES.forEach(s => byId[s.id] = s);

console.log('══ 1. 游戏里火神(kz-006) 的数值 ══');
const god = byId['kz-006'];
if (!god) console.log('  找不到 kz-006');
else console.log('  ' + JSON.stringify({ id: god.id, name: god.name, hpBase: god.hpBase, a: god.a, d: god.d, spa: god.spa, spd: god.spd, s: god.s, type: god.type, note: god.note ? String(god.note).slice(0, 80) : '' }));

console.log('\n══ 2. 洛克数据源里的真实数值 ══');
const rocoPath = ROOT + '/_work/v17-data/roco.mjs';
if (!existsSync(rocoPath)) console.log('  找不到 roco.mjs');
else {
  const mod = await import('file:///' + rocoPath.replace(/\\/g, '/').replace(/^\/+/, ''));
  const arr = mod.default || mod.ROCO || mod.list || Object.values(mod).find(v => Array.isArray(v));
  console.log('  数据源条数: ' + (arr ? arr.length : 0) + ' · 导出字段: ' + Object.keys(mod).join(', '));
  if (arr && arr.length) {
    console.log('  首条结构: ' + JSON.stringify(arr[0]).slice(0, 300));
    const huoshen = arr.find(x => x.n === '火神') || arr.find(x => x.n && x.n.indexOf('火神') >= 0);
    if (huoshen) console.log('\n  火神原始: ' + JSON.stringify({ n: huoshen.n, hp: huoshen.hp, atk: huoshen.atk, def: huoshen.def, spa: huoshen.spa, spd: huoshen.spd, spe: huoshen.spe, kzStats: huoshen.kzStats }));
    else console.log('  没找到「火神」，前 5 个名字: ' + arr.slice(0, 5).map(x => x.n).join('、'));
    /* 全量统计：游戏值 vs 真实值×0.85 的差距 */
    let n = 0, sumDiff = 0, samples = [];
    arr.forEach(o => {
      const g = byId['kz-' + String(o.kzNo || '').padStart(3, '0')] || SPECIES.find(s => s.name === o.n);
      if (!g) return;
      const pairs = [['hpBase', o.hp], ['a', o.atk], ['d', o.def], ['spa', o.spa], ['spd', o.spd], ['s', o.spe]];
      let d = 0;
      pairs.forEach(([k, v]) => { if (typeof v === 'number') d += Math.abs((g[k] || 0) - Math.round(v * 0.85)); });
      n++; sumDiff += d;
      if (samples.length < 6 && d > 100) samples.push(o.n + ' 游戏(' + pairs.map(([k]) => g[k]).join(',') + ') vs ×0.85(' + pairs.map(([, v]) => Math.round(v * 0.85)).join(',') + ') 差' + d);
    });
    console.log('\n  对比 ' + n + ' 只：六维与「真实值×0.85」的平均总偏差 = ' + (n ? (sumDiff / n).toFixed(0) : '-'));
    console.log('  偏差较大的样例:');
    samples.forEach(s => console.log('    ' + s));
  }
}
