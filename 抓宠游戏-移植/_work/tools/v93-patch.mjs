/* v93 补丁：① 神兽刷新权重下调 ② 变身（百变怪）机制
   用法：node v93-patch.mjs [--apply] */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
if (src.includes('v93 神兽权重与变身')) { console.log('已打过 v93'); process.exit(0); }
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const need = [];
function rep(old, nu, tag) {
  const n = work.split(old).length - 1;
  if (n !== 1) throw new Error('锚点 ' + tag + ' 命中 ' + n + ' 次');
  work = work.replace(old, nu); need.push(tag);
}

/* ① 神兽刷新权重：0.05 ≈ 占刷新池 0.5%（原来 8.71%） */
rep(`var RARITY_W=[1,1,1];`,
  `/* ══ v93 神兽权重与变身 ══
     实测：1205 只宠物里传说/幻之有 105 只（8.71%），而三档权重都是 1 ——
     等于**每遇到 11 只就有一只是神兽**（8.71%），初期满地神兽。
     现在把传说档权重压到 0.05 → 神兽约占刷新池 **0.5%**（约 200 次遇敌出 1 只）。
     想再调：1% → 0.106 · 0.2% → 0.021 · 0.1% → 0.0105（普通档权重保持 1 为基准） */
var RARITY_W=[1,1,0.05];`,
  'rarityW');

/* ② 变身机制：复制对手的物种与招式，换场/战斗结束还原 */
rep(`  if(fx.swapStages){                              /* 交换场地：互换双方能力档 */`,
  `  /* ══ v93：变身（Transform）══
     官方效果：变成对手的样子，复制它的物种（属性 / 种族值）与招式。
     本作的属性与种族值都由「物种 id」决定，所以变身 = 把 pet.sp 临时换成对手的物种；
     原形记在 vsGet(p,"origSp") 里，换场或战斗结束时由 clearStatus 还原。 */
  if(fx.transform){
    var _tgSp=(atkF===selfPet())?B.esp:leadSp();
    var _me=(atkF===selfPet())?selfPet():B.foe;
    if(_tgSp && _me){
      if(!vsGet(_me,"origSp")) vsSet(_me,"origSp",_me.sp);
      _me.sp=_tgSp.id;
      /* 招式也复制（官方会复制对手的招） */
      if(_tgSp.moves && _tgSp.moves.length){ _me.moves=_tgSp.moves.slice(0,SKILL_SLOTS); }
      ensureMoves(_me);
      syncPP(_me);
      /* 能力变化一并复制 */
      STAGE_KEYS.forEach(function(k){ _me.st[k]=defF.st[k]||0; });
      /* 立绘与名字跟着变 */
      if(atkF===selfPet()){
        var _ss=$("self-sprite"); if(_ss) _ss.textContent=byId(_me.sp).emoji;
        var _sn=$("self-name"); if(_sn) _sn.textContent=trOf(_me.trait).name+"·"+byId(_me.sp).name+" Lv."+_me.lv;
      }else{
        var _es=$("enemy-sprite"); if(_es) _es.textContent=byId(_me.sp).emoji;
        var _en=$("enemy-name"); if(_en) _en.textContent=byId(_me.sp).name;
      }
      lines.push("🎭 "+aN+" 变身成了 "+byId(_me.sp).name+"！");
    }
  }
  if(fx.swapStages){                              /* 交换场地：互换双方能力档 */`,
  'transform');

/* ③ 换场/战斗结束还原原形 */
rep(`function clearStatus(p){ if(!p) return; p.st=stZero(); }`,
  `function clearStatus(p){
  if(!p) return;
  /* v93：变身过的，换场时还原原形 */
  var _orig=(p.st&&p.st.origSp)?p.st.origSp:null;
  p.st=stZero();
  if(_orig){
    p.sp=_orig;
    ensureMoves(p);
    if(typeof syncPP==="function") syncPP(p);
  }
}`,
  'restore');

if (work.indexOf('v93 神兽权重与变身') < 0) throw new Error('未插入');
console.log('补丁点命中：' + need.join(' · '));
console.log('新长度 ' + Buffer.byteLength(work, 'utf8'));
if (!apply) { console.log('（预演）'); process.exit(0); }
if (!existsSync(ROOT + '/抓宠游戏-v12-clean.bak-v93.html')) copyFileSync(FILE, ROOT + '/抓宠游戏-v12-clean.bak-v93.html');
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入');
