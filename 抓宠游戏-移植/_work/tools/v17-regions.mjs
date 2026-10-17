/* v17 九地区 + 等级分配 实况调查（从游戏文件里读真实实现） */
import { readFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
const src = readFileSync(F, 'utf8');
function sliceLiteral(s, i) {
  const o = s.slice(i).search(/[[{]/); const from = i + o;
  const oc = s[from], cc = oc === '[' ? ']' : '}';
  let d = 0, j = from, inStr = null, esc = false;
  for (; j < s.length; j++) { const c = s[j];
    if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === oc) d++; else if (c === cc) { d--; if (d === 0) { j++; break; } }
  }
  return s.slice(from, j);
}
const g = (n) => { const i = src.indexOf('var ' + n + '='); return i < 0 ? null : new Function('return (' + sliceLiteral(src, i + ('var ' + n + '=').length) + ')')(); };
const SP = g('SPECIES'), MV = g('MOVES'), EVO = g('EVO'), REGION_NAME = g('REGION_NAME'), SKY_RATE = g('SKY_RATE'), TYPE_NAME = g('TYPE_NAME');
const RARITY_W = g('RARITY_W');

console.log('═══ 一、九地区的名字与代码里的定义 ═══');
console.log('REGION_NAME = ' + JSON.stringify(REGION_NAME, null, 0));
console.log('SKY_RATE（天空宠出现率，按地区）= ' + JSON.stringify(SKY_RATE));

console.log('\n═══ 二、regionAt() 的硬分区规则（源码）═══');
const i = src.indexOf('function regionAt');
console.log(src.slice(i, i + 900).split('\n').map(l => '  ' + l.trim()).filter(l => l.length > 2).join('\n'));

console.log('\n═══ 三、各地区野怪池规模（与 rollEnemy 同样的口径）═══');
const evolved = new Set(Object.values(EVO).flatMap(e => typeof e.to === 'string' ? [e.to] : (Array.isArray(e.to) ? e.to : [])));
function isEvolvedForm(s) { return evolved.has(s.id); }
const ORDER = ['plain', 'forest', 'water', 'flower', 'snow', 'mine', 'volcano', 'desert', 'ocean'];
console.log('地区'.padEnd(12) + '可遇总数  常见  稀有  传说   其中宝可梦/洛克   天空宠');
ORDER.forEach(r => {
  const pool = SP.filter(s => !isEvolvedForm(s) && !s.varOf && (s.habitat || []).indexOf(r) >= 0);
  const c = [0, 1, 2].map(k => pool.filter(s => s.rarity === k).length);
  const pk = pool.filter(s => s.pk).length, kz = pool.filter(s => s.kz).length;
  const fly = pool.filter(s => s.type === 'flying' || s.type2 === 'flying').length;
  console.log((REGION_NAME[r] || r).padEnd(10) + String(pool.length).padStart(6) + String(c[0]).padStart(7) + String(c[1]).padStart(6) + String(c[2]).padStart(6) + ('      ' + pk + ' / ' + kz).padEnd(18) + String(fly).padStart(5));
});

console.log('\n═══ 四、等级分配相关代码 ═══');
/* 找野怪等级怎么定 */
const s1 = src.indexOf('var topLv=topPartyLv();');
if (s1 > 0) console.log('startWildBattle 里：\n' + src.slice(s1, s1 + 420).split('\n').map(l => '  ' + l.trim()).filter(Boolean).join('\n'));
const s2 = src.indexOf('var maxR=topLv<8');
if (s2 > 0) console.log('\nrollEnemy 里的稀有度门控：\n' + src.slice(s2 - 120, s2 + 260).split('\n').map(l => '  ' + l.trim()).filter(Boolean).join('\n'));
/* 是否存在地区等级偏移表 */
const hasRegionLv = /REGION_LV|regionLv|地区等级/.test(src);
console.log('\n代码里是否存在「地区等级偏移表」：' + (hasRegionLv ? '有' : '没有（等级完全跟随玩家最强宠，不分地区）'));
/* 训练师等级 */
const s3 = src.indexOf('function topPartyLv');
if (s3 > 0) console.log('\ntopPartyLv：\n' + src.slice(s3, s3 + 200).split('\n').map(l => '  ' + l.trim()).filter(Boolean).join('\n'));
const s4 = src.indexOf('function beginTrainerBattle');
if (s4 > 0) {
  const seg = src.slice(s4, s4 + 700);
  const lvline = seg.split('\n').find(l => /Lv|lv/.test(l) && /foeLv|topLv|\+/.test(l));
  console.log('\n训练师队伍等级：\n  ' + (lvline || '').trim());
}
