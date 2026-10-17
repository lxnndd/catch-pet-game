/* 查两个问题：①遇敌等级 vs 捕获后等级 ②对战 UI 显示是否完整 */
import { readFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
const src = readFileSync(F, 'utf8');
function showFn(name, lines = 22) {
  const re = new RegExp('function ' + name + '\\s*\\(');
  const m = src.match(re);
  if (!m) { console.log('  (找不到 ' + name + ')'); return; }
  const seg = src.slice(m.index, m.index + lines * 90);
  console.log('\n--- ' + name + ' ---');
  console.log(seg.split('\n').slice(0, lines).map(l => '  ' + l.trim()).filter(l => l.length > 3).join('\n'));
}
/* 野怪等级怎么定的 */
const i = src.indexOf('function startWildBattle');
console.log('═══ startWildBattle 里的等级计算 ═══');
console.log(src.slice(i, i + 1500).split('\n').map(l => '  ' + l.trim()).filter(l => /Lv|lv|hp|hpBase/.test(l) && l.length > 3).join('\n'));
showFn('initFighter', 14);
showFn('captureSuccess', 26);
/* 遇敌面板与合作 UI */
console.log('\n═══ 遇敌面板 HTML ═══');
const e1 = src.indexOf('id="enc-panel"');
console.log(src.slice(Math.max(0, e1 - 200), e1 + 700).split('\n').map(l => '  ' + l.trim()).filter(Boolean).join('\n'));
/* 对战 UI 的 CSS 关键项 */
console.log('\n═══ 对战相关 CSS（看是否有固定高度/溢出）═══');
['#screen-battle', '.battle-card', '.side-e', '.side-s', '#move-row', '.battle-log', '#stage'].forEach(sel => {
  const idx = src.indexOf(sel + '{');
  if (idx < 0) { console.log('  ' + sel + ' → 未找到'); return; }
  const end = src.indexOf('}', idx);
  console.log('  ' + src.slice(idx, end + 1).replace(/\s+/g, ' '));
});
