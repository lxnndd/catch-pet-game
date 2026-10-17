/* v20 前置调查：7 个问题的相关代码 */
import { readFileSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const F = ROOT + '/抓宠游戏-v12-clean.html';
const src = readFileSync(F, 'utf8');
function show(label, re, lines = 12) {
  const m = src.match(re);
  console.log('\n--- ' + label + ' ---');
  if (!m) { console.log('  (未找到)'); return; }
  const seg = m[0].length > 1200 ? m[0].slice(0, 1200) : m[0];
  console.log(seg.split('\n').map(l => '  ' + l.trim()).filter(l => l.length > 2).slice(0, lines).join('\n'));
}
show('① blocked()（岩石是否障碍）', /function blocked\(x,y\)\{[\s\S]*?\n\}/, 10);
show('② isWaterTile', /function isWaterTile\([\s\S]*?\n\}/, 5);
show('③ 城镇围栏/出入口', /for\(var fy=cy-6;[\s\S]*?\n    \}/, 10);
show('④ 遇敌面板填充（HP 显示）', /function openEncounter\([\s\S]*?\n\}/, 20);
show('⑤ syncPP（PP 生成）', /function syncPP\([\s\S]*?\n\}/, 12);
show('⑥ 初始伙伴等级（chooseStarter）', /function chooseStarter\([\s\S]*?\n\}/, 10);
console.log('\n--- ⑦ 队伍面板 CSS（存仓库按钮与 HP 挤压） ---');
['.pet-row', '.pet-row .acts', '.pet-row .info', '.pet-row .hp', '.mini-btn'].forEach(sel => {
  const i = src.indexOf(sel + '{');
  if (i < 0) { console.log('  ' + sel + ' → 未找到'); return; }
  const end = src.indexOf('}', i);
  console.log('  ' + src.slice(i, end + 1).replace(/\s+/g, ' ').slice(0, 160));
});
console.log('\n--- ⑧ 队伍面板行渲染（petRowEl） ---');
show('petRowEl', /function petRowEl\([\s\S]*?\n\}/, 22);
console.log('\n--- ⑨ 道馆触发（move 里） ---');
const gi = src.indexOf('if(tv===T.GYM)');
console.log('  ' + src.slice(gi - 60, gi + 220).split('\n').map(l => l.trim()).filter(Boolean).join('\n  '));
