/* 打印构建脚本里招表写入段 + 检查 moves-v17.json 的 id 缺失情况 */
import { readFileSync } from 'node:fs';
const b = readFileSync('C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/tools/v17-build2.mjs', 'utf8');
const i = b.indexOf('const conflicts = [];');
console.log('=== 构建脚本招表段 ===');
console.log(b.slice(i, i + 1400));
console.log('\n=== moves-v17.json 诊断 ===');
const mv = JSON.parse(readFileSync('C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/out/moves-v17.json', 'utf8'));
console.log('条目 ' + mv.length);
const noId = mv.filter(m => m.id === undefined || m.id === null);
console.log('id 为 undefined/null 的：' + noId.length);
noId.slice(0, 6).forEach(m => console.log('  ' + JSON.stringify({ id: m.id, name: m.name, type: m.type })));
console.log('id 类型分布：' + JSON.stringify(mv.reduce((a, m) => { const t = m.id === undefined ? 'undefined' : typeof m.id; a[t] = (a[t] || 0) + 1; return a; }, {})));
console.log('id 重复的：');
const seen = {}; mv.forEach(m => { const k = String(m.id); (seen[k] = seen[k] || []).push(m.name); });
Object.entries(seen).filter(([k, v]) => v.length > 1).slice(0, 6).forEach(([k, v]) => console.log('  ' + k + ' → ' + v.join('/')));
