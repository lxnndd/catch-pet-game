/* v39：道馆与联盟大赛改用宝可梦真实数据（关东八道馆 + 四天王 + 冠军）
   数据来源：https://pokemondb.net/firered-leafgreen/gymleaders-elitefour （火红/叶绿）
   规则：队伍成员用真实配置；道馆等级沿用本作地区等级上限（否则早期道馆会太弱），联盟用真实等级
   用法：node v39-patch.mjs --apply */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v39.html';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const done = [];
const rep = (a, b, tag) => {
  if (!work.includes(a)) { console.error('  !! 找不到锚点: ' + tag); process.exit(1); }
  work = work.replace(a, b); done.push(tag); console.log('  [改动] ' + tag);
};

/* ── ① 真实道馆 / 四天王数据表 ── */
rep('var REGION_GYM=',
  ['/* ══ v39 真实道馆数据（关东八道馆 · 火红/叶绿）══',
    '   来源：https://pokemondb.net/firered-leafgreen/gymleaders-elitefour',
    '   队伍成员与真实配置一致；等级用 0 表示「按本作该地区的等级上限」，其余为真实等级。',
    '   与本作八地区的对应：矿洞=深灰(岩石) · 海洋=华蓝(水) · 平原=枯叶(电) · 林间=彩虹(草)',
    '                       花海=金黄(超能) · 荒漠=常磐(地面) · 火山=红莲(火) · 雪原=红莲同级的冰系(科拿) */',
    'var REAL_GYMS={',
    '  mine:   {leader:"小刚",   gym:"深灰道馆", type:"rock",    badge:"灰色徽章", team:[["pk-074",0],["pk-095",0]]},',
    '  ocean:  {leader:"小霞",   gym:"华蓝道馆", type:"water",   badge:"蓝色徽章", team:[["pk-120",0],["pk-121",0]]},',
    '  plain:  {leader:"马志士", gym:"枯叶道馆", type:"elec",    badge:"橙色徽章", team:[["pk-100",0],["pk-025",0],["pk-026",0]]},',
    '  forest: {leader:"莉佳",   gym:"彩虹道馆", type:"grass",   badge:"彩虹徽章", team:[["pk-071",0],["pk-114",0],["pk-045",0]]},',
    '  flower: {leader:"娜姿",   gym:"金黄道馆", type:"psychic", badge:"金色徽章", team:[["pk-064",0],["pk-122",0],["pk-049",0],["pk-065",0]]},',
    '  desert: {leader:"坂木",   gym:"常磐道馆", type:"ground",  badge:"绿色徽章", team:[["pk-111",0],["pk-051",0],["pk-031",0],["pk-034",0],["pk-111",0]]},',
    '  volcano:{leader:"夏伯",   gym:"红莲道馆", type:"fire",    badge:"深红徽章", team:[["pk-058",0],["pk-077",0],["pk-078",0],["pk-059",0]]},',
    '  snow:   {leader:"科拿",   gym:"冰河道馆", type:"ice",     badge:"冰河徽章", team:[["pk-087",0],["pk-091",0],["pk-080",0],["pk-124",0],["pk-131",0]]},',
    '};',
    '/* 四天王 + 冠军（真实等级） */',
    'var REAL_E4=[',
    '  {name:"科拿", title:"四天王", type:"ice",    team:[["pk-087",52],["pk-091",51],["pk-080",52],["pk-124",54],["pk-131",54]]},',
    '  {name:"希巴", title:"四天王", type:"fight",  team:[["pk-095",51],["pk-107",53],["pk-106",53],["pk-095",54],["pk-068",56]]},',
    '  {name:"菊子", title:"四天王", type:"ghost",  team:[["pk-094",54],["pk-042",54],["pk-093",53],["pk-024",56],["pk-094",58]]},',
    '  {name:"阿渡", title:"四天王", type:"dragon", team:[["pk-130",56],["pk-148",54],["pk-148",54],["pk-142",58],["pk-149",60]]},',
    '  {name:"青绿", title:"冠军",   type:"nor",    team:[["pk-018",59],["pk-065",57],["pk-112",59],["pk-103",59],["pk-130",61],["pk-006",63]]},',
    '];',
    'var REGION_GYM='].join('\n'),
  '新增 REAL_GYMS / REAL_E4 真实数据表');

/* ── ② 建镇时用真实馆主名 ── */
rep(
  '    var cfg=REGION_GYM[reg];\n    buildTown(spot.x,spot.y,reg,cfg[0],cfg[1],cfg[2]);',
  ['    var cfg=REGION_GYM[reg];',
    '    /* v39：馆主名与道馆名改用真实数据 */',
    '    var _rg=REAL_GYMS[reg];',
    '    buildTown(spot.x,spot.y,reg,(_rg?_rg.type:cfg[0]),(_rg?_rg.gym.replace("道馆",""):cfg[1]),(_rg?_rg.leader:cfg[2]));'].join('\n'),
  '建镇时用真实馆主名');

