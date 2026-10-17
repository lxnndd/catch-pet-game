/* v41 校验：把游戏文件里的新公式抽出来复算，并与宝可梦官方数值表逐点对账
   官方基准（52poke「经验值」条目的累积经验表）：
     快组 Lv100 = 800000 · 较快组 Lv100 = 1000000 · 慢组 Lv100 = 1250000
     较慢组 Lv50 = 117360、Lv100 = 1059860 · 最快组 Lv100 = 600000 · 最慢组 Lv100 = 1640000
     较快组 Lv1→2 = 8、Lv50→51 = 7651
   能力值官方公式：floor((2×种族值 + 个体值 + 努力值/4) × 等级/100) + 5（本作个体 31、无努力值）
   用法：node v41-verify.mjs */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const src = readFileSync(FILE, 'utf8');

function braceEnd(text, start) {
  let depth = 0, inStr = false, q = '', esc = false;
  for (let k = start; k < text.length; k++) {
    const c = text[k];
    if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === q) inStr = false; continue; }
    if (c === '"' || c === "'") { inStr = true; q = c; continue; }
    if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) return k + 1; }
  }
  return -1;
}
function litEnd(text, start) {   /* start 指向 [ 或 { */
  const open = text[start], close = open === '[' ? ']' : '}';
  let depth = 0, inStr = false, q = '', esc = false;
  for (let k = start; k < text.length; k++) {
    const c = text[k];
    if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === q) inStr = false; continue; }
    if (c === '"' || c === "'") { inStr = true; q = c; continue; }
    if (c === open) depth++; else if (c === close) { depth--; if (depth === 0) return k + 1; }
  }
  return -1;
}
function fnText(name) {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('缺函数 ' + name);
  return src.slice(i, braceEnd(src, src.indexOf('{', i)));
}
function fnTextMulti(name) {   /* 形如 `function a(...){...}` 连续多行，这里按需自行拼 */
  return fnText(name);
}
function varText(name) {
  const i = src.indexOf('var ' + name + '=');
  if (i < 0) throw new Error('缺变量 ' + name);
  const j = src.indexOf('=', i) + 1;
  return src.slice(i, litEnd(src, j));
}
function lineVar(name) {
  const m = src.match(new RegExp('var ' + name + '=[^\\n]*'));
  if (!m) throw new Error('缺变量行 ' + name);
  return m[0];
}

const parts = [
  lineVar('HP_K'),                       /* 同时拿到 HP_C / DMG_K */
  lineVar('IV'),
  varText('SPECIES'),
  fnText('statOf'), fnText('statVal'),
  fnText('hpBaseOf'), fnText('maxHpAt'),
  varText('GROWTH_FN'),
  fnText('growthOf'), fnText('expTotalOf'), fnText('expNeed'),
  fnText('baseExpOf'), fnText('expFromFoe')
];
const api = new Function(parts.join('\n') + `
  return {SPECIES:SPECIES, statVal:statVal, maxHpAt:maxHpAt, expTotalOf:expTotalOf,
          expNeed:expNeed, expFromFoe:expFromFoe, baseExpOf:baseExpOf, growthOf:growthOf, IV:IV, HP_C:HP_C};`)();

let pass = 0, fail = 0;
const ck = (name, got, want) => {
  const ok = (typeof want === 'number' && typeof got === 'number') ? Math.abs(got - want) < 1e-9 : got === want;
  if (ok) { pass++; console.log('  ✅ ' + name + '  = ' + got); }
  else { fail++; console.log('  ❌ ' + name + '  实得 ' + got + '，期望 ' + want); }
};

console.log('══ 1. 经验曲线 vs 官方累积经验表 ══');
const G = n => ({ growth: n });
ck('快组(fast) Lv100', api.expTotalOf(G('fast'), 100), 800000);
ck('较快组(medium) Lv100', api.expTotalOf(G('medium'), 100), 1000000);
ck('较快组(medium) Lv50', api.expTotalOf(G('medium'), 50), 125000);
ck('慢组(slow) Lv100', api.expTotalOf(G('slow'), 100), 1250000);
ck('较慢组(medium-slow) Lv50', api.expTotalOf(G('medium-slow'), 50), 117360);
ck('较慢组(medium-slow) Lv100', api.expTotalOf(G('medium-slow'), 100), 1059860);
ck('最快组(erratic) Lv100', api.expTotalOf(G('slow-then-very-fast'), 100), 600000);
ck('最慢组(fluctuating) Lv100', api.expTotalOf(G('fast-then-very-slow'), 100), 1640000);
console.log('  ── 单级所需 ──');
ck('较快组 Lv1→2', api.expNeed(1, G('medium')), 8);
ck('较快组 Lv50→51', api.expNeed(50, G('medium')), 7651);
ck('较慢组 Lv1→2', api.expNeed(1, G('medium-slow')), 9);
console.log('  （旧公式 10+lv*2 在 Lv50 只要 110，即官方 7651 的 1/70）');

