/* 向 PokéAPI 求证究极异兽的 is_legendary / is_mythical 标志 */
const UB = [793, 794, 795, 796, 797, 798, 799, 803, 804, 805, 806];
const EXTRA = [800, 801, 802, 807, 808, 809];   /* 奈克洛兹玛/玛机雅娜/玛夏多/捷拉奥拉/美录坦/美录梅塔 对照 */
const name = async (id) => {
  const r = await fetch('https://pokeapi.co/api/v2/pokemon-species/' + id + '?t=' + Date.now());
  if (!r.ok) return { id, err: r.status };
  const j = await r.json();
  const zh = (j.names || []).find(n => n.language.name === 'zh-Hans');
  return { id, en: j.name, zh: zh ? zh.name : '', legendary: j.is_legendary, mythical: j.is_mythical, gen: (j.generation || {}).name };
};
console.log('== 究极异兽（Ultra Beast）==');
for (const id of UB) {
  const o = await name(id);
  console.log('  #' + id + ' ' + String(o.zh || o.en).padEnd(8) + ' is_legendary=' + o.legendary + '  is_mythical=' + o.mythical + '  ' + (o.gen || ''));
}
console.log('\n== 对照（已知神兽档）==');
for (const id of EXTRA) {
  const o = await name(id);
  console.log('  #' + id + ' ' + String(o.zh || o.en).padEnd(8) + ' is_legendary=' + o.legendary + '  is_mythical=' + o.mythical);
}
console.log('\n== 对照（普通宠）==');
for (const id of [1, 25, 133]) {
  const o = await name(id);
  console.log('  #' + id + ' ' + String(o.zh || o.en).padEnd(8) + ' is_legendary=' + o.legendary + '  is_mythical=' + o.mythical);
}
