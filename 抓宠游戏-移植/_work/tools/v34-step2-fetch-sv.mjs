/* Step 2：抓 1~1025 号宝可梦的「第九世代（朱/紫）」升级表
   用户要求：都取第九世代的资料（不要多世代并集）
   输出：_work/out/sv-learnsets.json = { "6": [{n:"scratch",lv:1}, ...], ... }
   断点续传：已抓过的直接跳过；并发 6，失败重试 3 次 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = ROOT + '/_work/out/sv-learnsets.json';
const VG = 'scarlet-violet';
let data = {};
if (existsSync(OUT)) { try { data = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) { data = {}; } }
const have = Object.keys(data).length;
const IDS = [];
for (let i = 1; i <= 1025; i++) if (!data[i]) IDS.push(i);
console.log('目标 1~1025 · 已有 ' + have + ' · 待抓 ' + IDS.length);
if (!IDS.length) { console.log('全部已抓完 ✅'); process.exit(0); }

let done = 0, fail = [];
const get = async (id) => {
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch('https://pokeapi.co/api/v2/pokemon/' + id, { signal: AbortSignal.timeout(25000) });
      if (r.status === 404) return { __404: true };
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) { if (a === 2) return { __err: String(e.message || e) }; await new Promise(s => setTimeout(s, 600)); }
  }
};
const CONC = 6;
let cursor = 0;
const worker = async () => {
  while (cursor < IDS.length) {
    const id = IDS[cursor++];
    const j = await get(id);
    if (j.__404) { data[id] = { __404: 1 }; done++; continue; }
    if (j.__err) { fail.push(id + ':' + j.__err); continue; }
    const lv = [];
    (j.moves || []).forEach(m => {
      (m.version_group_details || []).forEach(d => {
        if (d.version_group && d.version_group.name === VG && d.move_learn_method && d.move_learn_method.name === 'level-up') {
          lv.push({ n: m.move.name, lv: d.level_learned_at || 0 });
        }
      });
    });
    data[id] = lv;
    done++;
    if (done % 50 === 0) {
      writeFileSync(OUT, JSON.stringify(data), 'utf8');
      console.log('  进度 ' + done + '/' + IDS.length + '（' + (have + done) + '/1025）失败 ' + fail.length);
    }
  }
};
await Promise.all(Array.from({ length: CONC }, worker));
writeFileSync(OUT, JSON.stringify(data), 'utf8');
const got = Object.keys(data).filter(k => Array.isArray(data[k]));
const empty = got.filter(k => data[k].length === 0);
const nf = Object.keys(data).filter(k => data[k] && data[k].__404);
console.log('\n完成：本次抓 ' + done + ' 只，累计 ' + Object.keys(data).length);
console.log('  有升级表: ' + (got.length - empty.length) + ' 只');
console.log('  升级表为空（朱紫里没有）: ' + empty.length + ' 只');
console.log('  404: ' + nf.length + ' 只');
if (fail.length) console.log('  失败: ' + fail.length + ' → ' + fail.slice(0, 5).join(' | '));
console.log('已写出 → ' + OUT);
