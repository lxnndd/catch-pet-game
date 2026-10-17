/* v17 头像改名：把「PokéAPI id / 洛克图鉴编号」命名改成「游戏物种 id」命名
   宝可梦: poke-name-id.json(中文名→pokeapi id) + 物种表(中文名→游戏id) → pk-025.png 改名为 pk-XXX.png
   洛克  : roco-name-no.json(名字→dvg编号)                                  → kz-7.png   改名为 kz-XXX.png
   用法: node v17-avatar-rename.mjs [--dry] */
import { readFileSync, writeFileSync, copyFileSync, existsSync, readdirSync, renameSync } from 'node:fs';

const HTML = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
const AV = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/v17-avatars';
const TOOLS = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/v17-data';
const DRY = process.argv.includes('--dry');

let src = readFileSync(HTML, 'utf8');
function sliceLiteral(startIdx) {
  const open = src.slice(startIdx).search(/[[{]/); const from = startIdx + open;
  const openCh = src[from], closeCh = openCh === '[' ? ']' : '}';
  let depth = 0, i = from, inStr = null, esc = false;
  for (; i < src.length; i++) { const c = src[i];
    if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === openCh) depth++; else if (c === closeCh) { depth--; if (depth === 0) { i++; break; } } }
  return src.slice(from, i);
}
const SPECIES = new Function('return (' + sliceLiteral(src.indexOf('var SPECIES=') + 'var SPECIES='.length) + ')')();
const pkNameId = JSON.parse(readFileSync(TOOLS + '/poke-name-id.json', 'utf8'));
let rocoNo = {};
if (existsSync(TOOLS + '/roco-name-no.json')) {
  try { rocoNo = JSON.parse(readFileSync(TOOLS + '/roco-name-no.json', 'utf8')); } catch (e) { }
}
console.log('物种 ' + SPECIES.length + ' · 宝可梦 id 表 ' + Object.keys(pkNameId).length + ' · 洛克编号表 ' + Object.keys(rocoNo).length);

const have = new Set(readdirSync(AV).filter(f => f.endsWith('.png')).map(f => f.replace(/\.png$/, '')));
console.log('现有头像文件 ' + have.size + ' 张');

let renamed = 0, already = 0, noSource = [], noId = [];
for (const sp of SPECIES) {
  const gameId = sp.id;
  if (have.has(gameId)) { already++; continue; }
  if (sp.pk) {
    const pokeId = pkNameId[sp.name];
    if (!pokeId) { noId.push(sp.name + '(' + gameId + ')'); continue; }
    const from = AV + '/pk-' + pokeId + '.png';
    if (!existsSync(from)) { noSource.push(sp.name + '→pk-' + pokeId); continue; }
    if (!DRY) copyFileSync(from, AV + '/' + gameId + '.png');
    renamed++;
  } else if (sp.kz) {
    const no = rocoNo[sp.name];
    if (!no) { noId.push(sp.name + '(' + gameId + ')'); continue; }
    const from = AV + '/kz-' + no + '.png';
    if (!existsSync(from)) { noSource.push(sp.name + '→kz-' + no); continue; }
    if (!DRY) copyFileSync(from, AV + '/' + gameId + '.png');
    renamed++;
  }
}
console.log('\n已按游戏 id 命名 ' + already + ' 张 · 本次复制/改名 ' + renamed + ' 张');
console.log('缺编号（名字对不上）' + noId.length + ' 只' + (noId.length ? '：' + noId.slice(0, 20).join('、') : ''));
console.log('有编号但本地无图 ' + noSource.length + ' 只' + (noSource.length ? '：' + noSource.slice(0, 20).join('、') : ''));
if (DRY) console.log('\n--dry：不改文件');

/* 统计最终覆盖 */
if (!DRY) {
  const now = new Set(readdirSync(AV).filter(f => f.endsWith('.png')).map(f => f.replace(/\.png$/, '')));
  const miss = SPECIES.filter(s => !now.has(s.id));
  console.log('\n最终：' + SPECIES.filter(s => now.has(s.id)).length + ' / ' + SPECIES.length + ' 只有头像');
  if (miss.length) console.log('缺图 ' + miss.length + ' 只：' + miss.slice(0, 30).map(s => s.name).join('、') + (miss.length > 30 ? ' …' : ''));
}
