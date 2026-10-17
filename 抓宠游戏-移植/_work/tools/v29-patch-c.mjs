/* v29 批次 C：道馆实装（相同数量的宝可梦对战，馆主等级 = 地区上限，打赢发徽章）
   用法：node v29-patch-c.mjs --apply */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v29c.html';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const done = [];
const rep = (a, b, tag) => {
  if (!work.includes(a)) { console.error('  !! 找不到锚点: ' + tag); process.exit(1); }
  work = work.replace(a, b); done.push(tag); console.log('  [改动] ' + tag);
};

/* ── 1. beginGymBattle + 队伍池 + 地区判定（插在 beginTrainerBattle 之前） ── */
rep(
  'function beginTrainerBattle(t){',
  ['/* ══ v29 道馆对战 ══',
    '   规则（用户指定）：馆主与玩家出「相同数量」的宝可梦，馆主的等级 = 该地区等级上限。',
    '   野外 NPC 已全部移除，训练师对战统一收拢到道馆。 */',
    'var gymPending=null;',
    'function gymRegion(t){',
    '  if(!t || !t.gym) return "plain";',
    '  return regionAt(t.gym.x, t.gym.y);',
    '}',
    'function gymTeamPool(t, reg){',
    '  /* 优先该地区可野生、且属性对得上馆主的宠；不够再退回该地区任意可野生宠 */',
    '  var hit=SPECIES.filter(function(s){ return wildOk(s,reg) && (s.type===t.gymType || s.type2===t.gymType); });',
    '  if(hit.length>=3) return hit;',
    '  var reg2=SPECIES.filter(function(s){ return wildOk(s,reg); });',
    '  if(reg2.length) return reg2;',
    '  var any=SPECIES.filter(function(s){ return s.type===t.gymType || s.type2===t.gymType; });',
    '  return any.length ? any : SPECIES;',
    '}',
    'function beginGymBattle(t){',
    '  if(B) return;',
    '  if(!t) return;',
    '  if(!S.party.length){ toast("你还没有伙伴，先去仓库领一只！"); return; }',
    '  if(!alivePets().length){ toast("全队都倒下了，先去医院治疗再来挑战！"); return; }',
    '  var reg=gymRegion(t);',
    '  var capLv=(LV_RANGE[reg]||[1,25])[1];              /* 馆主等级 = 该地区等级上限 */',
    '  var n=clamp(S.party.length,1,PARTY_MAX);            /* 与玩家队伍数量相同 */',
    '  var pool=gymTeamPool(t,reg);',
    '  var team=[];',
    '  for(var i=0;i<n;i++){',
    '    var s=pool[Math.floor(Math.random()*pool.length)];',
    '    if(!s) break;',
    '    team.push(initFighter(s, capLv, null, t.leaderName));',
    '  }',
    '  if(!team.length){ toast("道馆数据异常，稍后再来。"); return; }',
    '  TB={t:t, team:team, idx:0, gym:true, region:reg};',
    '  $("panel-gym").classList.add("hidden");',
    '  openBattle("trainer", {sp:team[0].sp, fighter:team[0]});',
    '}',
    'function beginTrainerBattle(t){'].join('\n'),
  '新增 gymPending / gymRegion / gymTeamPool / beginGymBattle');

/* ── 2. openGym 重写：从「闭馆」改成可挑战 ── */
rep(
  ['function openGym(t){',
    '  var tn=(typeof TYPE_NAME!=="undefined" && TYPE_NAME[t.gymType]) ? TYPE_NAME[t.gymType] : t.gymType;',
    '  $("gym-title").textContent="🏛️ "+t.gymName;',
    '  $("gym-emoji").textContent="🏛️";',
    '  $("gym-name").textContent=t.gymName;',
    '  $("gym-sub").textContent=t.name+" · "+tn+"系 · 馆主 "+t.leaderName;',
    '  $("gym-note").textContent="馆主 "+t.leaderName+" 出门修行去了，道馆暂时闭馆。\\n（道馆对战正在建设中，等做好了再来挑战拿徽章吧～）";',
    '  $("panel-gym").classList.remove("hidden");',
    '}'].join('\n'),
  ['function openGym(t){',
    '  var tn=(typeof TYPE_NAME!=="undefined" && TYPE_NAME[t.gymType]) ? TYPE_NAME[t.gymType] : t.gymType;',
    '  var reg=gymRegion(t);',
    '  var capLv=(LV_RANGE[reg]||[1,25])[1];',
    '  var have=(S.badges||[]).indexOf(reg)>=0;',
    '  var n=clamp(S.party.length,1,PARTY_MAX);',
    '  $("gym-title").textContent="🏛️ "+t.gymName;',
    '  $("gym-emoji").textContent="🏛️";',
    '  $("gym-name").textContent=t.gymName;',
    '  $("gym-sub").textContent=t.name+" · "+tn+"系 · 馆主 "+t.leaderName;',
    '  $("gym-note").textContent="馆主 "+t.leaderName+" 的伙伴清一色 "+tn+"系，等级 Lv."+capLv+"（"+REGION_NAME[reg]+"的等级上限）。\\n"',
    '    +"挑战规则：双方各出 "+n+" 只（与你队伍数量相同），全部打赢就能拿到徽章。\\n"',
    '    +(have ? "（这枚徽章你已经拿到了，可以再来练练手）" : "（目前徽章 "+badgeCount()+"/"+BADGE_MAX+"）");',
    '  var ok=$("gym-ok"); if(ok) ok.textContent = have ? "⚔️ 再打一场" : "⚔️ 挑战馆主";',
    '  gymPending=t;',
    '  $("panel-gym").classList.remove("hidden");',
    '}'].join('\n'),
  'openGym 改为可挑战馆主');

