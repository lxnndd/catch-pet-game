/* v75 补丁：掉包封闭 · 声音招式+地狱突刺 · 空中状态+击落 · 意念移物 · 三重攻击 · 滚动/冰球
   用法：node v75-patch.mjs [--apply] */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v75.html';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
if (src.includes('v75 声音与空中')) { console.log('已打过 v75'); process.exit(0); }
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const need = [];
function rep(old, nu, tag) {
  const n = work.split(old).length - 1;
  if (n !== 1) throw new Error('锚点 ' + tag + ' 命中 ' + n + ' 次');
  work = work.replace(old, nu); need.push(tag);
}

/* ── ① 声音招式表 + 能打中空中的招式表（放在 vsSet 之前）── */
rep(`function vsSet(p,k,v){ if(p&&p.st) p.st[k]=v; }`,
  `/* ══ v75 声音与空中 ══
   声音类招式：PokéAPI 的 flags 里**没有** sound 标记，按官方百科的「声音类招式」清单手工建表
   （地狱突刺会让对手 2 回合内无法使用这些招）。
   空中状态：使用飞翔/弹跳/自由落体时进入；只有官方指定的一批招式能打中，其余一律落空；
   击落可以把目标从空中打下来，并打断它正在蓄力的招。 */
var SOUND_MOVES=(function(){
  var a=["叫声","吼叫","唱歌","超音波","刺耳声","打鼾","终焉之歌","治愈铃声","黑暗恐慌","吵闹","巨声",
         "金属音","草笛","长嚎","虫鸣","喋喋不休","轮唱","回声","古老之歌","大声咆哮","战吼","魅惑之声",
         "抛下狠话","爆音波","密语","泡影的咏叹调","鳞片噪音","炽魂热舞烈音爆","魂舞烈音爆","破音",
         "诡异咒语","闪焰高歌","龙声鼓舞","魅诱之声","精神噪音"];
  var o={}; a.forEach(function(n){ o[n]=1; }); return o;
})();
/* 能击中「空中状态」的招式（官方：高速星星/起风/打雷/吹飞/龙卷风/冲天拳/击落/暴风/音爆/千箭齐发/剧毒） */
var AIR_HIT=(function(){
  var a=["高速星星","起风","打雷","吹飞","龙卷风","冲天拳","击落","暴风","音爆","千箭齐发","剧毒"];
  var o={}; a.forEach(function(n){ o[n]=1; }); return o;
})();
/* 会让自己飞上天空的招（蓄力期间处于空中状态） */
var AIR_MOVES=(function(){
  var a=["飞翔","弹跳","自由落体"];
  var o={}; a.forEach(function(n){ o[n]=1; }); return o;
})();
function vsSet(p,k,v){ if(p&&p.st) p.st[k]=v; }`,
  'soundAirTables');

/* ── ② moveAllowed：沉默禁声音招 · 掉包封闭 ── */
rep(`  var dis=vsGet(p,"disable");
  if(dis && dis.mid===mv.name && dis.t>0) return false;
  if(vsGet(p,"torment") && p.lastMove===mv.name) return false;
  return true;
}`,
  `  var dis=vsGet(p,"disable");
  if(dis && dis.mid===mv.name && dis.t>0) return false;
  if(vsGet(p,"torment") && p.lastMove===mv.name) return false;
  /* v75：地狱突刺（沉默）—— 2 回合内无法使用声音类招式 */
  if(vsGet(p,"silence")>0 && SOUND_MOVES[mv.name]) return false;
  /* v75：掉包暂时封闭（官方是与对手交换持有道具，本作没有道具系统） */
  var _f=fxOf(mv);
  if(_f && _f.blocked) return false;
  return true;
}`,
  'moveAllowed');

rep(`  if(vsGet(p,"torment") && p.lastMove===mv.name) return "被无理取闹了，不能连续使用同一招！";
  return "";`,
  `  if(vsGet(p,"torment") && p.lastMove===mv.name) return "被无理取闹了，不能连续使用同一招！";
  if(vsGet(p,"silence")>0 && SOUND_MOVES[mv.name]) return "被地狱突刺封住了声音，无法使用这类招式！";
  var _f2=fxOf(mv);
  if(_f2 && _f2.blocked) return _f2.blocked;
  return "";`,
  'whyBlocked');

/* ── ③ applyMove 开头：掉包封闭 + 空中状态命中判定 ── */
rep(`  var _accBase=(_fxAcc && _fxAcc.ohko) ? 100 : ((mv.acc===undefined||mv.acc===null)?100:mv.acc);`,
  `  var _accBase=(_fxAcc && _fxAcc.ohko) ? 100 : ((mv.acc===undefined||mv.acc===null)?100:mv.acc);
  /* v75：意念移物 —— 目标浮在空中时，我方招式必中 */
  if(vsGet(defF,"tk")>0) _accBase=100;`,
  'telekinesisAcc');

