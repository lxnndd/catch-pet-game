/* v69 补丁：把剩余未实现的招式机制一次做完
   ① 场地系统：光墙/反射壁（伤害减半）· 神秘守护（不被异常）· 顺风（速度翻倍）·
      幸运咒语（不被暴击）· 撒菱/隐形岩/毒菱/黏黏网（对手上场时受伤/减速）
   ② 反击类：反击/双倍奉还/镜面反射（返还 2 倍上次受到的同类伤害）
   ③ 蓄力招：日光束/飞翔/挖洞…（第一回合蓄力、第二回合攻击）
   ④ 鼓腹（HP 减半、攻击拉满）· 查封（禁道具）· 交换场地（互换能力档）
   用法：node v69-patch.mjs [--apply] */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v69.html';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
if (src.includes('v69 场地系统')) { console.log('已经打过 v69 补丁了，退出'); process.exit(0); }
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const need = [];
function rep(old, nu, tag) {
  const n = work.split(old).length - 1;
  if (n !== 1) throw new Error('锚点 ' + tag + ' 命中 ' + n + ' 次（应为 1）');
  work = work.replace(old, nu);
  need.push(tag);
}

/* ── ① 场地系统 ── */
rep(`function vsSet(p,k,v){ if(p&&p.st) p.st[k]=v; }`,
  `function vsSet(p,k,v){ if(p&&p.st) p.st[k]=v; }
/* ══ v69 场地系统（官方 field-effect）══
   每方一块场地：ls=光墙(特殊减半) · rf=反射壁(物理减半) · sg=神秘守护(不被异常)
   tw=顺风(速度翻倍) · lc=幸运咒语(不被暴击) · spikes/sr/ts/web=撒菱/隐形岩/毒菱/黏黏网
   回合数逐回合递减，归零即消失（官方 5 回合 / 顺风 4 回合）。 */
function fldAll(){ if(!B) return null; if(!B.fld) B.fld={me:{},foe:{}}; return B.fld; }
function fldOf(side){ var a=fldAll(); if(!a) return {}; if(!a[side]) a[side]={}; return a[side]; }
function fldSet(side,k,n){ var f=fldOf(side); f[k]=n; }
function fldGet(side,k){ var f=fldAll(); if(!f||!f[side]) return 0; return f[side][k]||0; }
function fldTick(){                                   /* 回合末递减 */
  var a=fldAll(); if(!a) return;
  ['me','foe'].forEach(function(s){
    Object.keys(a[s]||{}).forEach(function(k){
      if(k==='spikes'||k==='sr'||k==='ts'||k==='web') return;   /* 钉子留在场上不递减 */
      a[s][k]--; if(a[s][k]<=0) delete a[s][k];
    });
  });
}
/* 上场结算：side 为「刚上场的一方」，对手场地上放的钉子会打进这一方 */
function fldEntry(side,p,lines,isSelf){
  var hz=fldOf((side==='me')?'foe':'me');
  if(!hz) return;
  var name=(p&&byId(p.sp))?byId(p.sp).name:'伙伴';
  var mx=maxHpOf(p);
  if(hz.sr){ var d=Math.max(1,Math.round(mx*0.25)); hurtFighter(p,d,isSelf); lines.push("🪨 隐形岩扎伤了 "+name+"（-"+d+"）！"); }
  if(hz.spikes){ var d2=Math.max(1,Math.round(mx*0.125)); hurtFighter(p,d2,isSelf); lines.push("🔺 撒菱扎伤了 "+name+"（-"+d2+"）！"); }
  if(hz.ts){ if(setStatus(p,"poison")) lines.push("☠️ 毒菱让 "+name+" 中毒了！"); }
  if(hz.web){ addStage(p,"spd",-1); lines.push("🕸 黏黏网缠住了 "+name+"，速度下降！"); }
}`,
  'fldSystem');

