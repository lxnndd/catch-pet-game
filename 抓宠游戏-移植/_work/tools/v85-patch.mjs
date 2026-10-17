/* v85 补丁：神兽（传说/幻之）野生个体一律 70 级起
   背景：v53 把野怪等级改成跟随玩家出战宠（±3），于是 5 级也能撞见 2 级的神兽、顺手抓走。
   现在：稀有度 2 的野生个体**不受地区等级段与玩家等级影响**，直接 70~100 级。
   用法：node v85-patch.mjs [--apply] */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
if (src.includes('v85 神兽等级')) { console.log('已打过 v85'); process.exit(0); }
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const need = [];
function rep(old, nu, tag) {
  const n = work.split(old).length - 1;
  if (n !== 1) throw new Error('锚点 ' + tag + ' 命中 ' + n + ' 次');
  work = work.replace(old, nu); need.push(tag);
}

rep(`function wildLvRange(sp,reg,topLv){
  var t=wildTargetRange(reg,topLv), s=stageRange(sp);
  var lo=Math.max(t[0],s[0]), hi=Math.min(t[1],s[1]);
  if(hi<lo) return null;
  return [clamp(lo,1,100), clamp(hi,lo,100)];
}`,
  `function wildLvRange(sp,reg,topLv){
  var t=wildTargetRange(reg,topLv), s=stageRange(sp);
  var lo=Math.max(t[0],s[0]), hi=Math.min(t[1],s[1]);
  if(hi<lo) return null;
  /* ══ v85 神兽等级 ══
     传说 / 幻之（稀有度 2）的野生个体**一律 70 级起**，不受地区等级段与玩家等级影响。
     起因：野怪等级从 v53 起跟随出战宠（±3），于是 5 级也能撞见 2 级的神兽、顺手就抓走了 ——
     现在初期遇到也打不过、更抓不动，想抓神兽得先把自己练到 70 级附近。 */
  if(sp && sp.rarity===2) return [70,100];
  return [clamp(lo,1,100), clamp(hi,lo,100)];
}`,
  'legendLv');

if (work.indexOf('v85 神兽等级') < 0) throw new Error('未插入');
console.log('补丁点命中：' + need.join(' · '));
console.log('新长度 ' + Buffer.byteLength(work, 'utf8'));
if (!apply) { console.log('（预演）'); process.exit(0); }
if (!existsSync(ROOT + '/抓宠游戏-v12-clean.bak-v85.html')) copyFileSync(FILE, ROOT + '/抓宠游戏-v12-clean.bak-v85.html');
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入');
