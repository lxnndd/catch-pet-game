/* 微调训练师站位：让每个人的站位与自身主题地区一致 */
import { readFileSync, writeFileSync } from 'node:fs';

const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
const MOVES = [
  ['t4', '{x:22,y:26}', '{x:23,y:27}'],   // 渔夫：站到水畔
  ['t6', '{x:32,y:40}', '{x:33,y:42}'],   // 格斗家：从水里挪到平原
  ['t10', '{x:42,y:46}', '{x:41,y:48}']   // 冠军：站到荒漠正中
];

let s = readFileSync(F, 'utf8');
const log = [];
for (const [id, from, to] of MOVES) {
  const re = new RegExp('(\\{id:"' + id + '"[^\\n]*?pos:)\\' + from);
  if (!re.test(s)) { log.push(id + ':NOTFOUND(' + from + ')'); continue; }
  s = s.replace(re, '$1' + to);
  log.push(id + ' ' + from + ' → ' + to);
}
writeFileSync(F, s, 'utf8');
console.log(log.join(' | '));