/* ── ③ beginGymBattle 用真实队伍 ── */
rep(
  '  var pool=gymTeamPool(t,reg);\n  var team=[];\n  for(var i=0;i<n;i++){\n    var s=pool[Math.floor(Math.random()*pool.length)];\n    if(!s) break;\n    if(S && s && s.id) S.discovered[s.id]=1;                    /* v32：道馆对手也解锁图鉴 */\n    var _gf=initFighter(s, capLv, null, t.leaderName);\n    _gf.hp=maxHpOf(_gf);                     /* v30：馆主的宠一律满血（initFighter 有 90~110% 个体浮动） */\n    _gf.exp=0;\n    team.push(_gf);\n  }',
  ['  /* v39：优先用真实馆主队伍（成员与宝可梦原作一致），缺失时再按地区池抽 */',
    '  var _real=REAL_GYMS[reg];',
    '  var team=[];',
    '  if(_real && _real.team && _real.team.length){',
    '    _real.team.forEach(function(it){',
    '      var rs=byId(it[0]);',
    '      if(!rs) return;',
    '      if(S && rs.id) S.discovered[rs.id]=1;',
    '      var lv=(it[1]>0)?it[1]:capLv;',
    '      var f=initFighter(rs, lv, null, t.leaderName);',
    '      f.hp=maxHpOf(f); f.exp=0;',
    '      team.push(f);',
    '    });',
    '  }',
    '  if(!team.length){',
    '    var pool=gymTeamPool(t,reg);',
    '    for(var i=0;i<n;i++){',
    '      var s=pool[Math.floor(Math.random()*pool.length)];',
    '      if(!s) break;',
    '      if(S && s && s.id) S.discovered[s.id]=1;',
    '      var _gf=initFighter(s, capLv, null, t.leaderName);',
    '      _gf.hp=maxHpOf(_gf);',
    '      _gf.exp=0;',
    '      team.push(_gf);',
    '    }',
    '  }'].join('\n'),
  '道馆战用真实馆主队伍');

/* ── ④ 新增联盟连续战 ── */
rep('function openLeague(){',
  ['/* v39：联盟大赛 —— 依次挑战四天王与冠军（真实队伍与等级） */',
    'var LEAGUE_IDX=0;',
    'function beginLeagueBattle(idx){',
    '  if(B) return;',
    '  var who=REAL_E4[idx];',
    '  if(!who) return;',
    '  if(!S.party.length || !alivePets().length){ toast("全队倒下或没有伙伴，先去医院！"); return; }',
    '  var team=[];',
    '  who.team.forEach(function(it){',
    '    var s=byId(it[0]); if(!s) return;',
    '    var f=initFighter(s, it[1], null, who.name);',
    '    f.hp=maxHpOf(f); f.exp=0;',
    '    team.push(f);',
    '  });',
    '  if(!team.length){ toast("联盟数据异常"); return; }',
    '  LEAGUE_IDX=idx;',
    '  TB={t:{id:"e4-"+idx, name:who.name, emoji:"🏆", team:who.team.map(function(x){return x[0];})}, team:team, idx:0, league:true, leagueIdx:idx};',
    '  $("panel-gym").classList.add("hidden");',
    '  openBattle("trainer", {sp:team[0].sp, fighter:team[0]});',
    '}',
    'function openLeague(){'].join('\n'),
  '新增 beginLeagueBattle（四天王/冠军挑战）');
/* 联盟按钮：改成列出四天王 */
rep(
  '  var okL=$("gym-ok"); if(okL) okL.textContent="知道了";',
  ['  var okL=$("gym-ok"); if(okL) okL.textContent="知道了";',
    '  /* v39：集齐徽章后列出四天王与冠军，逐个挑战 */',
    '  gymPending=null;',
    '  var _pb=$("gym-ok");',
    '  if(n>=BADGE_MAX && _pb){',
    '    _pb.textContent="⚔️ 挑战四天王（第 "+(LEAGUE_IDX+1)+" 位）";',
    '    _pb.onclick=function(){ $("panel-gym").classList.add("hidden"); beginLeagueBattle(LEAGUE_IDX); };',
    '  }'].join('\n'),
  '联盟会场加入真实挑战入口');
/* 击败四天王后推进索引 */
rep(
  '    if(TB && TB.gym && TB.region){',
  ['    /* v39：打赢四天王/冠军 → 推进下一个 */',
    '    if(TB && TB.league){',
    '      LEAGUE_IDX=Math.min(REAL_E4.length, (TB.leagueIdx||0)+1);',
    '      if(LEAGUE_IDX>=REAL_E4.length) toast("🏆 你击败了冠军，成为新的联盟冠军！");',
    '      else toast("🏆 击败 "+TB.t.name+"！下一位："+REAL_E4[LEAGUE_IDX].name);',
    '      jingle();',
    '    }',
    '    if(TB && TB.gym && TB.region){'].join('\n'),
  '击败四天王推进进度');

const need = ['var REAL_GYMS={', 'var REAL_E4=[', 'function beginLeagueBattle(idx){', 'REAL_GYMS[reg]'];
need.forEach(n => { if (!work.includes(n)) { console.error('!! 校验失败，缺: ' + n); process.exit(1); } });
console.log('\n共 ' + done.length + ' 项改动' + (apply ? '' : '（未加 --apply，仅预演）'));
if (!apply) process.exit(0);
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE);
