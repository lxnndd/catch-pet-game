/* 新需求前置调查：稀有度分布（谁是神兽幻兽）+ 地图/城镇现状 */
import { readFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
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
const SP = g('SPECIES');
const RARITY_W = g('RARITY_W');
console.log('=== 当前稀有度权重 ===');
console.log('RARITY_W = ' + JSON.stringify(RARITY_W));
const tot = RARITY_W.reduce((a, b) => a + b, 0);
console.log('换算概率：常见 ' + (RARITY_W[0] / tot * 100).toFixed(1) + '% · 稀有 ' + (RARITY_W[1] / tot * 100).toFixed(1) + '% · 传说 ' + (RARITY_W[2] / tot * 100).toFixed(2) + '%');

console.log('\n=== 各地区野怪池里「传说」有多少 ===');
const POOLS = ['plain', 'forest', 'water', 'flower', 'mine', 'desert', 'ocean', 'volcano', 'snow'];
const NAME = { plain: '平原', forest: '林间', water: '水畔', flower: '花海', mine: '矿洞', desert: '荒漠', ocean: '海洋', volcano: '火山', snow: '雪原' };
/* 复刻 isEvolvedForm */
const EVO = g('EVO');
const evolved = new Set();
Object.values(EVO).forEach(e => { const tos = Array.isArray(e.to) ? e.to : [e.to]; tos.forEach(t => evolved.add(t)); });
const wild = SP.filter(s => !s.varOf && !evolved.has(s.id));
console.log('可野生遭遇总数 ' + wild.length + '（排除进化形态与亚种）');
POOLS.forEach(r => {
  const pool = wild.filter(s => (s.habitat || []).includes(r));
  const c = [0, 1, 2].map(k => pool.filter(s => s.rarity === k).length);
  console.log('  ' + (NAME[r] || r).padEnd(5) + ' 池 ' + String(pool.length).padStart(4) + ' · 常见 ' + String(c[0]).padStart(4) + ' · 稀有 ' + String(c[1]).padStart(3) + ' · 传说 ' + String(c[2]).padStart(3));
});
console.log('\n=== 传说级别（rarity=2）的都有谁（前 40）===');
const leg = wild.filter(s => s.rarity === 2);
console.log('共 ' + leg.length + ' 只：' + leg.slice(0, 40).map(s => s.name).join('、') + (leg.length > 40 ? ' …' : ''));
console.log('\n=== 稀有（rarity=1）统计 ===');
console.log('共 ' + wild.filter(s => s.rarity === 1).length + ' 只');

console.log('\n=== 地图与城镇现状 ===');
const MW = 216, MH = 156;
console.log('地图 ' + MW + '×' + MH + ' = ' + (MW * MH) + ' 格');
console.log('医院数量：' + (src.match(/T\.HOSP/g) || []).length + ' 处代码引用（游戏里只有 1 座：HOSP 单点）');
console.log('是否已有「城镇/道馆/徽章」概念：' + (/城镇|道馆|徽章|gym|badge|town/i.test(src) ? '有' : '❌ 没有，需要全新设计'));
const lv = g('LV_RANGE');
console.log('LV_RANGE = ' + JSON.stringify(lv));
