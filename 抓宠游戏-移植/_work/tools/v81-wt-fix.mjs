/* v81：回滚错误的体重注入（pk 字段是标志位不是图鉴号）→ 改用 id 里的数字重新注入
        顺带修：weightPower 的边界（官方是 ≤ 1/5）
   用法：node v81-wt-fix.mjs [--apply] */
import { readFileSync, readdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const CACHE = ROOT + '/_work/sources/宝可梦/poke-cache-kj/json';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');

/* ① 删掉上次注入错的 wt */
const bad = (work.match(/,"wt":\d+/g) || []).length;
work = work.replace(/,"wt":\d+/g, '');
console.log('删除上次注入的 wt：' + bad + ' 处');

/* ② 体重真值表（来自 PokéAPI pokemon.weight，单位 hg） */
const wt = {};
readdirSync(CACHE).filter(f => /^pokemon-\d+\.json$/.test(f)).forEach(f => {
  let o; try { o = JSON.parse(readFileSync(CACHE + '/' + f, 'utf8')); } catch (e) { return; }
  if (o.weight) wt[o.id] = o.weight;
});
console.log('体重真值表：' + Object.keys(wt).length + ' 条');

/* ③ 用 id 里的图鉴号重新注入：插在 "pk":1 之后（同一条目内） */
let n2 = 0;
work = work.replace(/\{"id":"pk-(\d+)",([\s\S]*?)"pk":1/g, function (m, num, mid) {
  const w = wt[+num];
  if (!w) return m;
  n2++;
  return '{"id":"pk-' + num + '",' + mid + '"pk":1,"wt":' + w;
});
console.log('按图鉴号重新注入：' + n2 + ' 处');

/* ④ weightPower 边界：官方是「≤ 1/5 → 120」 */
if (work.indexOf('if(r < 0.2) return 120;') >= 0) {
  work = work.replace('if(r < 0.2) return 120;', 'if(r <= 0.2) return 120;');
  work = work.replace('if(r < 0.25) return 100;', 'if(r <= 0.25) return 100;');
  work = work.replace('if(r < 0.33) return 80;', 'if(r <= 0.33) return 80;');
  work = work.replace('if(r < 0.5) return 60;', 'if(r <= 0.5) return 60;');
  console.log('weightPower 边界已改为 ≤（与官方一致）');
}

if (!apply) { console.log('（预演，未写入）'); process.exit(0); }
if (!existsSync(ROOT + '/抓宠游戏-v12-clean.bak-v81.html')) copyFileSync(FILE, ROOT + '/抓宠游戏-v12-clean.bak-v81.html');
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE);
