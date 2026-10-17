/* v79 补丁：固定伤害数值（龙之怒 40 / 音爆 20）+ 体重类威力（重磅冲撞 / 踢倒）
   用法：node v79-patch.mjs [--apply] */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v79.html';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
if (src.includes('v79 体重与固定伤害')) { console.log('已打过 v79'); process.exit(0); }
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const need = [];
function rep(old, nu, tag) {
  const n = work.split(old).length - 1;
  if (n !== 1) throw new Error('锚点 ' + tag + ' 命中 ' + n + ' 次');
  work = work.replace(old, nu); need.push(tag);
}

/* ① 体重取值 + 体重类威力表 */
rep(`function vsSet(p,k,v){ if(p&&p.st) p.st[k]=v; }`,
  `/* ══ v79 体重与固定伤害 ══
   体重来自 PokéAPI 的 pokemon.weight（单位 hg = 100g），已按图鉴号注入 SPECIES 的 wt 字段；
   没有数据的用 300hg（30kg）兜底。
   重磅冲撞：**自己**比对手越重威力越大（40/60/80/100/120）
   踢倒：    **对手**越重威力越大（20/40/60/80/100/120） */
function wtOf(sp){ return (sp && sp.wt) ? sp.wt : 300; }
function weightPower(heavy, myW, foeW){
  if(heavy){
    var r = foeW / Math.max(1, myW);
    if(r < 0.2) return 120;
    if(r < 0.25) return 100;
    if(r < 0.33) return 80;
    if(r < 0.5) return 60;
    return 40;
  }
  var kg = foeW / 10;
  if(kg < 10) return 20;
  if(kg < 25) return 40;
  if(kg < 50) return 60;
  if(kg < 100) return 80;
  if(kg < 200) return 100;
  return 120;
}
function vsSet(p,k,v){ if(p&&p.st) p.st[k]=v; }`,
  'weight');

/* ② 伤害公式：体重类替换威力 */
rep(`  var _core=Math.floor(Math.floor(_lvTerm*mv.power*statMul)/50)+2;`,
  `  /* v79：体重类招式（重磅冲撞/踢倒）的威力按双方体重实时决定 */
  var _pw=mv.power;
  if(_ax && (_ax.weightHeavy || _ax.weightLight)){
    var _foSp=(atkIsSelf?B.esp:leadSp());
    _pw=weightPower(!!_ax.weightHeavy, wtOf(atkSp), wtOf(_foSp));
    lines.push("⚖️ 按双方体重，"+mv.name+" 的威力为 "+_pw+"！");
  }
  var _core=Math.floor(Math.floor(_lvTerm*_pw*statMul)/50)+2;`,
  'weightPower');

/* ③ 固定伤害：支持数值（原来只支持 "level"） */
rep(`    if(_ax.fixedDamage==="level"){
      dmg=Math.max(1,atkLv); lines.push("（"+mv.name+" 造成固定伤害 = 自身等级）");
    }else if(_ax.endeavor){`,
  `    if(_ax.fixedDamage){
      /* v79：支持两种 —— "level"（地球上投/黑夜魔影）与具体数值（龙之怒 40 / 音爆 20） */
      dmg=(_ax.fixedDamage==="level") ? Math.max(1,atkLv) : Math.max(1,_ax.fixedDamage);
      lines.push("（"+mv.name+" 造成固定 "+(dmg)+" 点伤害"+((""+_ax.fixedDamage)==="level"?"（等于自身等级）":"")+"）");
    }else if(_ax.endeavor){`,
  'fixedDamageNum');

if (work.indexOf('v79 体重与固定伤害') < 0) throw new Error('未插入');
console.log('补丁点命中：' + need.join(' · '));
console.log('新长度 ' + Buffer.byteLength(work, 'utf8'));
if (!apply) { console.log('（预演）'); process.exit(0); }
if (!existsSync(BAK)) copyFileSync(FILE, BAK);
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入');
