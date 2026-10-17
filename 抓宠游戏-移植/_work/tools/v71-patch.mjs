/* v71 补丁：招式提示框改版
   用户要求：① 不要「游戏内效果：」那一行 ② 前面的介绍写详细
   做法：把招式效果**并入官方描述**，用自然语言详细说明（不再有生硬的标题行与括号说明）。
   顺带清空 FX_APPROX —— 那 5 条（守住/白雾/睡觉/治愈之愿/瞬间移动）在 v57~v69 都已按官方实现。
   用法：node v71-patch.mjs [--apply] */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v71.html';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
if (src.includes('v71 效果描述')) { console.log('已打过 v71，退出'); process.exit(0); }
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const need = [];
function rep(old, nu, tag) {
  const n = work.split(old).length - 1;
  if (n !== 1) throw new Error('锚点 ' + tag + ' 命中 ' + n + ' 次');
  work = work.replace(old, nu); need.push(tag);
}

const OLD_FX = `var FX_APPROX={
  "守住":"完全挡下对手本回合的攻击",
  "白雾":"5 回合内能力不会被降低",
  "睡觉":"睡 2 回合后回满 HP 并解除异常",
  "治愈之愿":"牺牲自己、回复之后上场的伙伴",
  "瞬间移动":"立刻从战斗中脱离"
};
function moveEffectText(mid){
  var mv=MOVES[mid]; if(!mv) return "";
  var exact=!!MOVE_FX[mv.name];
  var fx=fxOf(mv);
  function body(f){
    var parts=[];
    if(f.buff) Object.keys(f.buff).forEach(function(k){ parts.push("自身 "+stLabel(k)+" "+stageStr(f.buff[k])); });
    if(f.debuff) Object.keys(f.debuff).forEach(function(k){ parts.push("对手 "+stLabel(k)+" "+stageStr(-f.debuff[k])); });
    if(f.status && f.status.k) parts.push((f.status.chance?(Math.round(f.status.chance*100)+"% 概率"):"必定")+"让对手"+STATUS_NAME[f.status.k]);
    if(f.heal) parts.push("回复自身最大 HP 的 "+Math.round(f.heal*100)+"%");
    return parts.join(" · ");
  }
  if(!fx) return mv.power ? "直接造成伤害" : "暂无附加效果";
  var txt=body(fx);
  if(!txt) return mv.power ? "直接造成伤害" : "暂无附加效果";
  if(!exact) txt += "（官方机制本作未实现，这里按「"+(TYPE_NAME[mv.type]||mv.type)+"系变化技」的兜底效果处理）";
  else if(FX_APPROX[mv.name]) txt += "（官方为「"+FX_APPROX[mv.name]+"」，本作以这个效果近似）";
  return txt;
}`;

