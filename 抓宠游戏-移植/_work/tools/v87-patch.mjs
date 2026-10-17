/* v87 补丁：技能池「没满时从左边拖到右侧空白处 = 直接添加」
   现象（用户反馈）：宠物只有 2 个技能（上限 4），从左边拖过来毫无反应。
   原因：拖放只认「拖到某个已有技能卡上 = 替换」；没满时玩家想"再加一个"，
        拖到右侧空白区时 _hiAt 找不到卡片 → 直接 return，所以毫无反应。
   修法：① _hiAt 支持把右侧容器 #learn-cur 当落点 ② onUp 把容器也识别为 side=cur / skill=null
        ③ applySkillDrop 支持 toId 为空 = 直接添加（栏位满时给出提示）
        ④ 右侧网格给一点最小高度，保证空白区可落
   用法：node v87-patch.mjs [--apply] */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
if (src.includes('v87 拖到空白 = 添加')) { console.log('已打过 v87'); process.exit(0); }
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const need = [];
function rep(old, nu, tag) {
  const n = work.split(old).length - 1;
  if (n !== 1) throw new Error('锚点 ' + tag + ' 命中 ' + n + ' 次');
  work = work.replace(old, nu); need.push(tag);
}

/* ① _hiAt：找不到卡片时，把右侧容器当落点 */
rep(`function _hiAt(x,y){
  clearDropHi();
  var el=document.elementFromPoint(x,y);
  var card=(el && el.closest) ? el.closest(".learn-card[data-skill]") : null;
  if(card) card.classList.add("drop-hi");
  return card;
}`,
  `function _hiAt(x,y){
  clearDropHi();
  var el=document.elementFromPoint(x,y);
  var card=(el && el.closest) ? el.closest(".learn-card[data-skill]") : null;
  if(card){ card.classList.add("drop-hi"); return card; }
  /* ══ v87 拖到空白 = 添加 ══
     技能没满时，玩家会想把左边的招"加"进去 —— 这时右侧没有多余的卡片可落，
     原来 _hiAt 返回 null，onUp 直接 return，看起来就是"拖不过来"。
     这里把右侧容器 #learn-cur 也当成合法落点。 */
  var zone=(el && el.closest) ? el.closest("#learn-cur") : null;
  if(zone){ zone.classList.add("drop-hi"); return zone; }
  return null;
}`,
  'hiAt');

/* ② onUp：容器也识别为 side=cur / skill=null */
rep(`      var card=lastCard || _hiAt(e3.clientX, e3.clientY);
      if(!card) return;
      applySkillDrop(learnDlg, side, skillId, card.getAttribute("data-side"), card.getAttribute("data-skill"));`,
  `      var card=lastCard || _hiAt(e3.clientX, e3.clientY);
      if(!card) return;
      /* v87：落在右侧容器上时 = 拖到空白处（toId 为空 → 直接添加） */
      var _tSide=card.getAttribute("data-side") || (card.id==="learn-cur" ? "cur" : null);
      var _tId=card.getAttribute("data-skill") || null;
      if(!_tSide) return;
      applySkillDrop(learnDlg, side, skillId, _tSide, _tId);`,
  'onUp');

/* ③ applySkillDrop：支持 toId 为空 = 直接添加 */
rep(`  if(fromSide==="pool" && toSide==="cur"){
    var i=pet.moves.indexOf(toId);
    if(i<0) return;
    pet.moves[i]=fromId;                                /* 用新技能顶掉这个槽 */
  } else if(fromSide==="cur" && toSide==="cur"){`,
  `  if(fromSide==="pool" && toSide==="cur"){
    if(!toId){
      /* v87：拖到右侧空白处 —— 技能没满就直接加上 */
      if(pet.moves.indexOf(fromId)>=0){ toast("这个技能已经带着了～"); return; }
      if(pet.moves.length>=SKILL_SLOTS){ toast("技能栏满了（"+SKILL_SLOTS+" 个），拖到某个旧技能上替换它"); return; }
      pet.moves.push(fromId);
    }else{
      var i=pet.moves.indexOf(toId);
      if(i<0) return;
      pet.moves[i]=fromId;                              /* 用新技能顶掉这个槽 */
    }
  } else if(fromSide==="cur" && toSide==="cur"){`,
  'applyDrop');

/* ④ 右侧网格给最小高度，保证空白可落 */
rep(`.learn-grid{display:flex; flex-direction:column; gap:6px; max-height:46vh; overflow:auto; padding-right:2px;}`,
  `.learn-grid{display:flex; flex-direction:column; gap:6px; max-height:46vh; overflow:auto; padding-right:2px;}
/* v87：右侧技能栏给足空白高度，方便把左边的招「拖进来添加」（不只是替换） */
#learn-cur{min-height:190px;}
#learn-cur.drop-hi{outline:2px dashed #4f8fdd; outline-offset:4px; border-radius:8px;}`,
  'css');

if (work.indexOf('v87 拖到空白 = 添加') < 0) throw new Error('未插入');
console.log('补丁点命中：' + need.join(' · '));
console.log('新长度 ' + Buffer.byteLength(work, 'utf8'));
if (!apply) { console.log('（预演）'); process.exit(0); }
if (!existsSync(ROOT + '/抓宠游戏-v12-clean.bak-v87.html')) copyFileSync(FILE, ROOT + '/抓宠游戏-v12-clean.bak-v87.html');
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入');
