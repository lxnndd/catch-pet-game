/* 查 EVO 里 lv 非正数的 22 条原始格式 */
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
const EVO = lit('EVO'), SPECIES = lit('SPECIES');
const byId = {}; SPECIES.forEach(s => byId[s.id] = s);
let n = 0, missing = 0, zero = 0;
for (const k of Object.keys(EVO)) {
  const e = EVO[k];
  if (typeof e.lv === 'number' && e.lv > 0) continue;
  n++;
  if ('lv' in e) zero++; else missing++;
  if (n <= 6 || n > 20) {
    const to = Array.isArray(e.to) ? e.to[0] : e.to;
    console.log('  ' + (byId[k]?.name || k) + '(' + k + ') → ' + (byId[to]?.name || to) + '  RAW=' + JSON.stringify(e));
  }
}
console.log('\n合计 ' + n + ' 条：lv 字段存在但为 0 = ' + zero + ' · lv 字段缺失 = ' + missing);
/* 看 lv 字段的书写格式（有空格还是无空格） */
const i = src.indexOf('var EVO=');
console.log('\nEVO 片段前 200 字符:\n' + src.slice(i, i + 200));
