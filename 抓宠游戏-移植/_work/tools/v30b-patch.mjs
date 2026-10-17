/* v30b：按用户要求移除「队内切磋」入口（按钮 + 事件绑定）
   弹窗 #panel-spar 与 openSpar/startSpar 函数保留（无入口即不可达），避免大范围删代码引入风险。
   用法：node v30b-patch.mjs --apply */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v30b.html';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const done = [];

/* 1. 按钮本体（可能带不同 style，用正则更稳） */
const btnRe = /[ \t]*<button class="btn-sm" id="btn-spar"[^>]*>[^<]*<\/button>[ \t]*\r?\n?/;
if (btnRe.test(work)) { work = work.replace(btnRe, ''); done.push('移除队伍面板「🥊 队伍内切磋」按钮'); console.log('  [改动] 移除切磋按钮'); }
else { console.log('  [跳过] 切磋按钮已不存在'); }

/* 2. 事件绑定 */
const bindRe = /[ \t]*\$\("btn-spar"\)\.addEventListener\("click",\s*openSpar\);[ \t]*\r?\n?/;
if (bindRe.test(work)) { work = work.replace(bindRe, '  /* v30b：队内切磋入口已按用户要求移除 */\n'); done.push('移除切磋按钮的事件绑定'); console.log('  [改动] 移除切磋按钮绑定'); }
else { console.log('  [跳过] 切磋绑定已不存在'); }

/* 校验：按钮与绑定都不该再出现 */
if (/id="btn-spar"/.test(work)) { console.error('!! 按钮仍在'); process.exit(1); }
if (/\$\("btn-spar"\)/.test(work)) { console.error('!! 绑定仍在'); process.exit(1); }
console.log('\n共 ' + done.length + ' 项改动' + (apply ? '' : '（未加 --apply，仅预演）'));
if (!apply) process.exit(0);
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE);
