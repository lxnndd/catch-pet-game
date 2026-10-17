/* v28 补丁：①野怪等级改为「地区区间 ∩ 该宠进化阶段区间」内纯随机（不再跟随队伍等级）
   ②进化型按「阶段区间与地区区间有交集」进入野生池
   ③阶段区间保证不会出现「高等级的低进化链宠」——那种抓到就立刻进化
   ④数据源里 22 条 lv=0 的进化链统一补成 32 级
   用法：node v28-evo-patch.mjs --apply */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v28-evo.html';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const changes = [];

/* ── 1. 新增 evoLvOf / stageRange / wildOk（插在 isEvolvedForm 之后） ── */
const a1 = [
  '  return !!evolvedIds[sp.id];',
  '}',
  'function typeEdge(aSp,dSp){',
].join('\n');
const n1 = [
  '  return !!evolvedIds[sp.id];',
  '}',
  '/* v28 野生池规则 ============================================================',
  '   ① 野生池 = 基础形态 + 进化型，但进化型必须是「阶段区间与该地区等级段有交集」。',
  '      各地区等级段：平原/林间/水畔 1~25 · 花海 26~35 · 矿洞 36~45 · 荒漠 46~55 ·',
  '                    海洋 56~65 · 火山/雪原 66~75。',
  '   ② 每只宠有「进化阶段区间」[来路等级, 去路等级-1]：',
  '        基础形态   下限 1（没进化过）',
  '        进化型     下限 = 它从上一形态进化来的等级',
  '        非最终形态 上限 = 它进化到下一形态的等级 - 1',
  '        最终形态   上限 100',
  '   ③ 野怪等级只在「阶段区间 ∩ 地区等级段」内随机 —— 这样绝不会刷出',
  '      「高等级的低进化链宠」（例如 Lv50 的铁甲蛹，抓到就会立刻进化）。',
  '   ========================================================================= */',
  'var evoLvMap=null;',
  'function evoLvOf(id){',
  '  if(!evoLvMap){',
  '    evoLvMap={};',
  '    Object.keys(EVO).forEach(function(k){',
  '      var e=EVO[k]; if(!e) return;',
  '      var lv=(typeof e.lv==="number"&&e.lv>0)?e.lv:32;   /* v28：22 条 lv=0 的数据缺口统一按 32 级 */',
  '      var arr=(typeof e.to==="string")?[e.to]:(e.to||[]);',
  '      arr.forEach(function(t){ if(evoLvMap[t]===undefined||lv<evoLvMap[t]) evoLvMap[t]=lv; });',
  '    });',
  '  }',
  '  return evoLvMap[id];',
  '}',
  'function nextEvoLv(sp){',
  '  var chain=sp?EVO[sp.id]:null;',
  '  if(!chain) return null;',
  '  return (typeof chain.lv==="number"&&chain.lv>0)?chain.lv:32;',
  '}',
  'function stageRange(sp){',
  '  var el=evoLvOf(sp.id), nl=nextEvoLv(sp);',
  '  var lo=(el===undefined||el<1)?1:el;',
  '  var hi=(nl===null)?100:nl-1;            /* lo>hi 说明数据矛盾 → stageLvRange 判为不可野生 */',
  '  return [lo,hi];',
  '}',
  'function stageLvRange(sp,reg){                  /* 阶段区间 ∩ 地区等级段 */',
  '  var r=LV_RANGE[reg]||[1,25], s=stageRange(sp);',
  '  var lo=Math.max(s[0],r[0]), hi=Math.min(s[1],r[1]);',
  '  if(hi<lo) return null;                        /* 无交集 → 这只不该出现在这个地区 */',
  '  return [lo,hi];',
  '}',
  'function wildOk(sp,reg){',
  '  if(!sp || !sp.habitat || sp.varOf) return false;',
  '  if(sp.habitat.indexOf(reg)<0) return false;',
  '  return !!stageLvRange(sp,reg);',
  '}',
  'function typeEdge(aSp,dSp){',
].join('\n');
if (work.includes('function wildOk(sp,reg)')) console.log('[1] 已是 v28 规则，跳过');
else if (work.includes(a1)) { work = work.replace(a1, n1); changes.push('新增 evoLvOf/nextEvoLv/stageRange/stageLvRange/wildOk'); }
else { console.error('!! 找不到 isEvolvedForm 尾部锚点'); process.exit(1); }

