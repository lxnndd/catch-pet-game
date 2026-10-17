/* v20 修：通道代码里的变量名错误（w → cw），它让 buildTown 抛异常导致整个 genMap 中断 */
import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const F = ROOT + '/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');

const OLD = `        for(var w=-1;w<=1;w++){
          var cqx=cpx+(dir[0]?0:w), cqy=cpy+(dir[0]?cw:0);`;
const NEW = `        for(var cw=-1;cw<=1;cw++){
          var cqx=cpx+(dir[0]?0:cw), cqy=cpy+(dir[0]?cw:0);`;
if (!src.includes(OLD)) throw new Error('找不到错误代码段');
src = src.replace(OLD, NEW);
writeFileSync(F, src, 'utf8');
console.log('✅ 已修变量名 w → cw');
/* 顺带全局扫一遍还有没有别的「用了未定义单字母变量」的可疑处 */
const suspicious = [];
['?0:w)', '?w:0)', '(w)', 'w<=1'].forEach(pat => { if (src.includes(pat)) suspicious.push(pat); });
console.log('残留可疑片段：' + (suspicious.length ? suspicious.join(' ') : '无 ✅'));
