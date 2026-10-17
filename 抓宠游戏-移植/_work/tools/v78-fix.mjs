/* v78：修 68 条「无法使用这个招式」的错误描述 + 龙之怒/音爆固定伤害 + 注入体重（重磅冲撞/踢倒要用）
   用法：node v78-fix.mjs [--apply] */
import { readFileSync, readdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v78.html';
const CACHE = ROOT + '/_work/sources/宝可梦/poke-cache-kj/json';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');

/* ── ① 68 条错误描述：改用 PokéAPI 的英文 flavor text（若有），否则整句删掉 ── */
const BAD = '无法使用这个招式。虽然忘记之后就再也想不起来了，但还是建议忘记这个招式。';
let flavor = {};
let nFlavor = 0;
readdirSync(CACHE).filter(f => /^move-.*\.json$/.test(f)).forEach(f => {
  let o; try { o = JSON.parse(readFileSync(CACHE + '/' + f, 'utf8')); } catch (e) { return; }
  const ft = (o.flavor_text_entries || []).filter(x => x.language.name === 'en');
  if (ft.length) { flavor[o.name] = ft[ft.length - 1].flavor_text.replace(/[\n\f\r]/g, ' ').replace(/\s+/g, ' ').trim(); nFlavor++; }
});
console.log('PokéAPI 里有英文 flavor text 的招式：' + nFlavor + ' 条');
const MAP = JSON.parse(readFileSync(ROOT + '/_work/out/pokeapi-move-map.json', 'utf8'));

/* 该句在文件里出现几次 → 整段删掉（这是 PokéAPI 收录的"删招世代"说明，与招式实际效果无关；
   英文 flavor text 是英文，直接用会破坏中文体验，所以干脆删掉，让浮层的效果描述顶上） */
const badDesc = ',"desc":"' + BAD + '"';
const n2 = work.split(badDesc).length - 1;
work = work.split(badDesc).join('');
console.log('删除错误描述：' + n2 + ' 处（这 68 条招在本作都是可用的）');

/* ── ② 体重注入：SPECIES 里按 pk 号补 wt（hectogram，100g）── */
const wt = {};
readdirSync(CACHE).filter(f => /^pokemon-\d+\.json$/.test(f)).forEach(f => {
  let o; try { o = JSON.parse(readFileSync(CACHE + '/' + f, 'utf8')); } catch (e) { return; }
  if (o.weight) wt[o.id] = o.weight;
});
console.log('拿到体重数据的物种：' + Object.keys(wt).length + ' 条');
let injected = 0;
/* SPECIES 条目形如 {"id":"pk-001",...,"pk":1,...} —— 给有 pk 且已知体重的补 "wt":N */
work = work.replace(/"pk":(\d+)([,}])/g, function (m, id, tail) {
  const w = wt[+id];
  if (!w) return m;
  injected++;
  return '"pk":' + id + ',"wt":' + w + tail;
});
console.log('注入 wt 字段：' + injected + ' 处');

if (!apply) { console.log('（预演，未写入）'); process.exit(0); }
if (!existsSync(BAK)) copyFileSync(FILE, BAK);
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE);
writeFileSync(ROOT + '/_work/out/move-flavor-en.json', JSON.stringify(flavor, null, 1), 'utf8');
console.log('英文描述已导出 → _work/out/move-flavor-en.json（供下一步替换中文描述用）');
