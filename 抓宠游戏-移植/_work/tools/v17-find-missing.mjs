/* 找出关都+城都缺失的图鉴编号，并检查子代理原始缓存能否重建 */
import { readFileSync, existsSync } from 'node:fs';
const D = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/v17-data/';
const mod = await import('file:///' + D.replace(/\/$/, '') + '/poke-kanto-johto.mjs');
const have = new Set(mod.POKE_KANTO_JOHTO.map(x => x.n));
console.log('现有 ' + have.size + ' 条');

/* 官方 1-251 的中文名：从 poke-name-id.json 反查不到编号→名字，用 PokéAPI 缓存（_poke_raw.json 若有） */
const raw = D + '_poke_raw.json';
let nameById = {};
if (existsSync(raw)) {
  const j = JSON.parse(readFileSync(raw, 'utf8'));
  const walk = (o) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (o && typeof o === 'object') {
      if (o.id && o.names) {
        const zh = o.names.find(n => n.language && n.language.name === 'zh-hans');
        if (zh && o.id <= 251) nameById[o.id] = zh.name;
      }
      Object.values(o).forEach(walk);
    }
  };
  try { walk(j); } catch (e) { }
}
console.log('缓存里解析到 1-251 的名字 ' + Object.keys(nameById).length + ' 个');
const missing = [];
for (let id = 1; id <= 251; id++) {
  const nm = nameById[id];
  if (nm && !have.has(nm)) missing.push({ id, name: nm });
}
if (!Object.keys(nameById).length) {
  console.log('（缓存里没有 species names，改用已知名单核对）');
  const EXPECT_END = ['鸭嘴宝宝', '迷唇娃', '电击怪', '电击兽', '鸭嘴火兽', '迷唇姐', '大奶罐', '幸福蛋', '雷公', '炎帝', '水君', '班基拉斯', '幼基拉斯', '沙基拉斯', '洛奇亚', '凤王', '时拉比'];
  EXPECT_END.forEach(n => { if (!have.has(n)) missing.push({ id: '?', name: n }); });
}
console.log('\n缺失 ' + missing.length + ' 只：');
missing.forEach(m => console.log('  #' + m.id + ' ' + m.name));

/* 看其它数据源文件里有没有这些（同一个子代理可能把数据也放在别的缓存里） */
const CACHE_FILES = ['_poke_52poke.json', '_poke_pdb.json', '_poke_movelist.json', '_poke_movenames.json', '_poke_multiname.json', '_poke_moves_verify.json', '_poke_movepages.json', '_poke_movezh.json'];
console.log('\n缓存文件里搜这些名字：');
CACHE_FILES.forEach(f => {
  const p = D + f;
  if (!existsSync(p)) return;
  const txt = readFileSync(p, 'utf8');
  const hits = missing.filter(m => txt.includes('"' + m.name + '"') || txt.includes(m.name)).map(m => m.name);
  console.log('  ' + f.padEnd(24) + (hits.length ? '含：' + hits.join('、') : '无'));
});
