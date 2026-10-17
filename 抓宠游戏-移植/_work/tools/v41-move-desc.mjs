/* v41：从 PokéAPI 招式缓存里提取**中文招式描述**，供游戏内「长按技能看介绍」使用
   数据源：_work/sources/宝可梦/poke-cache-kj/json/move-*.json（532 个，其中 523 个有 zh-hans）
   映射：  _work/out/pokeapi-move-map.json（英文招式名 → 游戏招式 id）
   输出：  _work/out/move-desc.json = { "mv1": {zh:"撞击", desc:"用整个身体…", eff:"…"}, ... }
   用法：node v41-move-desc.mjs */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = ROOT + '/_work/sources/宝可梦/poke-cache-kj/json';
const MAPF = ROOT + '/_work/out/pokeapi-move-map.json';
const OUT = ROOT + '/_work/out/move-desc.json';

const MAP = JSON.parse(readFileSync(MAPF, 'utf8'));   /* { en: {id, zh} } */
const files = readdirSync(CACHE).filter(f => /^move-.*\.json$/.test(f));

/* 把官方文本里的控制字符/多余换行清干净：游戏里要单行显示摘要，长按弹窗才用多行 */
function clean(s) {
  return String(s || '')
    .replace(/\u000c/g, '\n')          /* 官方文本里用 \f 分页 */
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
const pickZh = (arr, field) => {
  const list = (arr || []).filter(x => x.language && x.language.name === 'zh-hans' && x[field]);
  if (!list.length) return '';
  return clean(list[list.length - 1][field]);   /* 取最新世代的一条 */
};

const out = {};
let noMap = 0, noZh = 0;
for (const f of files) {
  let o; try { o = JSON.parse(readFileSync(CACHE + '/' + f, 'utf8')); } catch (e) { continue; }
  const hit = MAP[o.name];
  if (!hit || !hit.id) { noMap++; continue; }
  const desc = pickZh(o.flavor_text_entries, 'flavor_text');
  const eff = pickZh(o.effect_entries, 'effect');
  if (!desc && !eff) { noZh++; continue; }
  const rec = {};
  if (hit.zh) rec.zh = hit.zh;
  if (desc) rec.desc = desc;
  if (eff) rec.eff = eff;
  out[hit.id] = rec;
}
writeFileSync(OUT, JSON.stringify(out), 'utf8');
const ids = Object.keys(out);
console.log('招式缓存文件: ' + files.length);
console.log('映射到游戏招 id: ' + ids.length);
console.log('  其中有描述: ' + ids.filter(k => out[k].desc).length);
console.log('  其中有效果说明: ' + ids.filter(k => out[k].eff).length);
console.log('  未映射（游戏里没有这只招）: ' + noMap);
console.log('  映射到了但没有中文文本: ' + noZh);
console.log('样例:');
ids.slice(0, 4).forEach(k => console.log('  ' + k + ' ' + (out[k].zh || '') + ' → ' + String(out[k].desc || '').replace(/\n/g, ' / ').slice(0, 60)));
console.log('已写出 → ' + OUT);
