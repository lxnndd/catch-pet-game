/* v17 按新编号补齐缺头像的物种（洛克用 dvg 编号直取；宝可梦用图鉴号）
   用法: node v17-avatars-fix.mjs [--workers 4] */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const OUT = ROOT + '/_work/out/';
const AV = ROOT + '/_work/v17-avatars';
mkdirSync(AV, { recursive: true });
const WI = process.argv.indexOf('--workers'); const WORKERS = WI > 0 ? Number(process.argv[WI + 1]) : 4;

const sp = JSON.parse(readFileSync(OUT + 'species-v17.json', 'utf8'));
const rocoNo = JSON.parse(readFileSync(ROOT + '/_work/v17-data/roco-name-no.json', 'utf8'));
const need = sp.filter(s => !existsSync(AV + '/' + s.id + '.png'));
console.log('缺头像 ' + need.length + ' 只');
console.log('  洛克 ' + need.filter(s => s.src === 'kz').length + ' · 宝可梦 ' + need.filter(s => s.src === 'pk').length);

async function fetchImg(url, referer) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 20000);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120', ...(referer ? { Referer: referer } : {}) } });
    if (!r.ok) return null;
    const b = Buffer.from(await r.arrayBuffer());
    return b.length > 500 ? b : null;
  } catch (e) { return null; } finally { clearTimeout(t); }
}
let idx = 0, ok = 0, fail = [];
async function worker() {
  while (idx < need.length) {
    const s = need[idx++];
    let buf = null;
    if (s.src === 'kz') {
      /* 用索引表里的编号（最可靠），退化到物种 id 里的数字 */
      let no = rocoNo[s.name];
      if (!no) no = Number(String(s.id).replace(/^kz-0*/, '')) || null;
      if (no) {
        for (let i = 0; i < 3 && !buf; i++) {
          buf = await fetchImg('https://roco.dvg.cn/dbsource/spirit/300/' + no + '-.png', 'https://roco.dvg.cn/spirits.php');
          if (!buf) await new Promise(r => setTimeout(r, 400));
        }
      }
      if (!buf) fail.push(s.name + '(' + s.id + (no ? ' #' + no : ' 无编号') + ')');
    } else {
      const pokeId = Number(String(s.id).replace(/^pk-0*/, '')) || null;
      if (pokeId && pokeId < 2000) {
        for (const u of [
          'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/' + pokeId + '.png',
          'https://fastly.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/home/' + pokeId + '.png',
          'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' + pokeId + '.png',
        ]) { buf = await fetchImg(u); if (buf) break; }
      }
      if (!buf) fail.push(s.name + '(' + s.id + ')');
    }
    if (buf) { writeFileSync(AV + '/' + s.id + '.png', buf); ok++; }
  }
}
await Promise.all(Array.from({ length: WORKERS }, worker));
console.log('\n补齐 ' + ok + ' 张 · 失败 ' + fail.length);
if (fail.length) console.log('失败：' + fail.slice(0, 40).join('、') + (fail.length > 40 ? ' …' : ''));
const nowMiss = sp.filter(s => !existsSync(AV + '/' + s.id + '.png'));
console.log('仍缺 ' + nowMiss.length + ' 只' + (nowMiss.length ? '：' + nowMiss.map(s => s.name + '(' + s.id + ')').slice(0, 20).join('、') : ' ✅ 全齐'));