/* ── 2. rollEnemy 池过滤换成 wildOk ── */
const a2 = [
  '  if(Math.random()<(SKY_RATE[reg]||0)){',
  '    pool=SPECIES.filter(function(s){ return !isEvolvedForm(s) && !s.varOf && s.fly && s.habitat.indexOf(reg)>=0; });',
  '    if(!pool.length) pool=null;',
  '  }',
  '  if(!pool) pool=SPECIES.filter(function(s){ return !isEvolvedForm(s) && !s.varOf && s.habitat.indexOf(reg)>=0; });',
  '  if(!pool.length) pool=SPECIES.filter(function(s){return !isEvolvedForm(s) && !s.varOf;});',
].join('\n');
const n2 = [
  '  if(Math.random()<(SKY_RATE[reg]||0)){',
  '    pool=SPECIES.filter(function(s){ return wildOk(s,reg) && s.fly; });   /* v28：飞行池同样按阶段区间筛 */',
  '    if(!pool.length) pool=null;',
  '  }',
  '  if(!pool) pool=SPECIES.filter(function(s){ return wildOk(s,reg); });     /* v28：基础形态 + 阶段区间匹配的进化型 */',
  '  if(!pool.length) pool=SPECIES.filter(function(s){return !s.varOf;});',
].join('\n');
if (work.includes('pool=SPECIES.filter(function(s){ return wildOk(s,reg); })')) console.log('[2] 池过滤已改过，跳过');
else if (work.includes(a2)) { work = work.replace(a2, n2); changes.push('rollEnemy 主池/飞行池改用 wildOk()'); }
else { console.error('!! 找不到 rollEnemy 池过滤原文'); process.exit(1); }

/* ── 3. 稀缺度降级池（保留玩家等级的新手保护）── */
const a3 = [
  '    var easy=SPECIES.filter(function(s){ return !isEvolvedForm(s) && !s.varOf && s.rarity<=maxR && s.habitat.indexOf(reg)>=0; });',
  '    if(!easy.length) easy=SPECIES.filter(function(s){ return !isEvolvedForm(s) && !s.varOf && s.rarity<=maxR; });',
].join('\n');
const n3 = [
  '    var easy=SPECIES.filter(function(s){ return wildOk(s,reg) && s.rarity<=maxR; });',
  '    if(!easy.length) easy=SPECIES.filter(function(s){ return !s.varOf && s.rarity<=maxR; });',
].join('\n');
if (work.includes('var easy=SPECIES.filter(function(s){ return wildOk(s,reg) && s.rarity<=maxR; });')) console.log('[3] 降级池已改过，跳过');
else if (work.includes(a3)) { work = work.replace(a3, n3); changes.push('低等级降级池改用 wildOk()'); }
else { console.error('!! 找不到降级池原文'); process.exit(1); }

/* ── 4. 野怪等级：阶段区间 ∩ 地区区间 内随机 ── */
const a4 = [
  '  var _reg2=regionAt(S.pos.x,S.pos.y), _lr2=LV_RANGE[_reg2]||[1,25];',
  '  var _top2=topPartyLv();',
  '  var _lv2=clamp(_top2+ri(-3,3),1,100);',
  '  _lv2=clamp(_lv2,_lr2[0],_lr2[1]);',
  '  if(_top2<=2) _lv2=Math.min(_lv2,3);',
].join('\n');
const n4 = [
  '  var _reg2=regionAt(S.pos.x,S.pos.y), _lr2=LV_RANGE[_reg2]||[1,25];',
  '  /* v28：野怪等级 = 「地区等级段 ∩ 该宠进化阶段区间」内纯随机，不再跟随玩家队伍等级。',
  '     阶段区间保证不会刷出「高等级的低进化链宠」（那种抓到就会立刻进化）。 */',
  '  var _spr2=stageLvRange(sp,_reg2)||[_lr2[0],_lr2[1]];',
  '  var _lv2=clamp(ri(_spr2[0],_spr2[1]),1,100);',
].join('\n');
if (work.includes('var _spr2=stageLvRange(sp,_reg2)')) console.log('[4] 等级算法已改过，跳过');
else if (work.includes(a4)) { work = work.replace(a4, n4); changes.push('野怪等级改为「阶段区间 ∩ 地区区间」内纯随机'); }
else { console.error('!! 找不到等级计算原文'); process.exit(1); }

