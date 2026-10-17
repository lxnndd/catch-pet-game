/* 查 habitat 分布：有没有「全地区通吃」和属性明显不搭的宠 */
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
const SPECIES = lit('SPECIES'), LV_RANGE = lit('LV_RANGE');
const REGS = Object.keys(LV_RANGE);
console.log('九地区: ' + REGS.join(' '));
const byName = {}; SPECIES.forEach(s => byName[s.name] = s);
['绿毛虫', '铁甲蛹', '巴大蝶', '独角虫', '波波', '杰尼龟', '小火龙', '妙蛙种子'].forEach(n => {
  const s = byName[n]; if (s) console.log('  ' + n.padEnd(6) + ' habitat=[' + (s.habitat || []).join(',') + ']  属性=' + s.type + (s.type2 ? '/' + s.type2 : ''));
});
/* habitat 长度分布 */
const lenDist = {};
SPECIES.forEach(s => { const n = (s.habitat || []).length; lenDist[n] = (lenDist[n] || 0) + 1; });
console.log('\n== habitat 地区数分布 ==');
Object.keys(lenDist).sort((a, b) => a - b).forEach(n => console.log('  ' + String(n).padStart(2) + ' 个地区: ' + String(lenDist[n]).padStart(5) + ' 只'));
const allReg = SPECIES.filter(s => (s.habitat || []).length === 9);
console.log('\n== 「9 个地区全通吃」的宠: ' + allReg.length + ' 只 ==');
console.log('  ' + allReg.slice(0, 25).map(s => s.name).join('、') + (allReg.length > 25 ? ' …' : ''));
/* 火山/雪原/海洋里的属性分布，看有没有明显违和的 */
const TYPE_CN = { nor: '一般', fire: '火', water: '水', grass: '草', elec: '电', ice: '冰', fight: '格斗', poison: '毒', ground: '地面', flying: '飞行', psychic: '超能', bug: '虫', rock: '岩石', ghost: '幽灵', dragon: '龙', dark: '恶', steel: '钢', fairy: '妖精' };
['volcano', 'snow', 'ocean'].forEach(reg => {
  const pool = SPECIES.filter(s => (s.habitat || []).indexOf(reg) >= 0);
  const tc = {}; pool.forEach(s => { const t = s.type; tc[t] = (tc[t] || 0) + 1; });
  const top = Object.keys(tc).sort((a, b) => tc[b] - tc[a]).map(k => (TYPE_CN[k] || k) + ':' + tc[k]).join(' ');
  console.log('\n' + reg + ' 栖息宠 ' + pool.length + ' 只，属性分布: ' + top);
  const bug = pool.filter(s => s.type === 'bug' || s.type2 === 'bug');
  const wat = pool.filter(s => s.type === 'water' || s.type2 === 'water');
  if (bug.length) console.log('    其中虫系 ' + bug.length + ' 只: ' + bug.slice(0, 10).map(s => s.name).join('、'));
  if (reg === 'volcano' && wat.length) console.log('    其中水系 ' + wat.length + ' 只: ' + wat.slice(0, 10).map(s => s.name).join('、'));
});
