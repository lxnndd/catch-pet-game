/* v41：抓 PokéAPI 的两项官方元数据
   ① /pokemon/{id}        → base_experience（官方「基础经验值」b）与六维种族值（校验用）
   ② /pokemon-species/{id} → growth_rate（官方经验曲线类型）+ capture_rate
   用途：让本作的经验曲线与给经验公式**按官方口径**跑（原来曲线是线性 10+lv*2、给经验是对手血量上限）
   输出：_work/out/pokemon-meta.json = { "1": {done:1, b:64, growth:"medium-slow", capture:45, total:318, stats:{...}}, ... }
   断点续传：已抓过的跳过；并发 6；失败重试 3 次
   用法：node v41-fetch-meta.mjs */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = ROOT + '/_work/out/pokemon-meta.json';
const CONC = 6;
const MAX_ID = 1025;

let data = {};
if (existsSync(OUT)) { try { data = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) { data = {}; } }
const todo = [];
for (let i = 1; i <= MAX_ID; i++) { const k = String(i); if (!(data[k] && data[k].done)) todo.push(i); }
console.log('目标 1~' + MAX_ID + ' · 已有 ' + Object.keys(data).length + ' · 待抓 ' + todo.length);
if (!todo.length) { console.log('全部已抓完 ✅'); process.exit(0); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function getJSON(url, tries) {
  for (let a = 0; a < (tries || 3); a++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(25000) });
      if (r.status === 404) return { __404: 1 };
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) {
      if (a === (tries || 3) - 1) return { __err: String((e && e.message) || e) };
      await sleep(600);
    }
  }
}
function save() { writeFileSync(OUT, JSON.stringify(data), 'utf8'); }

let done = 0;
const queue = todo.slice();
async function worker() {
  while (queue.length) {
    const id = queue.shift();
    const pk = await getJSON('https://pokeapi.co/api/v2/pokemon/' + id);
    const sp = await getJSON('https://pokeapi.co/api/v2/pokemon-species/' + id);
    const rec = { done: 1 };
    if (pk && typeof pk.base_experience === 'number') rec.b = pk.base_experience;
    if (pk && Array.isArray(pk.stats)) {
      rec.stats = {};
      pk.stats.forEach(s => { rec.stats[s.stat.name] = s.base_stat; });
      rec.total = Object.keys(rec.stats).reduce((a, k) => a + rec.stats[k], 0);
    }
    if (sp && sp.growth_rate && sp.growth_rate.name) rec.growth = sp.growth_rate.name;
    if (sp && typeof sp.capture_rate === 'number') rec.capture = sp.capture_rate;
    if (pk && pk.__404) rec.__404 = 1;
    data[String(id)] = rec;
    done++;
    if (done % 50 === 0) { save(); console.log('  进度 ' + done + '/' + todo.length); }
  }
}
await Promise.all(Array.from({ length: CONC }, worker));
save();

const arr = Object.keys(data).map(k => data[k]);
const cnt = {};
arr.forEach(x => { const g = x.growth || '(none)'; cnt[g] = (cnt[g] || 0) + 1; });
console.log('完成：共 ' + arr.length + ' 只');
console.log('有 base_experience: ' + arr.filter(x => typeof x.b === 'number').length);
console.log('有 growth_rate: ' + arr.filter(x => x.growth).length);
console.log('曲线分布: ' + JSON.stringify(cnt));
console.log('已写出 → ' + OUT);
