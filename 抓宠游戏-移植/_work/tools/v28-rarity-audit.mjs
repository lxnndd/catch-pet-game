/* 查异兽/幻兽/神兽的 rarity 现状与 PokéAPI 权威名册 */
import { readFileSync, existsSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const src = readFileSync(ROOT + '/抓宠游戏-v12-clean.html', 'utf8');
function sliceLiteral(s, i) {
  const o = s.slice(i).search(/[[{]/); const from = i + o;
  const oc = s[from], cc = oc === '[' ? ']' : '}';
  let d = 0, j = from, inStr = null, esc = false;
  for (; j < s.length; j++) {
    const c = s[j];
    if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"') { inStr = c; continue; }
    if (c === oc) d++; else if (c === cc) { d--; if (d === 0) { j++; break; } }
  }
  return s.slice(from, j);
}
const lit = n => new Function('return (' + sliceLiteral(src, src.indexOf('var ' + n + '=') + ('var ' + n + '=').length) + ')')();
const SPECIES = lit('SPECIES');
const dist = {};
SPECIES.forEach(s => dist[s.rarity] = (dist[s.rarity] || 0) + 1);
console.log('== SPECIES rarity 分布（0=常见 1=稀有 2=神兽档）==');
Object.keys(dist).sort().forEach(k => console.log('  rarity=' + k + ' : ' + dist[k] + ' 只'));
const r2 = SPECIES.filter(s => s.rarity === 2);
console.log('\n== rarity=2 共 ' + r2.length + ' 只 ==');
console.log(r2.map(s => s.name).join('、'));
/* 权威名册缓存 */
const cands = ['_work/v17-data/poke-legendary.json', '_work/sources/poke-legendary.json'];
let jsonPath = null;
for (const p of cands) if (existsSync(ROOT + '/' + p)) { jsonPath = ROOT + '/' + p; break; }
if (jsonPath) {
  const J = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const arr = Array.isArray(J) ? J : (J.list || J.data || Object.keys(J));
  console.log('\n== PokéAPI 权威名册 (' + jsonPath.replace(ROOT + '/', '') + ') 共 ' + arr.length + ' 条 ==');
  const sample = arr.slice(0, 3);
  console.log('  样例: ' + JSON.stringify(sample));
  /* 按标志分组 */
  if (typeof arr[0] === 'object' && arr[0]) {
    const keys = Object.keys(arr[0]);
    console.log('  字段: ' + keys.join(', '));
    const g = {};
    arr.forEach(o => { const k = (o.is_legendary ? 'L' : '') + (o.is_mythical ? 'M' : '') || '?'; g[k] = (g[k] || 0) + 1; });
    console.log('  标志分布: ' + JSON.stringify(g));
  }
} else {
  console.log('\n（未找到 poke-legendary.json，尝试搜索）');
}
/* 已知异兽/幻兽抽查 */
const UB = ['虚吾伊德', '爆肌蚊', '费洛美螂', '电束木', '铁火辉夜', '纸御剑', '恶食大王', '垒磊石', '砰头小丑', '四颚针龙', '毒贝比'];
const MYTH = ['梦幻', '时拉比', '基拉祈', '代欧奇希斯', '霏欧纳', '玛纳霏', '达克莱伊', '洁咪', '阿尔宙斯', '比克提尼', '凯路迪欧', '美洛耶塔', '盖诺赛克特', '蒂安希', '胡帕', '波尔凯尼恩', '玛夏多', '捷拉奥拉', '美录坦', '美录梅塔', '萨戮德', '桃歹郎', '太乐巴戈斯', '美洛耶塔'];
[['异兽(UB)', UB], ['幻兽(Mythical)', MYTH]].forEach(([tag, list]) => {
  const rows = list.map(n => { const s = SPECIES.find(x => x.name === n); return s ? n + '(r' + s.rarity + ')' : n + '(无)'; });
  console.log('\n' + tag + ': ' + rows.join(' '));
});
