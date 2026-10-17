/* v17 补齐宝可梦头像：按物种表里缺图的那批，从 PokéAPI sprites 下载并按「物种 id」命名
   用法: node v17-avatars-fill.mjs [--workers 5] */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const OUT = ROOT + '/_work/out/';
const AV = ROOT + '/_work/v17-avatars';
mkdirSync(AV, { recursive: true });
const WI = process.argv.indexOf('--workers'); const WORKERS = WI > 0 ? Number(process.argv[WI + 1]) : 5;

const sp = JSON.parse(readFileSync(OUT + 'species-v17.json', 'utf8'));
const nameId = JSON.parse(readFileSync(ROOT + '/_work/v17-data/poke-name-id.json', 'utf8'));
const need = sp.filter(s => s.src === 'pk' && !existsSync(AV + '/' + s.id + '.png'));
console.log('缺头像的宝可梦 ' + need.length + ' 只（按物种 id 命名）');
const noApiId = need.filter(s => !nameId[s.name]);
if (noApiId.length) console.log('⚠️ PokéAPI 查不到中文名的 ' + noApiId.length + ' 只：' + noApiId.map(s => s.name).join('、'));

const GH = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
const JSD = 'https://fastly.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon';
const JSD2 = 'https://cdn.statically.io/gh/PokeAPI/sprites/master/sprites/pokemon';
const sources = (id) => [
  GH + '/other/home/' + id + '.png', JSD + '/other/home/' + id + '.png', JSD2 + '/other/home/' + id + '.png',
  GH + '/' + id + '.png', JSD + '/' + id + '.png', JSD2 + '/' + id + '.png',
];
async function tryFetch(url, ms = 20000) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36' } });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    return buf.length > 400 ? buf : null;
  } catch (e) { return null; } finally { clearTimeout(t); }
}
let idx = 0, ok = 0, fail = [];
const t0 = Date.now();
async function worker() {
  while (idx < need.length) {
    const s = need[idx++];
    const pokeId = nameId[s.name];
    if (!pokeId) { fail.push(s.name + '(无图鉴号)'); continue; }
    let buf = null;
    for (const u of sources(pokeId)) { buf = await tryFetch(u); if (buf) break; await new Promise(r => setTimeout(r, 200)); }
    if (buf) { writeFileSync(AV + '/' + s.id + '.png', buf); ok++; }
    else fail.push(s.name + '→' + s.id + '(#' + pokeId + ')');
    if (ok % 100 === 0 && ok) console.log('  已下 ' + ok + '/' + need.length + '（' + ((Date.now() - t0) / 1000).toFixed(0) + 's）');
  }
}
await Promise.all(Array.from({ length: WORKERS }, worker));
console.log('\n补齐完成：新下 ' + ok + ' 张 · 失败 ' + fail.length);
if (fail.length) console.log('失败：' + fail.slice(0, 30).join('、') + (fail.length > 30 ? ' …' : ''));
const nowHave = sp.filter(s => existsSync(AV + '/' + s.id + '.png')).length;
console.log('总覆盖：' + nowHave + ' / ' + sp.length + ' 只');