console.log('\n══ 2. 能力值 vs 官方公式 ══');
const sp100 = { a: 100, d: 100, spa: 100, spd: 100, s: 100, hpBase: 100 };
ck('种族100 Lv50（官方 wiki 口径：个体31努力0 → 120）', api.statVal(sp100, 'a', 50), 120);
ck('种族100 Lv100', api.statVal(sp100, 'a', 100), 236);
ck('种族45 Lv50', api.statVal({ a: 45 }, 'a', 50), 65);
console.log('  （旧公式同条件 Lv50 给 645、Lv100 给 1075）');

console.log('\n══ 3. 血量公式（官方 + HP_C 补给）══');
ck('种族45 Lv1', api.maxHpAt({ hpBase: 45 }, 1), Math.floor((2 * 45 + 31) * 1 / 100) + 1 + 10 + api.HP_C);
ck('种族45 Lv50', api.maxHpAt({ hpBase: 45 }, 50), Math.floor((2 * 45 + 31) * 50 / 100) + 50 + 10 + api.HP_C);
ck('种族100 Lv50', api.maxHpAt({ hpBase: 100 }, 50), Math.floor((2 * 100 + 31) * 50 / 100) + 50 + 10 + api.HP_C);

console.log('\n══ 4. 给经验公式 vs 官方第七世代 ══');
const foe = { b: 100 };
ck('b=100 · 对手Lv25 · 我方Lv25（官方约 501）', api.expFromFoe(foe, 25, 25, false), 501);
ck('b=100 · 对手Lv50 · 我方Lv50（官方约 1001）', api.expFromFoe(foe, 50, 50, false), 1001);
ck('低等级打高等级（b=100 对手Lv50 我方Lv5）', api.expFromFoe(foe, 50, 5, false), Math.max(1, Math.round(100 * 50 / 5 * Math.pow((2 * 50 + 10) / (50 + 5 + 10), 2.5) + 1)));
ck('训练师战 ×1.5', api.expFromFoe(foe, 25, 25, true), Math.round(501 * 1.5));

console.log('\n══ 5. 实测手感：打同级野生宠升一级要几只 ══');
const rows = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 99];
console.log('   等级   本级所需经验   打一只同级(b=100)得   需要只数（medium 曲线）');
rows.forEach(lv => {
  const need = api.expNeed(lv, G('medium'));
  const got = api.expFromFoe(foe, lv, lv, false);
  console.log('   Lv' + String(lv).padStart(3) + '   ' + String(need).padStart(9) + '   ' + String(got).padStart(14) + '   ' + (need / got).toFixed(1).padStart(8));
});
const totalTo50 = (() => { let s = 0; for (let l = 1; l < 50; l++) s += api.expNeed(l, G('medium')); return s; })();
const totalTo100 = (() => { let s = 0; for (let l = 1; l < 100; l++) s += api.expNeed(l, G('medium')); return s; })();
console.log('   升到 Lv50 累计经验 ' + totalTo50 + '（旧公式累计仅 ' + (() => { let s = 0; for (let l = 1; l < 50; l++) s += 10 + l * 2; return s; })() + '）');
console.log('   升到 Lv100 累计经验 ' + totalTo100 + '（旧公式累计仅 10890）');

console.log('\n══ 6. 注入数据抽查 ══');
const byId = id => api.SPECIES.find(s => s.id === id);
[['pk-001', '妙蛙种子'], ['pk-006', '喷火龙'], ['pk-025', '皮卡丘'], ['pk-150', '超梦'], ['kz-006', '火神']].forEach(([id, nm]) => {
  const s = byId(id);
  if (!s) { fail++; console.log('  ❌ 找不到 ' + id); return; }
  console.log('  ' + id + ' ' + nm + '：b=' + (s.b === undefined ? '(无，用近似)' : s.b) + ' growth=' + (s.growth || '(无，回落 medium)') + ' → 曲线实际用 ' + api.growthOf(s) + ' · b 实际用 ' + api.baseExpOf(s));
});
const nB = api.SPECIES.filter(s => typeof s.b === 'number').length;
const nG = api.SPECIES.filter(s => s.growth).length;
ck('有 base_experience 的物种数', nB, 1025);
ck('有 growth 的物种数', nG, 1025);

const nDesc = (src.match(/"desc":/g) || []).length;
console.log('  招式带中文描述的条数（MOVES 内 "desc" 出现次数）: ' + nDesc);
if (nDesc < 500) { fail++; console.log('  ❌ 招式描述注入似乎不完整'); } else pass++;

console.log('\n═══ 结果：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fail) { console.log('失败项见上 ❌'); process.exit(1); }