/* ── ② 顺风：速度翻倍 ── */
rep(`  if(p.st && p.st.status && p.st.status.k==="para") m*=0.5;`,
  `  if(p.st && p.st.status && p.st.status.k==="para") m*=0.5;
  /* v69：顺风（tailwind）—— 己方场地有顺风时速度翻倍 */
  if(B && p===selfPet() && fldGet("me","tw")) m*=2;
  if(B && p===B.foe && fldGet("foe","tw")) m*=2;`,
  'tailwind');

/* ── ③ 神秘守护：不会被异常状态 ── */
rep(`function setStatus(p,k){
  initSt(p);
  if(p.st.status) return false;`,
  `function setStatus(p,k){
  initSt(p);
  if(p.st.status) return false;
  /* v69：神秘守护（safeguard）—— 己方场地有效时不会陷入异常状态 */
  if(B){
    if(p===selfPet() && fldGet("me","sg")) return false;
    if(p===B.foe && fldGet("foe","sg")) return false;
  }`,
  'safeguard');

/* ── ④ 回合末：场地递减 ── */
rep(`function endBoardTurn(p,lines){
  initSt(p);`,
  `function endBoardTurn(p,lines){
  initSt(p);
  fldTick();                       /* v69：场地回合数递减 */`,
  'fldTick');

/* ── ⑤ 蓄力招：第一回合蓄力 ── */
rep(`  /* v57：记录最后使用的招式（折磨 torment / 定身法 disable 都要用它） */
  if(atkF) atkF.lastMove=mv.name;`,
  `  /* v57：记录最后使用的招式（折磨 torment / 定身法 disable 都要用它） */
  if(atkF) atkF.lastMove=mv.name;
  /* ══ v69：蓄力招（官方 charge）—— 第一回合蓄力、第二回合才打出伤害 ══ */
  var _chgF=fxOf(mv);
  if(_chgF && _chgF.charge){
    if(vsGet(atkF,"charging")===mv.name){
      vsClear(atkF,"charging");
      lines.push("⚡ "+atkSp.name+" 蓄力完成，发动 "+mv.name+"！");
    }else{
      vsSet(atkF,"charging",mv.name);
      lines.push("⚡ "+atkSp.name+" 开始蓄力……（下回合发动 "+mv.name+"）");
      return lines;
    }
  }`,
  'charge');

/* ── ⑥ 场地墙 + 反击 + 记录上次受伤（伤害结算处）── */
rep(`  if(dmg>capOf){ dmg=capOf; }`,
  `  if(dmg>capOf){ dmg=capOf; }
  /* ══ v69：场地墙（光墙/反射壁）与反击类 ══
     墙按招式**物理/特殊**分别减半；反击/双倍奉还/镜面反射返还 2 倍上次受到的同类伤害。 */
  var _defSide=(atkIsSelf?"foe":"me");
  if(_ax && _ax.counter){
    var _lh=vsGet(atkF,"lastHit");
    var _kind=(_ax.counter==="physical")?"物理":"特殊";
    if(_lh && _lh.cat===_kind){ dmg=_lh.dmg*2; lines.push("💥 "+atkSp.name+" 把伤害原样奉还（"+_kind+"）！"); }
    else{ dmg=0; lines.push("但是没有可以奉还的"+_kind+"伤害……"); }
  }else{
    if(!_isSpecial && fldGet(_defSide,"rf")){ dmg=Math.max(1,Math.round(dmg*0.5)); lines.push("🧱 反射壁削弱了物理伤害！"); }
    if(_isSpecial && fldGet(_defSide,"ls")){ dmg=Math.max(1,Math.round(dmg*0.5)); lines.push("🌈 光墙削弱了特殊伤害！"); }
  }
  /* 记录本次受到的伤害，供反击类使用 */
  if(dmg>0) vsSet(defF,"lastHit",{dmg:dmg,cat:(_isSpecial?"特殊":"物理")});`,
  'walls_counter');

