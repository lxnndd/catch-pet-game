/* v83 补丁：联盟大会 128 强赛（完全按官方）
   官方规则 → 本作实现：
     ① 单败淘汰 128→64→32→16→8→4→决赛（7 轮）
     ② 中途**不自动回血**（本作战斗本来就不回血，天然符合）
     ③ **输一场就出局**，回到 128 强从头再来
     ④ 对手强度**随轮次递增**（等级 top-6+2r，人数 1→4）
     ⑤ **不能跳过**：连胜 7 轮拿到优胜，才有资格挑战四天王
   用法：node v83-patch.mjs [--apply] */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
if (src.includes('v83 联盟大会')) { console.log('已打过 v83'); process.exit(0); }
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const need = [];
function rep(old, nu, tag) {
  const n = work.split(old).length - 1;
  if (n !== 1) throw new Error('锚点 ' + tag + ' 命中 ' + n + ' 次');
  work = work.replace(old, nu); need.push(tag);
}

/* ① 大会常量 + 对手生成 + 开战 */
rep(`var LEAGUE_IDX=0;
function beginLeagueBattle(idx){`,
  `/* ══ v83 联盟大会 128 强赛（完全按官方）══
   官方联盟流程：大会是**单败淘汰**，128→64→32→16→8→4→决赛共 7 轮；
     · 中途**不自动回血**（HP/PP 一路带过去）
     · **输一场即出局**，必须从 128 强重新打起
     · 对手强度**随轮次递增**
     · **不能跳过**：连胜 7 轮拿到大会优胜，才有资格挑战四天王 */
var ARENA_ROUNDS=["128 强","64 强","32 强","16 强","8 强","4 强","决赛"];
var ARENA_NAMES=["阿明","小茜","健太","悠斗","小遥","阿彻","凛","翔太","美咲","大吾","叶月","阿步","小南","拓海","千夏","陆"];
function arenaTeam(round){
  var top=topPartyLv();
  var lv=Math.max(3, top-6+round*2);                 /* 强度随轮次递增 */
  var n=Math.min(4, 1+Math.floor(round/2));          /* 128强弱带 1 只，决赛 4 只 */
  var reg=regionAt(S.pos.x,S.pos.y);
  var pool=SPECIES.filter(function(s){ return !s.varOf && wildOk(s,reg); });
  if(!pool.length) pool=SPECIES.filter(function(s){ return !s.varOf; });
  var team=[];
  for(var i=0;i<n;i++){
    var sp=pool[ri(0,pool.length-1)];
    var f=initFighter(sp, lv, null, "大会");
    f.hp=maxHpOf(f); f.exp=0;
    team.push(f);
  }
  return team;
}
function beginArenaBattle(round){
  if(B) return;
  if(!S.party.length || !alivePets().length){ toast("全队倒下或没有伙伴，先去医院！"); return; }
  round=clamp(round||0, 0, ARENA_ROUNDS.length-1);
  var team=arenaTeam(round);
  if(!team.length){ toast("大会数据异常"); return; }
  var name=ARENA_NAMES[ri(0,ARENA_NAMES.length-1)];
  TB={t:{id:"arena-"+round, name:"训练家 "+name, emoji:"🎪", team:team.map(function(f){ return f.sp.id; })},
      team:team, idx:0, league:true, arena:true, arenaRound:round};
  $("panel-gym").classList.add("hidden");
  openBattle("trainer", {sp:team[0].sp, fighter:team[0]});
}
var LEAGUE_IDX=0;
function beginLeagueBattle(idx){`,
  'arenaCore');

/* ② 战胜后推进大会进度 */
rep(`    if(TB && TB.league){
      LEAGUE_IDX=Math.min(REAL_E4.length, (TB.leagueIdx||0)+1);`,
  `    /* v83：联盟大会 —— 晋级下一轮（不自动回血、不能跳过） */
    if(TB && TB.arena){
      var _ar=(TB.arenaRound||0)+1;
      S.arena=_ar;
      if(_ar>=ARENA_ROUNDS.length){
        S.arenaWin=1; save();
        toast("🏆 你赢下了大会决赛，成为本届联盟大会优胜者！接下来可以挑战四天王了！");
      }else{
        save();
        toast("🎪 晋级 "+ARENA_ROUNDS[_ar]+"！下一位对手在等你（注意：HP / PP 不会自动回复）");
      }
      jingle();
    }
    if(TB && TB.league && !TB.arena){
      LEAGUE_IDX=Math.min(REAL_E4.length, (TB.leagueIdx||0)+1);`,
  'arenaWin');

/* ③ 大会失败：全队倒下 → 进度归零（回到 128 强） */
rep(`function wipedRetreat(){
  var wasTrainer = B && B.mode==="trainer";
  var tn = wasTrainer && TB ? TB.t.name : null;`,
  `function wipedRetreat(){
  var wasTrainer = B && B.mode==="trainer";
  var tn = wasTrainer && TB ? TB.t.name : null;
  /* v83：联盟大会是单败淘汰 —— 输了就出局，得从 128 强重新打起 */
  if(TB && TB.arena){
    S.arena=0; save();
    log("🎪 你在"+ARENA_ROUNDS[clamp(TB.arenaRound||0,0,ARENA_ROUNDS.length-1)]+"止步了……大会是单败淘汰，下次得从 128 强重新打起。");
  }`,
  'arenaLose');

/* ④ 联盟面板：先打大会，赢了才有资格挑战四天王 */
rep(`  } else {
    var who=REAL_E4[LEAGUE_IDX]||REAL_E4[0];`,
  `  } else if(!S.arenaWin){
    /* v83：还没拿下联盟大会 → 必须先打大会（完全按官方：单败、不回血、强度递增、不能跳过） */
    var _r=clamp(S.arena||0, 0, ARENA_ROUNDS.length-1);
    var _rn=ARENA_ROUNDS[_r];
    $("gym-sub").textContent="徽章 "+n+" / "+BADGE_MAX+"　🎪 大会 "+_rn;
    $("gym-note").textContent="联盟大会正在进行 —— 现在是「"+_rn+"」。"+"\\n"+
      "· 单败淘汰：输一场就要从 128 强重新打起\\n"+
      "· 每场之间不会自动回复 HP / PP，打得越久越吃紧\\n"+
      "· 连胜 "+ARENA_ROUNDS.length+" 轮拿下大会优胜，才有资格挑战四天王";
    if(_pb){
      _pb.textContent="🎪 参加 "+_rn+" 的比赛";
      _pb.onclick=function(){ $("panel-gym").classList.add("hidden"); beginArenaBattle(S.arena||0); };
    }
  } else {
    var who=REAL_E4[LEAGUE_IDX]||REAL_E4[0];`,
  'arenaPanel');

if (work.indexOf('v83 联盟大会') < 0) throw new Error('未插入');
console.log('补丁点命中：' + need.join(' · '));
console.log('新长度 ' + Buffer.byteLength(work, 'utf8'));
if (!apply) { console.log('（预演）'); process.exit(0); }
if (!existsSync(ROOT + '/抓宠游戏-v12-clean.bak-v83.html')) copyFileSync(FILE, ROOT + '/抓宠游戏-v12-clean.bak-v83.html');
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入');
