/* v40b：删掉重复的 var SKY_RATE 声明（两处值相同，纯冗余） */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v40b.html';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const LINE = 'var SKY_RATE={plain:0.12,forest:0.2,water:0.18,flower:0.26,ocean:0.24,volcano:0.1,mine:0,snow:0.14,desert:0.16};';
const n = work.split(LINE).length - 1;
console.log('var SKY_RATE 出现 ' + n + ' 次');
if (n <= 1) { console.log('无需处理'); process.exit(0); }
/* 保留第一次，删掉后面的（连同换行） */
let first = true;
work = work.split('\n').filter(line => {
  if (line.trim() !== LINE) return true;
  if (first) { first = false; return true; }
  return false;
}).join('\n');
const after = work.split(LINE).length - 1;
console.log('处理后剩 ' + after + ' 次');
if (after !== 1) { console.error('!! 数量异常'); process.exit(1); }
if (!apply) { console.log('（未加 --apply，仅预演）'); process.exit(0); }
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE);
