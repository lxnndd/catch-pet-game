/* v40：修 spdOf 同名冲突
   冲突：我 v36 加的 spdOf(sp,lv)=特防 被原有的 spdOf(p)=速度 覆盖（后定义生效）
        → applyMove 里算特防时实际执行的是速度逻辑，特防公式完全失效
   处理：把特防版改名为 spDefOf，并更新 applyMove 的调用
   用法：node v40-patch.mjs --apply */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v40.html';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const done = [];
const rep = (a, b, tag) => {
  if (!work.includes(a)) { console.error('  !! 找不到锚点: ' + tag); process.exit(1); }
  work = work.replace(a, b); done.push(tag); console.log('  [改动] ' + tag);
};

rep(
  'function spdOf(sp,lv){ var v=Math.floor((2*statOf(sp,"spd")+IV)*statLvK(lv)); return Math.max(1,v); }',
  'function spDefOf(sp,lv){ var v=Math.floor((2*statOf(sp,"spd")+IV)*statLvK(lv)); return Math.max(1,v); }   /* v40：改名避开与「速度版 spdOf」的冲突 */',
  '特防版改名 spDefOf');
rep(
  'var _defVal = _isSpecial ? spdOf(defSpObj,defLv) : defOf(defSpObj,defLv);',
  'var _defVal = _isSpecial ? spDefOf(defSpObj,defLv) : defOf(defSpObj,defLv);',
  'applyMove 改用 spDefOf');

/* 自查：确认 spdOf 只剩一个定义 */
const defs = (work.match(/function spdOf\(/g) || []).length;
const defs2 = (work.match(/function spDefOf\(/g) || []).length;
console.log('\n自查: function spdOf( 出现 ' + defs + ' 次 · function spDefOf( 出现 ' + defs2 + ' 次');
if (defs !== 1) { console.error('!! spdOf 定义数异常'); process.exit(1); }
if (defs2 !== 1) { console.error('!! spDefOf 定义数异常'); process.exit(1); }
console.log('共 ' + done.length + ' 项改动' + (apply ? '' : '（未加 --apply，仅预演）'));
if (!apply) process.exit(0);
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE);