/* ── ④ 空中状态：打不中就落空（插在命中判定之后）── */
rep(`  /* v57：守住（protect）—— 完全挡下对手本回合的攻击 */`,
  `  /* ══ v75：空中状态 ══
     对手在空中的回合（飞翔/弹跳/自由落体的蓄力期），只有官方指定的一批招式能打中，
     其余一律落空；「击落」还能把它从空中打下来。 */
  if(vsGet(defF,"air") && !AIR_HIT[mv.name]){
    lines.push("💨 "+defSp.name+" 飞在空中，" + mv.name + " 打不中它！");
    return lines;
  }
  /* v57：守住（protect）—— 完全挡下对手本回合的攻击 */`,
  'airMiss');

/* ── ⑤ 蓄力招：飞翔/弹跳/自由落体进入空中状态 ── */
rep(`      vsSet(atkF,"charging",mv.name);
      lines.push("⚡ "+atkSp.name+" 开始蓄力……（下回合发动 "+mv.name+"）");
      return lines;`,
  `      vsSet(atkF,"charging",mv.name);
      if(AIR_MOVES[mv.name]){
        vsSet(atkF,"air",true);
        lines.push("🕊 "+atkSp.name+" 飞上了天空……（下回合发动 "+mv.name+"）");
      }else{
        lines.push("⚡ "+atkSp.name+" 开始蓄力……（下回合发动 "+mv.name+"）");
      }
      return lines;`,
  'airCharge');

rep(`      vsClear(atkF,"charging");
      lines.push("⚡ "+atkSp.name+" 蓄力完成，发动 "+mv.name+"！");`,
  `      vsClear(atkF,"charging");
      vsClear(atkF,"air");
      lines.push("⚡ "+atkSp.name+" 蓄力完成，发动 "+mv.name+"！");`,
  'airLand');

/* ── ⑥ 滚动/冰球：连续使用威力翻倍 ── */
rep(`  var _specDmg=_ax && (_ax.fixedDamage || _ax.endeavor || _ax.ohko);`,
  `  /* ══ v75：滚动 / 冰球 —— 连续使用威力逐次翻倍，中断则重来 ══ */
  if(_ax && _ax.rollout){
    var _rn=(vsGet(atkF,"rollN")||0)+1;
    vsSet(atkF,"rollN",_rn);
    if(_rn>1){ dmg=Math.round(dmg*Math.pow(2,_rn-1)); lines.push("🌀 连续第 "+_rn+" 次，威力提升！"); }
  }else if(atkF && !vsGet(atkF,"charging")){
    vsClear(atkF,"rollN");
  }
  var _specDmg=_ax && (_ax.fixedDamage || _ax.endeavor || _ax.ohko);`,
  'rollout');

/* ── ⑦ 附加状态：沉默 / 意念移物 / 击落 / 三重攻击 / 掉包 ── */
rep(`  if(fx.embargo){ vsSet(defF,"embargo",fx.embargo); lines.push("🚫 "+dN+" 被查封了，"+fx.embargo+" 回合内无法使用道具！"); }`,
  `  if(fx.embargo){ vsSet(defF,"embargo",fx.embargo); lines.push("🚫 "+dN+" 被查封了，"+fx.embargo+" 回合内无法使用道具！"); }
  /* v75 */
  if(fx.silence){ vsSet(defF,"silence",fx.silence); lines.push("🔇 "+dN+" 被地狱突刺封住了声音，"+fx.silence+" 回合内无法使用声音类招式！"); }
  if(fx.telekinesis){ vsSet(defF,"tk",fx.telekinesis); lines.push("🔮 "+dN+" 浮到了空中（"+fx.telekinesis+" 回合内我方招式必中）！"); }
  if(fx.breakAir){
    if(vsGet(defF,"air")){ vsClear(defF,"air"); lines.push("💥 "+dN+" 被击落了，从空中摔了下来！"); }
    if(vsGet(defF,"charging")){ var _c=vsGet(defF,"charging"); vsClear(defF,"charging"); lines.push("💥 "+dN+" 正在蓄力的「"+_c+"」被打断了！"); }
  }
  if(fx.triStatus && Math.random()<fx.triStatus){
    var _k=["burn","para","freeze"][ri(0,2)];
    if(setStatus(defF,_k)) lines.push("✨ 三重攻击的追加效果： "+dN+" 陷入了"+STATUS_NAME[_k]+"状态！");
  }
  if(fx.blocked){ lines.push("⛔ "+mv.name+" 暂未开放：" + fx.blocked); return; }`,
  'newVolatile');

/* ── ⑧ tickBoard：沉默 / 意念移物 递减 ── */
rep(`  ["taunt","healBlock","noImmune"].forEach(function(k){`,
  `  ["taunt","healBlock","noImmune","silence","tk"].forEach(function(k){   /* v75 加入沉默与意念移物 */`,
  'tickNew');

if (work.indexOf('v75 声音与空中') < 0) throw new Error('未插入');
console.log('补丁点命中：' + need.join(' · '));
console.log('新长度 ' + Buffer.byteLength(work, 'utf8'));
if (!apply) { console.log('（预演）'); process.exit(0); }
if (!existsSync(BAK)) copyFileSync(FILE, BAK);
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入');