/* ── 5. LV_RANGE 下限统一为 1（地区只决定等级上限） ── */
const a5 = 'var LV_RANGE={plain:[1,25],forest:[1,25],water:[1,25],flower:[26,35],mine:[36,45],desert:[46,55],ocean:[56,65],volcano:[66,75],snow:[66,75]};';
const n5 = 'var LV_RANGE={plain:[1,25],forest:[1,25],water:[1,25],flower:[1,35],mine:[1,45],desert:[1,55],ocean:[1,65],volcano:[1,75],snow:[1,75]};   /* v28：地区下限统一为 1 —— 地区只决定等级上限，低阶宠以低等级出现在高级地区 */';
if (work.includes('flower:[1,35]')) console.log('[5] LV_RANGE 已改过，跳过');
else if (work.includes(a5)) { work = work.replace(a5, n5); changes.push('LV_RANGE 下限统一为 1（花海 1~35 · 矿洞 1~45 · 荒漠 1~55 · 海洋 1~65 · 火山/雪原 1~75）'); }
else { console.error('!! 找不到 LV_RANGE 原文'); process.exit(1); }

/* ── 6. 开战兜底等级也去掉「跟队伍等级」 ── */
const a6 = [
  '  var topLv=topPartyLv();',
  '  var _reg=regionAt(S.pos.x,S.pos.y);',
  '  var _lr=LV_RANGE[_reg]||[1,25];',
  '  var foeLv;',
  '  if(opts.foeLv){ foeLv=clamp(opts.foeLv,1,100); } else if(e && e.lv){ foeLv=clamp(e.lv,1,100); }',
  '  else{',
  '    foeLv=clamp(topLv+ri(-3,3), 1, 100);',
  '    foeLv=clamp(foeLv, _lr[0], _lr[1]);',
  '    if(topLv<=2) foeLv=Math.min(foeLv,3);',
  '  }',
].join('\n');
const n6 = [
  '  var _reg=regionAt(S.pos.x,S.pos.y);',
  '  var _lr=LV_RANGE[_reg]||[1,25];',
  '  var foeLv;',
  '  if(opts.foeLv){ foeLv=clamp(opts.foeLv,1,100); } else if(e && e.lv){ foeLv=clamp(e.lv,1,100); }',
  '  else{',
  '    /* v28：兜底也按「阶段区间 ∩ 地区等级段」随机，不再跟随玩家队伍等级 */',
  '    var _spr3=stageLvRange(wsp,_reg)||[_lr[0],_lr[1]];',
  '    foeLv=clamp(ri(_spr3[0],_spr3[1]),1,100);',
  '  }',
].join('\n');
if (work.includes('var _spr3=stageLvRange(wsp,_reg)')) console.log('[6] 兜底等级已改过，跳过');
else if (work.includes(a6)) { work = work.replace(a6, n6); changes.push('开战兜底等级改用阶段区间（去掉 topPartyLv 依赖）'); }
else { console.error('!! 找不到兜底等级原文'); process.exit(1); }

/* ── 7. EVO 数据自洽化 ──
   ① lv<=0 → 32（22 条道具/亲密度进化的数据缺口，用户选定 32 为兜底）
   ② 修正明显错误：刺尾虫 Lv30 → Lv7（与绿毛虫/独角虫同为 Lv7）
   ③ 强制「去路等级 > 来路等级」：矛盾条目把去路抬到 来路+10
      根因：宝可梦的道具/亲密度/交换进化在数据源里被写成 0 或与来路相同，
            会让「Lv50 的铁甲蛹」这种抓到就立刻进化的个体出现在野外。 */