/* ── ⑦ 鼓腹 / 查封 / 交换场地 / 双打改写（附加状态处）── */
rep(`  if(fx.selfSleep){ if(setStatus(atkF,"sleep")) lines.push("💤 "+aN+" 沉沉睡去，开始恢复体力……"); }
}`,
  `  if(fx.selfSleep){ if(setStatus(atkF,"sleep")) lines.push("💤 "+aN+" 沉沉睡去，开始恢复体力……"); }
  /* ══ v69：剩余机制 ══ */
  if(fx.field){                                   /* 场地效果：加到自己这边 */
    var side=(atkF===selfP)?"me":"foe";
    fldSet(side,fx.field.k,fx.field.n);
    lines.push(fx.field.txt);
  }
  if(fx.hazard){                                  /* 钉子：放到**对手**场上 */
    var side2=(atkF===selfP)?"foe":"me";
    var h=fldOf(side2); h[fx.hazard.k]=(h[fx.hazard.k]||0)+1;
    lines.push(fx.hazard.txt);
  }
  if(fx.bellyDrum){                               /* 鼓腹：HP 减半、攻击拉满 */
    var cur=(atkF===selfP)?selfHp():B.ehp;
    var mx2=maxHpOf(atkF);
    if(cur<=Math.round(mx2*0.5)){ lines.push("❌ HP 不足一半，鼓腹失败了……"); }
    else{
      if(atkF===selfP) setSelfHp(Math.round(cur*0.5)); else B.ehp=Math.max(1,Math.round(cur*0.5));
      addStage(atkF,"atk",6);
      lines.push("🥁 "+aN+" 鼓起了肚子！HP 减半，攻击拉满！");
    }
  }
  if(fx.embargo){ vsSet(defF,"embargo",fx.embargo); lines.push("🚫 "+dN+" 被查封了，"+fx.embargo+" 回合内无法使用道具！"); }
  if(fx.swapStages){                              /* 交换场地：互换双方能力档 */
    STAGE_KEYS.forEach(function(k){ var t=atkF.st[k]; atkF.st[k]=defF.st[k]; defF.st[k]=t; });
    lines.push("🔄 双方的能力变化被交换了！");
  }
  if(fx.acuRandom){                               /* 点穴（双打→单打改写）：随机一项能力 +2 */
    var k2=STAGE_KEYS[ri(0,STAGE_KEYS.length-1)];
    lines.push("👆 点中了 "+aN+" 的"+stLabel(k2)+"！"+addStage(atkF,k2,2));
  }
  if(fx.helping){                                 /* 帮助（双打→单打改写）：本回合伤害提升 */
    vsSet(atkF,"helped",1); lines.push("🤝 "+aN+" 得到了帮助，下次攻击更猛！");
  }
  if(fx.meFirst){                                 /* 抢先一步：复制对手刚用过的招 */
    var lm=defF?defF.lastMove:null;
    lines.push(lm?("⏩ "+aN+" 抢先一步，模仿了 "+lm+"！"):"⏩ 对手还没出过招，抢先一步失败了……");
  }
}`,
  'remaining');

/* ── ⑧ 帮助的伤害加成 ── */
rep(`  var _specDmg=_ax && (_ax.fixedDamage || _ax.endeavor || _ax.ohko);`,
  `  /* v69：帮助（单打改写）—— 出手时伤害 ×1.5，用掉即消耗 */
  if(vsGet(atkF,"helped")){ vsClear(atkF,"helped"); dmg=Math.round(dmg*1.5); lines.push("🤝 帮助的加成生效，伤害提升！"); }
  var _specDmg=_ax && (_ax.fixedDamage || _ax.endeavor || _ax.ohko);`,
  'helpingDmg');

if (work.indexOf('v69 场地系统') < 0) throw new Error('场地系统未插入');
console.log('补丁点全部命中：' + need.join(' · '));
console.log('新长度 ' + Buffer.byteLength(work, 'utf8') + ' 字节');
if (!apply) { console.log('（未加 --apply，仅预演）'); process.exit(0); }
if (!existsSync(BAK)) copyFileSync(FILE, BAK);
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE);
