/* 18 属性克制真值表（宝可梦官方体系）
   倍率：2 = 效果拔群，0.5 = 效果不理想，0 = 无效，未列出 = 1
   数据来源：宝可梦官方属性相克表（第十五/十六行沿用官方 18 属性体系） */
export const T18 = ['nor','fire','water','grass','elec','ice','fight','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];

export const T18_NAME = {
  nor:'普通', fire:'火', water:'水', grass:'草', elec:'电', ice:'冰',
  fight:'格斗', poison:'毒', ground:'地面', flying:'飞行', psychic:'超能力',
  bug:'虫', rock:'岩石', ghost:'幽灵', dragon:'龙', dark:'恶', steel:'钢', fairy:'妖精'
};

/* 每个攻击属性 → { 防守属性: 倍率 } */
export const CHART18 = {
  nor:     { rock:0.5, ghost:0, steel:0.5 },
  fire:    { fire:0.5, water:0.5, grass:2, ice:2, bug:2, rock:0.5, dragon:0.5, steel:2 },
  water:   { fire:2, water:0.5, grass:0.5, ground:2, rock:2, dragon:0.5 },
  grass:   { fire:0.5, water:2, grass:0.5, poison:0.5, ground:2, flying:0.5, bug:0.5, rock:2, dragon:0.5, steel:0.5 },
  elec:    { water:2, grass:0.5, elec:0.5, ground:0, flying:2, dragon:0.5 },
  ice:     { fire:0.5, water:0.5, grass:2, ice:0.5, ground:2, flying:2, dragon:2, steel:0.5 },
  fight:   { nor:2, ice:2, poison:0.5, flying:0.5, psychic:0.5, bug:0.5, rock:2, ghost:0, dark:2, steel:2, fairy:0.5 },
  poison:  { grass:2, poison:0.5, ground:0.5, rock:0.5, ghost:0.5, steel:0, fairy:2 },
  ground:  { fire:2, grass:0.5, elec:2, poison:2, flying:0, bug:0.5, rock:2, steel:2 },
  flying:  { grass:2, elec:0.5, fight:2, bug:2, rock:0.5, steel:0.5 },
  psychic: { fight:2, poison:2, psychic:0.5, dark:0, steel:0.5 },
  bug:     { fire:0.5, grass:2, fight:0.5, poison:0.5, flying:0.5, psychic:2, ghost:0.5, dark:2, steel:0.5, fairy:0.5 },
  rock:    { fire:2, ice:2, fight:0.5, ground:0.5, flying:2, bug:2, steel:0.5 },
  ghost:   { nor:0, psychic:2, ghost:2, dark:0.5 },
  dragon:  { dragon:2, steel:0.5, fairy:0 },
  dark:    { fight:0.5, psychic:2, ghost:2, dark:0.5, fairy:0.5 },
  steel:   { fire:0.5, water:0.5, elec:0.5, ice:2, rock:2, steel:0.5, fairy:2 },
  fairy:   { fire:0.5, fight:2, poison:0.5, dragon:2, dark:2, steel:0.5 }
};

/* 防御向反查：某属性受到哪些属性的攻击会加倍/减半（校验用） */
export function defensAgainst(defType) {
  const strong = [], weak = [], immune = [];
  for (const atk of T18) {
    const m = (CHART18[atk] || {})[defType] ?? 1;
    if (m === 2) strong.push(atk); else if (m === 0.5) weak.push(atk); else if (m === 0) immune.push(atk);
  }
  return { strong, weak, immune };
}

/* 自检：统计每个属性的攻防分布，确认没有笔误导致极端值 */
export function auditChart() {
  const rows = [];
  for (const t of T18) {
    const atkMap = CHART18[t] || {};
    const n2 = Object.values(atkMap).filter(v => v === 2).length;
    const n05 = Object.values(atkMap).filter(v => v === 0.5).length;
    const def = defensAgainst(t);
    rows.push({ type: t, 攻_克制: n2, 攻_抵抗: n05, 受_被克: def.strong.length, 受_抵抗: def.weak.length, 受_免疫: def.immune.length });
  }
  return rows;
}
