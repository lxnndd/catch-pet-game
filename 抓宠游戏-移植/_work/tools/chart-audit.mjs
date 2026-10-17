import { T18, T18_NAME, CHART18, defensAgainst } from './typechart18.mjs';

console.log('属性数:', T18.length, '覆盖:', T18.join(','));
console.log('\n属性      攻:克制 攻:抵抗 攻:免疫 | 守:被克 守:抵抗 守:免疫 | 净优势');
let bad = [];
for (const t of T18) {
  const a = CHART18[t] || {};
  const a2 = Object.values(a).filter(v => v === 2).length;
  const a05 = Object.values(a).filter(v => v === 0.5).length;
  const a0 = Object.values(a).filter(v => v === 0).length;
  const d = defensAgainst(t);
  const net = (a2 + d.weak.length) - (a05 + d.strong.length);
  console.log(
    T18_NAME[t].padEnd(5, '　'),
    String(a2).padStart(4), String(a05).padStart(6), String(a0).padStart(6), ' | ',
    String(d.strong.length).padStart(5), String(d.weak.length).padStart(6), String(d.immune.length).padStart(6), ' | ', net
  );
  // 官方已知校验点
  if (t === 'nor' && (a2 !== 0 || d.strong.join() !== 'fight')) bad.push('普通系异常');
  if (t === 'elec' && !d.immune.includes('ground')) bad.push('电系应对地面免疫');
  if (t === 'ground' && !a.immune0 && CHART18.ground.flying !== 0) bad.push('地面打飞行应无效');
  if (t === 'ghost' && CHART18.ghost.nor !== 0) bad.push('幽灵打普通应无效');
  if (t === 'dragon' && CHART18.dragon.fairy !== 0) bad.push('龙打妖精应无效');
  if (t === 'poison' && CHART18.poison.steel !== 0) bad.push('毒打钢应无效');
  if (t === 'psychic' && CHART18.psychic.dark !== 0) bad.push('超能打恶应无效');
  if (t === 'fight' && CHART18.fight.ghost !== 0) bad.push('格斗打幽灵应无效');
}
console.log('\n关键校验:', bad.length ? bad.join(' / ') : '全部通过');

// 双向一致性：A 打 B = 2 时，B 的属性弱点里必然含 A（对称性自检）
const asym = [];
for (const A of T18) for (const B of T18) {
  const m = (CHART18[A] || {})[B] ?? 1;
  const rev = defensAgainst(B);
  if (m === 2 && !rev.strong.includes(A)) asym.push(`${A}->${B} 攻方说 2x，守方弱点表缺 ${A}`);
  if (m === 0.5 && !rev.weak.includes(A)) asym.push(`${A}->${B} 攻方说 0.5x，守方抵抗表缺 ${A}`);
  if (m === 0 && !rev.immune.includes(A)) asym.push(`${A}->${B} 攻方说 0x，守方免疫表缺 ${A}`);
}
console.log('攻守对称性:', asym.length ? asym.join(' / ') : '一致（无矛盾）');

// 免疫关系清单
console.log('\n免疫关系:');
for (const t of T18) { const d = defensAgainst(t); if (d.immune.length) console.log('  ' + T18_NAME[t] + ' 免疫: ' + d.immune.map(x => T18_NAME[x]).join('、')); }
