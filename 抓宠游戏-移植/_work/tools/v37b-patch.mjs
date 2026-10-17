/* v37b：①cat=变化的招式威力清零（如洛克「清醒」带 power 70 但其实是变化技）
         ②applyMove 改按 cat 判断变化技（原来只看 !mv.power）
   用法：node v37b-patch.mjs --apply */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v37b.html';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const done = [];
const rep = (a, b, tag) => {
  if (!work.includes(a)) { console.error('  !! 找不到锚点: ' + tag); process.exit(1); }
  work = work.replace(a, b); done.push(tag); console.log('  [改动] ' + tag);
};

/* ① 变化技威力清零 */
{
  const key = 'var MOVES=';
  const at = work.indexOf(key);
  const head = at + key.length;
  const from = head + work.slice(head).search(/[[{]/);
  let d = 0, j = from, q = null, esc = false;
  for (; j < work.length; j++) {
    const c = work[j];
    if (q) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === q) q = null; continue; }
    if (c === '"') { q = c; continue; }
    if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { j++; break; } }
  }
  const MOVES = new Function('return (' + work.slice(from, j) + ')')();
  let n = 0;
  const names = [];
  Object.keys(MOVES).forEach(id => {
    const mv = MOVES[id];
    if (mv.cat === '变化' && mv.power) { if (names.length < 8) names.push(mv.name + '(威力' + mv.power + ')'); mv.power = 0; n++; }
  });
  console.log('  [改动] cat=变化 但带威力的招式清零: ' + n + ' 个');
  if (names.length) console.log('     ' + names.join('、'));
  work = work.slice(0, from) + JSON.stringify(MOVES) + work.slice(j);
  done.push('变化技威力清零');
}

/* ② applyMove 按 cat 判断 */
rep('  if(!mv.power){',
  '  if(mv.cat === "变化" || !mv.power){   /* v37b：以分类为准（有些变化技带残留威力值） */',
  'applyMove 按分类判断变化技');
/* 招式筛选里也用到 !power 的地方一并兼容 */
rep('    var edgeTxt = mv.power<=0 ? " · 🔮变化技" : (edge>1.2?" · ✅克它":(edge<1?" · ⛔抵抗":""));',
  '    var edgeTxt = (mv.power<=0 || mv.cat==="变化") ? " · 🔮变化技" : (edge>1.2?" · ✅克它":(edge<1?" · ⛔抵抗":""));',
  '战斗按钮的变化技标记');
/* 敌方选招时排除变化技（原来按 power>0 判断，现在补上 cat） */
rep('  var usable=Object.keys(B.ePP).filter(function(id){return B.ePP[id]>0 && MOVES[id];});',
  '  var usable=Object.keys(B.ePP).filter(function(id){return B.ePP[id]>0 && MOVES[id] && MOVES[id].cat!=="变化";});   /* v37b：AI 不放空招 */',
  '敌方 AI 选招排除变化技');

const need = ['if(mv.cat === "变化" || !mv.power){', 'mv.cat==="变化"', 'MOVES[id].cat!=="变化"'];
need.forEach(n => { if (!work.includes(n)) { console.error('!! 校验失败，缺: ' + n); process.exit(1); } });
console.log('\n共 ' + done.length + ' 项改动' + (apply ? '' : '（未加 --apply，仅预演）'));
if (!apply) process.exit(0);
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE);
