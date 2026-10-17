/* 验证 PokéAPI 的第九世代（朱/紫）升级表可得性 —— 用户要求「都取第九世代的资料」
   关键问题：喷火龙等不在朱紫基础图鉴里的宠，PokéAPI 有没有 scarlet-violet 的升级数据？ */
const PROBE = [
  [6, '喷火龙'], [25, '皮卡丘'], [1, '妙蛙种子'], [133, '伊布'],
  [445, '烈咬陆鲨'], [658, '甲贺忍蛙'], [778, '谜拟Q'], [887, '多龙巴鲁托'],
  [94, '耿鬼'], [130, '暴鲤龙'],
];
const VG_ORDER = ['scarlet-violet', 'sword-shield', 'ultra-sun-ultra-moon', 'omega-ruby-alpha-sapphire', 'x-y', 'black-2-white-2', 'black-white', 'heartgold-soulsilver', 'platinum', 'diamond-pearl'];
const get = async (url) => {
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (r.status === 404) return { __404: true };
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) { if (a === 2) return { __err: String(e.message || e) }; await new Promise(s => setTimeout(s, 800)); }
  }
};
console.log('取 PokéAPI 各世代升级表（只统计 level-up 且 lv>=1 的招）\n');
for (const [id, name] of PROBE) {
  const j = await get('https://pokeapi.co/api/v2/pokemon/' + id);
  if (j.__404) { console.log('  #' + id + ' ' + name + ' → 404'); continue; }
  if (j.__err) { console.log('  #' + id + ' ' + name + ' → 请求失败: ' + j.__err); continue; }
  const byVG = {};
  (j.moves || []).forEach(m => {
    (m.version_group_details || []).forEach(d => {
      if (d.move_learn_method.name !== 'level-up') return;
      const vg = d.version_group.name;
      byVG[vg] = byVG[vg] || [];
      byVG[vg].push({ n: m.move.name, lv: d.level_learned_at });
    });
  });
  const sv = byVG['scarlet-violet'];
  const best = VG_ORDER.find(v => byVG[v] && byVG[v].length);
  console.log('  #' + String(id).padStart(4) + ' ' + name.padEnd(6) +
    ' 第九世代(朱紫): ' + (sv ? String(sv.length).padStart(3) + ' 招' : '无数据  ') +
    ' | 最近有数据的世代: ' + (best || '无') + ' (' + (best ? byVG[best].length : 0) + ' 招)');
  if (sv) {
    const sample = sv.filter(x => x.lv > 0).sort((a, b) => a.lv - b.lv).slice(0, 6).map(x => x.n + '@' + x.lv).join(' ');
    console.log('       朱紫样例: ' + sample);
  }
}