const evoKey = 'var EVO=';
const evoAt = work.indexOf(evoKey);
if (evoAt < 0) { console.error('!! 找不到 var EVO='); process.exit(1); }
const evoHead = evoAt + evoKey.length;
const evoFrom = evoHead + work.slice(evoHead).search(/[[{]/);
let _d = 0, _j = evoFrom, _s = null, _esc = false;
for (; _j < work.length; _j++) {
  const c = work[_j];
  if (_s) { if (_esc) { _esc = false; continue; } if (c === '\\') { _esc = true; continue; } if (c === _s) _s = null; continue; }
  if (c === '"') { _s = c; continue; }
  if (c === '{') _d++; else if (c === '}') { _d--; if (_d === 0) { _j++; break; } }
}
const EVO = new Function('return (' + work.slice(evoFrom, _j) + ')')();
const notes = [];
let zeroN = 0;
Object.keys(EVO).forEach(k => { const e = EVO[k]; if (typeof e.lv !== 'number' || e.lv <= 0) { e.lv = 32; zeroN++; } });
if (zeroN) notes.push(zeroN + ' 条 lv<=0 补成 32 级');
if (EVO['pk-265'] && EVO['pk-265'].lv === 30) { EVO['pk-265'].lv = 7; notes.push('刺尾虫(pk-265) 30→7（与绿毛虫/独角虫同为 Lv7）'); }
let bumped = 0; const bumpSample = [];
for (let round = 0; round < 6; round++) {
  const inc = {};
  Object.keys(EVO).forEach(k => {
    const e = EVO[k], arr = (typeof e.to === 'string') ? [e.to] : (e.to || []);
    arr.forEach(t => { if (inc[t] === undefined || e.lv < inc[t]) inc[t] = e.lv; });
  });
  let changed = 0;
  Object.keys(EVO).forEach(k => {
    const e = EVO[k], lo = inc[k];
    if (lo !== undefined && e.lv <= lo) { if (bumpSample.length < 8) bumpSample.push(k + ' ' + e.lv + '→' + (lo + 10)); e.lv = lo + 10; changed++; }
  });
  bumped += changed;
  if (!changed) break;
}
if (bumped) notes.push(bumped + ' 条「去路 ≤ 来路」抬到 来路+10');
work = work.slice(0, evoFrom) + JSON.stringify(EVO) + work.slice(_j);
if (notes.length) { changes.push('EVO 自洽化：' + notes.join('；')); console.log('    自洽化样例: ' + bumpSample.join(' / ')); }
else console.log('[7] EVO 无需自洽化，跳过');

/* ── 校验 ── */
const need = ['function evoLvOf(id)', 'function stageRange(sp)', 'function stageLvRange(sp,reg)', 'function wildOk(sp,reg)',
  'pool=SPECIES.filter(function(s){ return wildOk(s,reg); })', 'var _spr2=stageLvRange(sp,_reg2)', 'var _lv2=clamp(ri(_spr2[0],_spr2[1]),1,100);',
  'flower:[1,35]', 'var _spr3=stageLvRange(wsp,_reg)'];
need.forEach(n => { if (!work.includes(n)) { console.error('!! 校验失败，缺: ' + n); process.exit(1); } });
if (/"lv":0,/.test(work)) { console.error('!! 还有 lv=0 残留'); process.exit(1); }
if (work.includes('_lv2=clamp(_top2+ri(-3,3)')) { console.error('!! 旧等级算法残留'); process.exit(1); }
console.log('\n校验通过。改动 ' + changes.length + ' 项：');
changes.forEach((c, i) => console.log('  ' + (i + 1) + '. ' + c));
if (!apply) { console.log('\n（未加 --apply，仅预演）'); process.exit(0); }
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('\n已备份 → ' + BAK); }
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE + ' (' + Buffer.byteLength(work, 'utf8') + ' 字节)');
