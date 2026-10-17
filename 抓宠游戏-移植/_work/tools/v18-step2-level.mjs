/* v18 步骤2：地区等级制（startWildBattle 按地区区间 + 玩家浮动） + 提示文案带等级段 */
import { readFileSync, writeFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');
const before = src.length;

/* ── 1. 野怪等级：改为「地区区间 + 跟玩家浮动」 ── */
const OLD_LV = `  /* 野怪等级跟随玩家（队伍最强宠）：只低不高，且 2 级以内新手只遇 1 级，避免开局就被高级野怪带走 */
  var topLv=topPartyLv();
  var foeLv=opts.foeLv ? clamp(opts.foeLv,1,100) : clamp(topLv+ri(-2,0), 1, 100);
  if(!opts.foeLv && topLv<=2) foeLv=1;`;
const NEW_LV = `  /* v18 地区等级制：每个地区有自己的等级段，野怪等级在「玩家最强宠 ±3」的基础上夹到该地区区间内。
     效果：1 级新手在平原只会遇到 1~4 级；练到 60 级回平原能碰到 23~25 级；去火山至少 66 级。 */
  var topLv=topPartyLv();
  var _reg=regionAt(S.pos.x,S.pos.y);
  var _lr=LV_RANGE[_reg]||[1,25];
  var foeLv;
  if(opts.foeLv){ foeLv=clamp(opts.foeLv,1,100); }
  else{
    foeLv=clamp(topLv+ri(-3,3), 1, 100);
    foeLv=clamp(foeLv, _lr[0], _lr[1]);
    if(topLv<=2) foeLv=Math.min(foeLv,3);       /* 开局保护：新手只遇 1~3 级 */
  }`;
if (!src.includes(OLD_LV)) throw new Error('找不到等级段');
src = src.replace(OLD_LV, NEW_LV);

/* ── 2. 地区提示带上等级段 ── */
const OLD_HINT = `function regionHint(x,y){
  var reg=regionAt(x,y);`;
const NEW_HINT = `function regionHint(x,y){
  var reg=regionAt(x,y);
  var _lr=LV_RANGE[reg]||[1,25];
  var _tag="（Lv."+_lr[0]+"~"+_lr[1]+"）";
  if(reg==="water") return "水畔水属性小宠出没！"+_tag;
  if(reg==="forest") return "林间草系小宠出没！"+_tag;
  if(reg==="volcano") return "岩浆旁火与岩系小宠出没！"+_tag;
  if(reg==="mine") return "矿脉边岩系小宠出没！"+_tag;
  if(reg==="ocean") return "海里水属性小宠出没（带水系宠才能下水）！"+_tag;
  if(reg==="flower") return "花田里草系与天空小宠出没！"+_tag;
  if(reg==="snow") return "雪原上冰系小宠出没！"+_tag;
  if(reg==="desert") return "荒漠里地面系小宠出没！"+_tag;
  return "平原常见小宠出没！"+_tag;
}
function _regionHintOld(x,y){
  var reg=regionAt(x,y);`;
if (!src.includes(OLD_HINT)) throw new Error('找不到 regionHint');
src = src.replace(OLD_HINT, NEW_HINT);

/* ── 3. 雪原是雪地，不该长高草；野怪池按 habitat（栖息地）走，已由 build 阶段按属性分配 ── */
writeFileSync(F, src, 'utf8');
console.log('写入完成：' + (before / 1024).toFixed(0) + ' KB → ' + (src.length / 1024).toFixed(0) + ' KB');
console.log('  地区等级制: ' + (src.includes('LV_RANGE[_reg]') ? '✅' : '❌'));
console.log('  提示带等级段: ' + (src.includes('_tag="（Lv."') ? '✅' : '❌'));
console.log('  旧的固定跟随: ' + (src.includes('clamp(topLv+ri(-2,0), 1, 100)') ? '❌ 还在' : '✅ 已替换'));
