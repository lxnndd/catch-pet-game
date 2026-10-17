/* 拉 PokéAPI 官方的 is_legendary / is_mythical 权威名单（用于修正 rarity 误判） */
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const OUT = ROOT + '/_work/v17-data/poke-legendary.json';
const CSV_URLS = [
  'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species.csv',
  'https://fastly.jsdelivr.net/gh/PokeAPI/pokeapi@master/data/v2/csv/pokemon_species.csv',
];
async function get(url, ms = 40000) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120' } });
    if (!r.ok) { console.log('  HTTP ' + r.status + ' ' + url.slice(0, 60)); return null; }
    return await r.text();
  } catch (e) { console.log('  失败 ' + e.message.slice(0, 50)); return null; } finally { clearTimeout(t); }
}
let csv = null;
for (const u of CSV_URLS) { csv = await get(u); if (csv) { console.log('✅ 取得 pokemon_species.csv（' + (csv.length / 1024).toFixed(0) + ' KB）来自 ' + u.slice(8, 40)); break; } }
if (!csv) throw new Error('CSV 拉取失败');
/* CSV 表头：id,identifier,generation_id,evolves_from_species_id,evolution_chain_id,color_id,shape_id,habitat_id,gender_rate,capture_rate,base_happiness,is_baby,hatch_counter,has_gender_differences,growth_rate_id,forms_switchable,is_legendary,is_mythical,order,conquest_order */
const lines = csv.split('\n').filter(Boolean);
const head = lines[0].split(',');
const iId = head.indexOf('id'), iLeg = head.indexOf('is_legendary'), iMyth = head.indexOf('is_mythical'), iName = head.indexOf('identifier');
console.log('列位置：id=' + iId + ' legendary=' + iLeg + ' mythical=' + iMyth + ' name=' + iName);
const legendary = [], mythical = [], all = {};
for (let i = 1; i < lines.length; i++) {
  const p = lines[i].split(',');
  const id = Number(p[iId]);
  if (!id) continue;
  const leg = p[iLeg] === '1', myth = p[iMyth] === '1';
  if (leg || myth) all[id] = myth ? 'mythical' : 'legendary';
  if (leg) legendary.push(id);
  if (myth) mythical.push(id);
}
console.log('\n传奇（legendary）' + legendary.length + ' 只 · 幻兽（mythical）' + mythical.length + ' 只 · 合计 ' + Object.keys(all).length);
console.log('传奇编号：' + legendary.join(','));
console.log('幻兽编号：' + mythical.join(','));
writeFileSync(OUT, JSON.stringify({ legendary, mythical, all }, null, 1), 'utf8');
console.log('\n已写出 ' + OUT);