/* ── 3. openLeague 清空 gymPending（复用同一个弹窗） ── */
rep(
  'function openLeague(){\n  var n=badgeCount();',
  'function openLeague(){\n  gymPending=null;\n  var n=badgeCount();',
  'openLeague 清空 gymPending');
rep(
  '  if(n>=BADGE_MAX) $("gym-note").textContent="你已集齐 "+BADGE_MAX+" 枚徽章，冠军之路即将开启……\\n（联盟大赛正在建设中，敬请期待）";',
  '  if(n>=BADGE_MAX) $("gym-note").textContent="你已集齐 "+BADGE_MAX+" 枚徽章，冠军之路即将开启……\\n（联盟大赛正在建设中，敬请期待）";\n  var okL=$("gym-ok"); if(okL) okL.textContent="知道了";',
  'openLeague 恢复按钮文案');

/* ── 4. gym-ok 按钮：点「挑战」直接开打 ── */
rep(
  'if($("gym-ok")) $("gym-ok").addEventListener("click",function(){ $("panel-gym").classList.add("hidden"); });',
  ['/* v29：道馆弹窗的按钮 —— 有待挑战的道馆就直接开打 */',
    'if($("gym-ok")) $("gym-ok").addEventListener("click",function(){',
    '  $("panel-gym").classList.add("hidden");',
    '  var _t=gymPending; gymPending=null;',
    '  if(_t && !B) beginGymBattle(_t);',
    '});'].join('\n'),
  'gym-ok 点击触发道馆战');

/* ── 5. 打赢道馆 → 发徽章 ── */
rep(
  '    if(!S.beaten[t.id]){ S.beaten[t.id]=1; toast("🏅 首次击破 "+t.name+"！"); }',
  ['    if(!S.beaten[t.id]){ S.beaten[t.id]=1; toast("🏅 首次击破 "+t.name+"！"); }',
    '    /* v29：道馆战全胜 → 发放徽章（按地区记，一个地区一枚） */',
    '    if(TB && TB.gym && TB.region){',
    '      S.badges=S.badges||[];',
    '      if(S.badges.indexOf(TB.region)<0){',
    '        S.badges.push(TB.region);',
    '        toast("🏅 获得「"+REGION_NAME[TB.region]+"」徽章！ 徽章 "+badgeCount()+"/"+BADGE_MAX);',
    '        jingle();',
    '      }',
    '    }'].join('\n'),
  '道馆战胜利发放徽章');

/* ── 校验 ── */
const need = ['function beginGymBattle(t)', 'function gymTeamPool(t, reg)', 'var gymPending=null;',
  'gymPending=t;', 'if(TB && TB.gym && TB.region)', 'ok.textContent = have ? "⚔️ 再打一场" : "⚔️ 挑战馆主";'];
need.forEach(n => { if (!work.includes(n)) { console.error('!! 校验失败，缺: ' + n); process.exit(1); } });
if (work.includes('出门修行去了')) { console.error('!! 闭馆文案仍在'); process.exit(1); }
console.log('\n共 ' + done.length + ' 项改动' + (apply ? '' : '（未加 --apply，仅预演）'));
if (!apply) process.exit(0);
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE + ' (' + Buffer.byteLength(work, 'utf8') + ' 字节)');
