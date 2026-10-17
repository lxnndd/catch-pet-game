/* v17 洛克头像下载（用全量编号表精确匹配，直接按游戏物种 id 命名）
   源: https://roco.dvg.cn/dbsource/spirit/300/{dvg编号}-.png
   输出: _work/v17-avatars/{游戏物种id}.png
   用法: node v17-roco-avatars.mjs [--workers 4] */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const AV = ROOT + '/_work/v17-avatars';
mkdirSync(AV, { recursive: true });
const WI = process.argv.indexOf('--workers'); const WORKERS = WI > 0 ? Number(process.argv[WI + 1]) : 4;

const noMap = JSON.parse(readFileSync(ROOT + '/_work/v17-data/roco-name-no.json', 'utf8'));
console.log('编号表 ' + Object.keys(noMap).length + ' 个名字');

/* 游戏里的洛克物种 */
const src = readFileSync(ROOT + '/抓宠游戏-v12-clean.html', 'utf8');
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
const kz = SPECIES.filter(s => s.kz);
console.log('游戏里的洛克物种 ' + kz.length + ' 只');

const DVG = 'https://roco.dvg.cn/dbsource/spirit/300/';
async function get(url, ms = 20000) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ac.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Referer': 'https://roco.dvg.cn/spirits.php',
        'Accept': 'image/avif,image/webp,image/png,*/*',
      },
    });
    if (!r.ok) return { ok: false, status: r.status };
    const buf = Buffer.from(await r.arrayBuffer());
    return buf.length > 500 ? { ok: true, buf } : { ok: false, status: 'tiny' };
  } catch (e) { return { ok: false, err: String(e.message).slice(0, 40) }; }
  finally { clearTimeout(t); }
}
async function getRetry(url, n = 3) {
  for (let i = 0; i < n; i++) {
    const r = await get(url);
    if (r.ok) return r;
    await new Promise(x => setTimeout(x, 300 + i * 600));
  }
  return { ok: false };
}

let idx = 0, ok = 0, skip = 0, fail = [];
const t0 = Date.now();
async function worker() {
  while (idx < kz.length) {
    const sp = kz[idx++];
    const out = AV + '/' + sp.id + '.png';
    if (existsSync(out)) { skip++; continue; }
    /* 优先用索引表，其次用物种自带的 kzNo */
    let no = noMap[sp.name];
    if (!no && sp.kzNo) no = Number(String(sp.kzNo).replace(/^0+/, ''));
    if (!no) { fail.push(sp.name + '(无编号)'); continue; }
    const r = await getRetry(DVG + no + '-.png', 3);
    if (r.ok) { writeFileSync(out, r.buf); ok++; }
    else fail.push(sp.name + '(#' + no + ')');
    if ((ok + fail.length) % 30 === 0) console.log('  进度 ' + (ok + fail.length) + '/' + kz.length + '，已下 ' + ok + '（' + ((Date.now() - t0) / 1000).toFixed(0) + 's）');
  }
}
await Promise.all(Array.from({ length: WORKERS }, worker));
console.log('\n洛克头像：新下 ' + ok + ' 张 · 已有 ' + skip + ' 张 · 失败 ' + fail.length);
if (fail.length) console.log('失败：' + fail.slice(0, 40).join('、') + (fail.length > 40 ? ' …' : ''));
const total = kz.filter(s => existsSync(AV + '/' + s.id + '.png')).length;
console.log('覆盖率：' + total + ' / ' + kz.length + ' 只洛克有头像');
