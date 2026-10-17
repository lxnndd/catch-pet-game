/* v30：修用户报的 5 个问题
   ①医院治疗按钮 → 右上角固定（HUD 常驻 + sticky）
   ②PP 治疗后不回满（healPP 里 syncPP 后直接 return 的真 bug）
   ③道馆馆主第二只不是满血（initFighter 有 90~110% 个体浮动）
   ④平原镇道路从中心分裂（镇间路 BFS 从镇中心出发，七八条挤在中心）
   ⑤克制伤害被 85% 上限削平（66 级费洛美螂飞膝踢打 46 级肋骨海龟只有 116 血）
   用法：node v30-patch.mjs --apply */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v30.html';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const done = [];
const rep = (a, b, tag) => {
  if (!work.includes(a)) { console.error('  !! 找不到锚点: ' + tag); process.exit(1); }
  work = work.replace(a, b); done.push(tag); console.log('  [改动] ' + tag);
};

/* ── ① PP 治疗后不回满（真 bug：syncPP 之后直接 return，跳过了补满） ── */
rep(
  '  if(!p.pp || p.ppSp!==p.sp || Object.keys(p.pp).length!==p.moves.length){ syncPP(p); return; }',
  ['  /* v30 修：原来这里是 `syncPP(p); return;` —— 一旦 PP 状态"看起来不同步"（进化/学新招/旧档），',
    '     治疗只同步结构就返回了，玩家看到的仍是旧的剩余 PP（"治了但 PP 没回"）。',
    '     正确做法是同步完继续往下补满。 */',
    '  if(!p.pp || p.ppSp!==p.sp || Object.keys(p.pp).length!==p.moves.length){ syncPP(p); }'].join('\n'),
  'healPP 不再「同步后直接返回」（PP 治不回满）');

/* ── ② 道馆馆主必须是满血 ── */
rep(
  '    team.push(initFighter(s, capLv, null, t.leaderName));',
  ['    var _gf=initFighter(s, capLv, null, t.leaderName);',
    '    _gf.hp=maxHpOf(_gf);                     /* v30：馆主的宠一律满血（initFighter 有 90~110% 个体浮动） */',
    '    _gf.exp=0;',
    '    team.push(_gf);'].join('\n'),
  '道馆馆主的宠改为满血');

/* ── ③ 镇间路改从「镇门口」出发，不再挤在镇中心 ── */
rep(
  '      var path=_bfsPath(_hubT.x,_hubT.y,t.x,t.y,true) || _bfsPath(_hubT.x,_hubT.y,t.x,t.y,false);',
  ['      /* v30：改从「镇门口」出发（原来从镇中心出发，七八条路全挤在中心，看起来像中心大道裂开了）。',
    '         门口取法：按目标方向选东西南北四个门之一。 */',
    '      var _edgeOf=function(a,b){',
    '        var ddx=b.x-a.x, ddy=b.y-a.y;',
    '        if(Math.abs(ddx)>=Math.abs(ddy)) return {x:a.x+(ddx>=0?9:-9), y:a.y};',
    '        return {x:a.x, y:a.y+(ddy>=0?7:-7)};',
    '      };',
    '      var _pa=_edgeOf(_hubT,t), _pb=_edgeOf(t,_hubT);',
    '      var path=_bfsPath(_pa.x,_pa.y,_pb.x,_pb.y,true) || _bfsPath(_pa.x,_pa.y,_pb.x,_pb.y,false);'].join('\n'),
  '镇间路改从镇门口出发（不再从中心分裂）');

