/* v17 查清招式名 undefined / 空名的来源 */
import { readFileSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const D = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/v17-data/';
const mv = JSON.parse(readFileSync('C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/out/moves-v17.json', 'utf8'));
const bad = mv.filter(m => !m.name || m.name === 'undefined' || /^undefined/.test(String(m.id)));
console.log('招表里名字异常/空名的：' + bad.length + ' 个');
bad.slice(0, 10).forEach(m => console.log('  id=' + m.id + ' name=' + JSON.stringify(m.name) + ' type=' + m.type + ' power=' + m.power + ' 来源=' + (m._from || []).join(',')));
console.log('\n=== 在各数据源里找空招式名 ===');
for (const f of readdirSync(D).filter(x => /\.mjs$/.test(x))) {
  try {
    const mod = await import(pathToFileURL(D + f).href);
    const arr = mod[Object.keys(mod).find(k => Array.isArray(mod[k]))] || [];
    let empties = [];
    arr.forEach(x => {
      ['p0', 'p15', 'p25', 'p35', 'p45', 'p55', 'p65'].forEach(k => {
        ((x.pools || {})[k] || []).forEach(m => {
          if (!m || m.m === undefined || m.m === null || m.m === '') empties.push(x.n + '/' + k + '/' + JSON.stringify(m).slice(0, 60));
        });
      });
    });
    if (empties.length) { console.log('  ' + f + '：' + empties.length + ' 处空招式'); empties.slice(0, 4).forEach(e => console.log('      ' + e)); }
  } catch (e) { }
}
