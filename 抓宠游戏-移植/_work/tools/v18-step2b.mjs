/* v18 步骤2（正则版）：地区等级制 + 提示带等级段 */
import { readFileSync, writeFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');
const before = src.length;

const NEW_LV = `  /* v18 地区等级制：每个地区有自己的等级段，野怪等级在「玩家最强宠 ±3」基础上夹到该地区区间内。
     效果：1 级新手在平原只会遇到 1~3 级；练到 60 级回平原能碰 23~25 级；去火山至少 66 级。 */
  var topLv=topPartyLv();
  var _reg=regionAt(S.pos.x,S.pos.y);
  var _lr=LV_RANGE[_reg]||[1,25];
  var foeLv;
  if(opts.foeLv){ foeLv=clamp(opts.foeLv,1,100); }
  else{
    foeLv=clamp(topLv+ri(-3,3), 1, 100);
    foeLv=clamp(foeLv, _lr[0], _lr[1]);
    if(topLv<=2) foeLv=Math.min(foeLv,3);
  }`;
const reLv = /  \/\* 野怪等级跟随玩家（队伍最强宠）[\s\S]*?if\(!opts\.foeLv && topLv<=2\) foeLv=1;/;
if (!reLv.test(src)) throw new Error('找不到野怪等级段');
src = src.replace(reLv, NEW_LV);

const reHint = /function regionHint\(x,y\)\{\r?\n  var reg=regionAt\(x,y\);/;
const NEW_HINT_HEAD = `function regionHint(x,y){
  var reg=regionAt(x,y);
  var _lr=LV_RANGE[reg]||[1,25];
  var _tag="（Lv."+_lr[0]+"~"+_lr[1]+"）";`;
if (!reHint.test(src)) throw new Error('找不到 regionHint');
src = src.replace(reHint, NEW_HINT_HEAD);
/* 给 8 条 return 加上等级段标签 */
const hints = [
  ['"水属性小宠出没！"', '"水畔水属性小宠出没！"+_tag'],
  ['"林间草系小宠出没！"', '"林间草系小宠出没！"+_tag'],
  ['"岩浆旁火与岩系小宠出没！"', '"岩浆旁火与岩系小宠出没！"+_tag'],
  ['"矿脉边岩系小宠出没！"', '"矿脉边岩系小宠出没！"+_tag'],
  ['"海里水属性小宠出没（带水系宠才能下水）！"', '"海里水属性小宠出没（带水系宠物才能下水）！"+_tag'],
  ['"花田里草系与天空小宠出没！"', '"花田里草系与天空小宠出没！"+_tag'],
  ['"雪原上冰系小宠出没！"', '"雪原上冰系小宠出没！"+_tag'],
  ['"荒漠里地面系小宠出没！"', '"荒漠里地面系小宠出没！"+_tag'],
  ['return "平原常见小宠出没！";', 'return "平原常见小宠出没！"+_tag;'],
];
let hn = 0;
/* 只在 regionHint 函数体内替换 */
const hStart = src.indexOf('function regionHint(');
const hEnd = src.indexOf('function checkSparkle(');
if (hStart < 0 || hEnd < 0) throw new Error('找不到 regionHint 范围');
let hintBody = src.slice(hStart, hEnd);
hints.forEach(([a, b]) => { if (hintBody.includes(a)) { hintBody = hintBody.replace(a, b); hn++; } });
src = src.slice(0, hStart) + hintBody + src.slice(hEnd);

writeFileSync(F, src, 'utf8');
console.log('写入完成：' + (before / 1024).toFixed(0) + ' KB → ' + (src.length / 1024).toFixed(0) + ' KB');
console.log('  地区等级制: ' + (src.includes('LV_RANGE[_reg]') ? '✅' : '❌'));
console.log('  提示加了等级段: ' + hn + ' 条');
console.log('  旧固定跟随: ' + (src.includes('clamp(topLv+ri(-2,0), 1, 100)') ? '❌ 还在' : '✅ 已替换'));