/* ── ④ 克制时解除 85% 伤害上限 ── */
rep(
  ['  var _tgtMax=(atkIsSelf?B.emax:maxHpOf(selfP));',
    '  var capOf=Math.max(1, Math.round(_tgtMax*0.85));',
    '  /* v29：85% 上限只用来约束「等级相近」的对局。等级压制明显时解除上限 ——',
    '     52 级打 9 级本该一击带走，原来被削成 35 血（正好是懒人獭血上限的 85%）。 */',
    '  if(lvPress>=1.6) capOf=_tgtMax;'].join('\n'),
  ['  var _tgtMax=(atkIsSelf?B.emax:maxHpOf(selfP));',
    '  var capOf=Math.max(1, Math.round(_tgtMax*0.85));',
    '  /* v29：等级压制明显（lvPress≥1.6）时解除 85% 上限。',
    '     v30：**打出属性克制（e≥2）时同样解除** —— 克制是玩家靠属性搭配换来的回报，不该被削平。',
    '     用户实测：66 级费洛美螂用 130 威力飞膝踢打 46 级肋骨海龟只掉 116 血（= 对手血上限的 85%），',
    '     而此时 lvPress 只有 1.22，旧规则根本不解除上限。 */',
    '  if(lvPress>=1.6 || e>=2) capOf=_tgtMax;'].join('\n'),
  '属性克制时解除 85% 伤害上限');

/* ── ⑤ HUD 加常驻「🏥 治疗」按钮（右上角）+ HUD 吸顶 ── */
rep(
  '        <button class="btn-sm gold" id="btn-shop">商店</button>',
  ['        <button class="btn-sm gold" id="btn-shop">商店</button>',
    '        <button class="btn-sm healfix" id="btn-heal">🏥 治疗</button>'].join('\n'),
  'HUD 新增「🏥 治疗」按钮');
rep(
  '#hud{\n  display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;',
  ['#hud{',
    '  display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;',
    '  position:sticky; top:0; z-index:30;   /* v30：HUD 吸顶，右上角的「🏥 治疗」始终可见 */'].join('\n'),
  'HUD 吸顶（治疗按钮固定在右上角）');
rep(
  '.btn-sm.gold{background:var(--gold); color:#5a3b00;}',
  ['.btn-sm.gold{background:var(--gold); color:#5a3b00;}',
    '.btn-sm.healfix{background:#e5484d; color:#fff; box-shadow:0 2px 8px rgba(229,72,77,.35);}   /* v30：常驻治疗按钮 */'].join('\n'),
  '治疗按钮配色');

/* 快捷全队治疗函数 */
rep(
  'function openHospital(){',
  ['/* v30：右上角「🏥 治疗」——一键全队（含仓库）满血 + PP 全满 + 清异常，免费 */',
    'function quickHealAll(){',
    '  if(B){ toast("正在战斗中，先撤出再治疗！"); return; }',
    '  var all=S.party.concat(S.box);',
    '  if(!all.length){ toast("还没有伙伴呢～"); return; }',
    '  var hurt=0;',
    '  all.forEach(function(p){',
    '    if(p.hp<maxHpOf(p) || ppLow(p) || (p.st && p.st.status)) hurt++;',
    '    p.hp=maxHpOf(p); clearStatus(p); healPP(p);',
    '  });',
    '  save(); updateHUD();',
    '  toast(hurt ? ("🏥 全队 "+all.length+" 只免费治愈：满血 + PP 全满！") : ("全队 "+all.length+" 只都是满血满 PP～"));',
    '}',
    'function openHospital(){'].join('\n'),
  '新增 quickHealAll()');
rep(
  '$("tab-treat").addEventListener("click",function(){ setHospTab("treat"); });',
  ['$("tab-treat").addEventListener("click",function(){ setHospTab("treat"); });',
    'if($("btn-heal")) $("btn-heal").addEventListener("click",quickHealAll);   /* v30：右上角常驻治疗 */'].join('\n'),
  '绑定治疗按钮');

/* ── 校验 ── */
const need = ['if(!p.pp || p.ppSp!==p.sp || Object.keys(p.pp).length!==p.moves.length){ syncPP(p); }',
  '_gf.hp=maxHpOf(_gf);', 'var _edgeOf=function(a,b){', 'if(lvPress>=1.6 || e>=2) capOf=_tgtMax;',
  'id="btn-heal"', 'function quickHealAll(){', 'position:sticky; top:0; z-index:30;'];
need.forEach(n => { if (!work.includes(n)) { console.error('!! 校验失败，缺: ' + n); process.exit(1); } });
if (work.includes('syncPP(p); return; }')) { console.error('!! healPP 的 return 仍在'); process.exit(1); }
console.log('\n共 ' + done.length + ' 项改动' + (apply ? '' : '（未加 --apply，仅预演）'));
if (!apply) process.exit(0);
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE);
