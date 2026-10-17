/* v41：把官方数据注入游戏文件
   ① MOVES：每个招式加 `desc`（PokéAPI 中文招式描述）← _work/out/move-desc.json
   ② SPECIES：每只宝可梦加 `b`（官方基础经验值 base_experience）与 `growth`（官方经验曲线名）
      ← _work/out/pokemon-meta.json（抓自 /pokemon/{id} 与 /pokemon-species/{id}）
   洛克（kz-*）没有官方数据 → 不注入，游戏内自动回落：曲线 medium、b = 种族值总和/3
   用法：node v41-inject.mjs --apply   （不加 --apply 只预演） */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v41.html';
const apply = process.argv.includes('--apply');

const DESC = JSON.parse(readFileSync(ROOT + '/_work/out/move-desc.json', 'utf8'));
const META = JSON.parse(readFileSync(ROOT + '/_work/out/pokemon-meta.json', 'utf8'));

let src = readFileSync(FILE, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');

/* 从 `var NAME=<字面量>` 里截出字面量本身（括号配对，跳过字符串内部） */
function lit(text, name) {
  const at = text.indexOf('var ' + name + '=');
  if (at < 0) throw new Error('找不到 var ' + name + '=');
  let j = text.indexOf('=', at) + 1;
  while (/\s/.test(text[j])) j++;
  const open = text[j], close = open === '[' ? ']' : '}';
  let depth = 0, inStr = false, q = '', esc = false, k = j;
  for (; k < text.length; k++) {
    const c = text[k];
    if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === q) inStr = false; continue; }
    if (c === '"' || c === "'") { inStr = true; q = c; continue; }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) { k++; break; } }
  }
  const raw = text.slice(j, k);
  return { start: j, end: k, value: new Function('return (' + raw + ')')() };
}

/* ① 招式描述 */
const mv = lit(work, 'MOVES');
let nDesc = 0, missDesc = 0;
Object.keys(mv.value).forEach(id => {
  const d = DESC[id];
  if (d && d.desc) { mv.value[id].desc = d.desc.replace(/\n/g, ''); nDesc++; }
  else missDesc++;
});
work = work.slice(0, mv.start) + JSON.stringify(mv.value) + work.slice(mv.end);
console.log('① 招式描述：注入 ' + nDesc + " 个（无官方描述 " + missDesc + ' 个，多为洛克招式）');

/* ② 物种：base_experience + growth_rate */
const sp = lit(work, 'SPECIES');
let nB = 0, nG = 0, nKz = 0;
const growthCnt = {};
sp.value.forEach(s => {
  if (/^pk-/.test(s.id)) {
    const num = String(parseInt(s.id.slice(3), 10));
    const m = META[num];
    if (m) {
      if (typeof m.b === 'number') { s.b = m.b; nB++; }
      if (m.growth) { s.growth = m.growth; nG++; growthCnt[m.growth] = (growthCnt[m.growth] || 0) + 1; }
    }
  } else if (/^kz-/.test(s.id)) { nKz++; }
});
work = work.slice(0, sp.start) + JSON.stringify(sp.value) + work.slice(sp.end);
console.log('② 物种元数据：base_experience ' + nB + ' 只 · growth ' + nG + ' 只 · 洛克未注入 ' + nKz + ' 只');
console.log('   曲线分布: ' + JSON.stringify(growthCnt));

/* 自查 */
const need = ['var MOVES=', 'var SPECIES=', '"desc":', '"growth":'];
const missing = need.filter(x => !work.includes(x));
if (missing.length) { console.error('!! 校验失败，缺: ' + missing.join(', ')); process.exit(1); }
console.log('自查通过：MOVES/SPECIES 段已更新');

if (!apply) { console.log('（未加 --apply，仅预演，未写盘）'); process.exit(0); }
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE + '（' + Buffer.byteLength(work, 'utf8') + ' 字节）');
