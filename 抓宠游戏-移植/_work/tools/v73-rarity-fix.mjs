/* v73：取消「稀有」档 —— 官方只分「普通」与「传说/幻之」
   背景：本作的稀有档(蓝) 93 只全不是官方传说，是按 capture_rate（30~90）划进来的普通宝可梦
        （胖丁/吉利蛋/拉普拉斯/卡比兽/班基拉斯/烈咬陆鲨…）。用户指出"理论上不存在"。
   做法：SPECIES 里 rarity 1 → 0；RARITY_NAME 的中间档改为「普通」。
        捕捉难度**不受影响**（它由 cap = 官方 capture_rate 决定，本来就不用稀有度）。
   用法：node v73-rarity-fix.mjs [--apply] */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v73.html';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
if (src.includes('v73 取消稀有档')) { console.log('已打过 v73'); process.exit(0); }
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');

/* 1) 数据：只改 SPECIES 里的 "rarity":1,"base":... 模式 */
const before = (work.match(/"rarity":1,"base":/g) || []).length;
work = work.split('"rarity":1,"base":').join('"rarity":0,"base":');
const after = (work.match(/"rarity":1,"base":/g) || []).length;
console.log('SPECIES 里 rarity:1 → 0：' + before + ' 处（剩余 ' + after + '）');

/* 2) 文案：中间档不再叫「稀有」 */
const oldName = 'var RARITY_NAME=["常见","稀有","传说"];';
if (work.indexOf(oldName) >= 0) {
  work = work.replace(oldName, '/* v73 取消稀有档：官方只分「普通」与「传说/幻之」，中间档不再存在 */\nvar RARITY_NAME=["普通","普通","传说"];');
  console.log('RARITY_NAME 已更新');
} else if (work.indexOf('v73 取消稀有档') < 0) {
  throw new Error('RARITY_NAME 锚点没找到');
}

if (!apply) { console.log('（预演，未写入）'); process.exit(0); }
if (!existsSync(BAK)) copyFileSync(FILE, BAK);
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE);
