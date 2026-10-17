/* 排查两个系统性问题：
   A. 洛克王国宠物不会进化
   B. 喷火龙（及"通病"）技能表多出 wiki 没有的招式 */
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
const SPECIES = lit('SPECIES'), EVO = lit('EVO'), MOVES = lit('MOVES');
const byId = {}; SPECIES.forEach(s => byId[s.id] = s);

/* ══ A. 洛克进化 ══ */
const kz = SPECIES.filter(s => s.id.startsWith('kz-'));
const pk = SPECIES.filter(s => s.id.startsWith('pk-'));
const evoKeys = Object.keys(EVO);
const evoKz = evoKeys.filter(k => k.startsWith('kz-'));
console.log('══ A. 进化链覆盖 ══');
console.log('  物种: 宝可梦 ' + pk.length + ' · 洛克 ' + kz.length);
console.log('  EVO 条目: ' + evoKeys.length + '（其中源自洛克的 ' + evoKz.length + '）');
console.log('  洛克里有进化目标的: ' + kz.filter(s => EVO[s.id]).length + ' / ' + kz.length);
/* 洛克被指向（= 是进化形态）的数量 */
const evoTo = new Set();
evoKeys.forEach(k => { const t = EVO[k].to; (Array.isArray(t) ? t : [t]).forEach(x => evoTo.add(x)); });
console.log('  洛克中属于"进化形态"的: ' + kz.filter(s => evoTo.has(s.id)).length);
console.log('\n  洛克样例（前 8 只）:');
kz.slice(0, 8).forEach(s => {
  const e = EVO[s.id];
  const to = e ? ((Array.isArray(e.to) ? e.to : [e.to]).map(t => (byId[t] ? byId[t].name : t)).join('/') + ' Lv.' + e.lv) : '（无进化目标）';
  console.log('    ' + s.id + ' ' + s.name.padEnd(8) + ' → ' + to);
});

/* ══ B. 喷火龙技能表 ══ */
console.log('\n══ B. 喷火龙技能表 ══');
const char = SPECIES.find(s => s.name === '喷火龙');
if (!char) console.log('  找不到喷火龙');
else {
  const WIKI = { '空气之刃': 0, '抓': 0, '叫声': 0, '火花': 0, '烟幕': 0, '热风': 0, '龙爪': 0, '龙息': 12, '火焰牙': 19, '劈开': 24, '喷射火焰': 30, '可怕面孔': 39, '火焰旋涡': 46, '烈火深渊': 54, '闪焰冲锋': 62 };
  const got = {};
  ['p0', 'p15', 'p25', 'p35', 'p45', 'p55', 'p65'].forEach(pk2 => {
    ((char.pools || {})[pk2] || []).forEach(id => { if (MOVES[id]) got[MOVES[id].name] = pk2; });
  });
  const names = Object.keys(got);
  console.log('  游戏里共 ' + names.length + ' 招:');
  names.forEach(n => { const mv = Object.values(MOVES).find(m => m.name === n); console.log('    [' + got[n] + '] ' + n.padEnd(10) + ' 威力' + String(mv.power).padStart(4) + ' PP' + mv.pp); });
  const extra = names.filter(n => !(n in WIKI));
  const miss = Object.keys(WIKI).filter(n => !(n in got));
  console.log('\n  比 wiki(第九世代) 多出来的: ' + extra.length + ' 个 → ' + (extra.join('、') || '无'));
  console.log('  wiki 有但游戏没有的: ' + miss.length + ' 个 → ' + (miss.join('、') || '无'));
}
/* ══ C. PP 全局情况 ══ */
const ppDist = {};
Object.keys(MOVES).forEach(k => { const v = MOVES[k].pp; ppDist[v] = (ppDist[v] || 0) + 1; });
console.log('\n══ C. 招式 PP 分布 ══');
console.log('  ' + Object.keys(ppDist).sort((a, b) => a - b).map(k => 'PP' + k + '×' + ppDist[k]).join('  '));
/* ══ D. 变化技效果覆盖 ══ */
const noPower = Object.keys(MOVES).filter(k => !MOVES[k].power);
let fx = 0;
try { const fxOf = new Function('MOVES', 'MOVE_FX', 'FX_BY_TYPE', 'return ' + sliceLiteral(src, declAt('MOVE_FX')))(MOVES); } catch (e) { }
console.log('\n══ D. 变化技 ══');
console.log('  无威力（变化技）共 ' + noPower.length + ' 个');
