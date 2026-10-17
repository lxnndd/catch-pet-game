/* 战斗平衡模拟：用游戏的新公式（血量/攻防/等级系数）估算各等级段的战斗回合数
   跑法 node sim-battle.mjs */
const HP_K = 0.6, STAT_LV_K = 50, IV = 15;
const maxHpAt = (hpBase, lv) => Math.round(hpBase * HP_K) + 10 + Math.round(lv * (1 + hpBase * HP_K / 50));
const statLvK = lv => 1 + lv / STAT_LV_K;
const atkOf = (a, lv) => Math.floor((2 * a + IV) * statLvK(lv) / 100 * 100) / 100;
const defOf = (d, lv) => Math.floor((2 * d + IV) * statLvK(lv) / 100 * 100) / 100;

/* 典型宠物档案：[名字, HP种族值, 攻击, 防御, 速度, 主用招式威力] */
const MONS = {
  初阶御三家: { hp: 45, a: 49, d: 49, s: 45, power: 18 },
  中阶御三家: { hp: 60, a: 62, d: 63, s: 60, power: 30 },
  最终御三家: { hp: 80, a: 84, d: 78, s: 80, power: 38 },
  皮卡丘: { hp: 35, a: 55, d: 40, s: 90, power: 20 },
  卡比兽: { hp: 160, a: 110, d: 65, s: 30, power: 33 },
  快龙: { hp: 91, a: 134, d: 95, s: 80, power: 36 },
  传说超梦: { hp: 106, a: 110, d: 90, s: 130, power: 46 },
  幸福蛋: { hp: 255, a: 10, d: 10, s: 55, power: 18 },
  洛克的棉悠悠: { hp: 40, a: 36, d: 39, s: 43, power: 18 },
  帕鲁空涡龙: { hp: 220, a: 180, d: 142, s: 143, power: 36 }
};

function dmg(att, def, lvA, lvD, ratio = 1) {
  /* 全局伤害系数 0.025：把「招式威力×攻/防比×等级系数」缩放到与本游戏血量匹配的区间 */
  const statMul = Math.min(1.6, Math.max(0.9, atkOf(att.a, lvA) / Math.max(1, defOf(def.d, lvD))));
  const lvBonus = 1 + 0.003 * lvA;
  const base = att.power * ratio * lvBonus * statMul * 0.65 * (0.85 + Math.random() * 0.3);   // 性格系数按 1.0 中性
  return Math.max(1, Math.round(base));
}
function avgDmg(att, def, lvA, lvD, ratio = 1, n = 400) {
  let t = 0;
  for (let i = 0; i < n; i++) t += dmg(att, def, lvA, lvD, ratio);
  return t / n;
}

console.log('等级  攻击方 → 防御方              HP(防方)  平均伤害  回合数');
console.log('─'.repeat(72));
const CASES = [
  [5, '初阶御三家', '初阶御三家'], [10, '初阶御三家', '初阶御三家'], [16, '中阶御三家', '初阶御三家'],
  [20, '皮卡丘', '初阶御三家'], [30, '中阶御三家', '最终御三家'], [36, '最终御三家', '中阶御三家'],
  [50, '最终御三家', '最终御三家'], [50, '快龙', '卡比兽'], [50, '传说超梦', '快龙'],
  [50, '幸福蛋', '初阶御三家'], [50, '帕鲁空涡龙', '传说超梦'], [20, '洛克的棉悠悠', '初阶御三家'],
  [50, '最终御三家', '卡比兽'], [50, '卡比兽', '最终御三家']
];
for (const [lv, A, D] of CASES) {
  const a = MONS[A], d = MONS[D];
  const hp = maxHpAt(d.hp, lv);
  const dm = avgDmg(a, d, lv, lv);
  console.log(String(lv).padStart(3) + '   ' + (A + ' → ' + D).padEnd(28) + String(hp).padStart(6) + String(Math.round(dm * 10) / 10).padStart(10) + String(Math.round(hp / dm * 10) / 10).padStart(8));
}
console.log('');
console.log('【效果拔群 2× / 被抵抗 0.5×】以 50 级最终御三家互相攻击为例：');
const A = MONS.最终御三家;
for (const r of [0.5, 1, 2]) {
  const d2 = MONS.最终御三家, hp = maxHpAt(d2.hp, 50);
  const dm = avgDmg(A, d2, 50, 50, r);
  console.log('  倍率 ' + r + '× → 伤害 ' + Math.round(dm * 10) / 10 + '，需要 ' + (Math.round(hp / dm * 10) / 10) + ' 回合');
}
console.log('');
console.log('【等级压制】初阶(种族45) 打 最终形态(种族80) 的交换比：');
for (const [lvA, lvD] of [[5, 5], [20, 20], [20, 40], [50, 50], [50, 70]]) {
  const a = MONS.初阶御三家, d = MONS.最终御三家;
  const dm = avgDmg(a, d, lvA, lvD);
  console.log('  攻方 Lv' + String(lvA).padStart(2) + ' vs 守方 Lv' + String(lvD).padStart(2) + ' → 每击 ' + (Math.round(dm * 10) / 10) + '，守方 HP ' + maxHpAt(d.hp, lvD) + '，需 ' + (Math.round(maxHpAt(d.hp, lvD) / dm * 10) / 10) + ' 回合');
}
console.log('');
console.log('【血量成长对照（体现初阶加得少、进化后加得多）】');
console.log('  种族值    Lv1   Lv5  Lv16  Lv32  Lv50   Lv100   每级成长(Lv50)');
for (const hp of [35, 45, 60, 80, 130, 160, 255]) {
  const g = (maxHpAt(hp, 50) - maxHpAt(hp, 1)) / 49;
  console.log('  ' + String(hp).padStart(5) + String(maxHpAt(hp, 1)).padStart(8) + String(maxHpAt(hp, 5)).padStart(6) +
    String(maxHpAt(hp, 16)).padStart(6) + String(maxHpAt(hp, 32)).padStart(6) + String(maxHpAt(hp, 50)).padStart(6) +
    String(maxHpAt(hp, 100)).padStart(7) + '        +' + (Math.round(g * 100) / 100));
}