const NEW_FX = `/* ══ v71 效果描述 ══
   用户要求：不再单独显示「游戏内效果：」那一行，而是把效果**写进招式的介绍里**、并且写详细。
   官方机制在 v57~v70 已基本补齐，所以这里不再需要「未实现 / 近似」之类的括号说明。
   输出用自然语言（"自身攻击提升 1 级"而不是"自身 攻击 +1"）。 */
function _fieldTxt(k,n){
  return {ls:"5 回合内受到的特殊伤害减半",rf:"5 回合内受到的物理伤害减半",
          sg:"5 回合内不会陷入异常状态",tw:"4 回合内自身速度翻倍",
          lc:"5 回合内不会被击中要害"}[k] || ("场地效果 "+n+" 回合");
}
function _hazardTxt(k){
  return {spikes:"在对手场上撒菱：对手上场时受伤",
          sr:"在对手场上布隐形岩：对手上场时受伤更重",
          ts:"在对手场上撒毒菱：对手上场时中毒",
          web:"在对手场上布黏黏网：对手上场时速度下降"}[k] || "在对手场上布置陷阱";
}
function moveEffectText(mid){
  var mv=MOVES[mid]; if(!mv) return "";
  var fx=fxOf(mv);
  function body(f){
    var p=[], i;
    if(f.buff) Object.keys(f.buff).forEach(function(k){
      var v=f.buff[k];
      p.push("自身"+stLabel(k)+(v>0?("提升 "+v+" 级"):("下降 "+(-v)+" 级")));
    });
    if(f.debuff) Object.keys(f.debuff).forEach(function(k){
      p.push("对手"+stLabel(k)+"下降 "+f.debuff[k]+" 级");
    });
    if(f.status && f.status.k) p.push((f.status.chance?(Math.round(f.status.chance*100)+"% 概率令"):"令")+"对手陷入"+STATUS_NAME[f.status.k]);
    if(f.heal) p.push("回复自身最大 HP 的 "+Math.round(f.heal*100)+"%");
    if(f.drain) p.push("吸收所造成伤害的 "+Math.round(f.drain*100)+"% 来回复自身");
    if(f.flinch) p.push(Math.round(f.flinch*100)+"% 概率让对手畏缩而无法行动");
    if(f.confuse) p.push((f.confuse>=1?"":Math.round(f.confuse*100)+"% 概率")+"令对手陷入混乱");
    if(f.taunt) p.push("令对手在 "+f.taunt+" 回合内只能使用攻击招式");
    if(f.disable) p.push("封住对手最近使用的招式，持续 "+f.disable+" 回合");
    if(f.seed) p.push("在对手身上种下寄生种子，每回合吸取它的体力");
    if(f.trap) p.push("束缚住对手，每回合持续造成伤害");
    if(f.ingrain) p.push("扎根于地面，每回合回复自身体力");
    if(f.nightmare) p.push("让睡眠中的对手被恶梦折磨");
    if(f.healBlock) p.push("封锁对手的回复手段，持续 "+f.healBlock+" 回合");
    if(f.torment) p.push("让对手无法连续使用同一招");
    if(f.yawn) p.push("让对手昏昏欲睡，下回合陷入睡眠");
    if(f.perish) p.push("响起灭亡之歌，3 回合后双方一起倒下");
    if(f.protect) p.push("撑起保护罩，完全挡下对手本回合的攻击");
    if(f.noImmune) p.push("看穿对手，本回合无视其属性免疫");
    if(f.mist) p.push("升起白雾，"+f.mist+" 回合内自身能力不会被对手降低");
    if(f.selfSleep) p.push("自身陷入睡眠 "+f.selfSleep+" 回合");
    if(f.selfFaint) p.push("自身倒下");
    if(f.teamHeal) p.push("全队回复体力");
    if(f.field) p.push(_fieldTxt(f.field.k,f.field.n));
    if(f.hazard) p.push(_hazardTxt(f.hazard.k));
    if(f.counter) p.push("把上一次受到的"+(f.counter==="physical"?"物理":"特殊")+"伤害以 2 倍奉还给对手");
    if(f.charge) p.push("第一回合蓄力，第二回合才发动攻击");
    if(f.bellyDrum) p.push("HP 减半，换取攻击提升到极限");
    if(f.embargo) p.push("查封对手，"+f.embargo+" 回合内它无法使用道具");
    if(f.swapStages) p.push("互换双方的能力变化");
    if(f.acuRandom) p.push("随机大幅提升自身的一项能力");
    if(f.helping) p.push("本回合造成的伤害提升 50%");
    if(f.meFirst) p.push("抢先模仿对手刚使用过的招式");
    if(f.fixedDamage==="level") p.push("造成的伤害固定等于自身等级");
    if(f.endeavor) p.push("把对手的 HP 拉低到与自己当前 HP 相同");
    if(f.ohko) p.push("30% 概率一击必杀（命中即令对手倒下）");
    if(f.onKO) p.push("若用这招击倒对手，自身攻击将大幅提升");
    if(f.endure) p.push("受到致命伤害时至少留下 1 HP");
    if(f.hits) p.push("连续攻击 "+f.hits[0]+"~"+f.hits[1]+" 次");
    if(f.critRate) p.push("容易击中要害");
    if(f.statChance && f.statChance<100) p.push("（上述能力变化有 "+f.statChance+"% 概率触发）");
    return p;
  }
  if(!fx) return mv.power ? ("造成 "+mv.power+" 威力伤害") : "";
  var arr=body(fx);
  if(!arr.length) return mv.power ? ("造成 "+mv.power+" 威力伤害") : "";
  return arr.join("；")+"。";
}`;
rep(OLD_FX, NEW_FX, 'moveEffectText');

/* 提示框：效果并入描述，去掉「游戏内效果：」那一行 */
rep(`  if(mv.desc){ var d=document.createElement("div"); d.className="mi-desc"; d.textContent=mv.desc; el.appendChild(d); }
  var f=document.createElement("div"); f.className="mi-fx"; f.textContent="游戏内效果："+moveEffectText(mid); el.appendChild(f);`,
  `  /* v71：官方描述 + 效果说明**合成一段**，不再单独占一行「游戏内效果：」 */
  var eff=moveEffectText(mid);
  var body=(mv.desc||"") + (eff ? ((mv.desc?"\\n\\n":"")+eff) : "");
  if(body){ var d=document.createElement("div"); d.className="mi-desc"; d.textContent=body; el.appendChild(d); }`,
  'moveInfo');

if (work.indexOf('v71 效果描述') < 0) throw new Error('未插入');
console.log('补丁点命中：' + need.join(' · '));
console.log('新长度 ' + Buffer.byteLength(work, 'utf8'));
if (!apply) { console.log('（预演）'); process.exit(0); }
if (!existsSync(BAK)) copyFileSync(FILE, BAK);
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入');
