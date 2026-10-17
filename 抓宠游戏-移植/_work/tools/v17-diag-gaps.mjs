/* 诊断：物种表缺哪些、进化目标为什么找不到 */
import { readFileSync } from 'node:fs';
const OUT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/out/';
const sp = JSON.parse(readFileSync(OUT + 'species-v17.json', 'utf8'));
const byName = {}; sp.forEach(s => byName[s.name] = s);
const pkNameId = JSON.parse(readFileSync('C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/v17-data/poke-name-id.json', 'utf8'));
console.log('物种 ' + sp.length + ' 只 · 宝可梦 ' + sp.filter(s => s.src === 'pk').length + ' · 洛克 ' + sp.filter(s => s.src === 'kz').length);
console.log('有头像 ' + sp.filter(s => s.avatar).length + ' · 缺头像 ' + sp.filter(s => !s.avatar).length);

/* 1. 宝可梦全图鉴覆盖情况：PokéAPI 有 1025 只，我们拿到几只 */
const allPk = Object.entries(pkNameId);        /* 中文名 → id */
const haveNames = new Set(sp.filter(s => s.src === 'pk').map(s => s.name));
const missPk = allPk.filter(([n]) => !haveNames.has(n));
console.log('\n宝可梦图鉴应有 ' + allPk.length + ' 只 · 已收录 ' + (allPk.length - missPk.length) + ' · 缺 ' + missPk.length);
if (missPk.length) {
  console.log('缺的（按图鉴号）：');
  missPk.sort((a, b) => a[1] - b[1]).slice(0, 40).forEach(([n, id]) => console.log('  #' + String(id).padStart(4) + ' ' + n));
}

/* 2. PokéAPI 中文名 与 数据源中文名 的差异：找出因为译名不同而"丢失"的 */
const API_IDS = new Map(allPk.map(([n, id]) => [n, id]));
/* 关都城都应有 251 只，检查缺哪些号 */
const kantoIds = allPk.filter(([, id]) => id <= 251).map(([n, id]) => [n, id]);
const kantoMiss = kantoIds.filter(([n]) => !haveNames.has(n));
console.log('\n关都城都（#1-251）缺 ' + kantoMiss.length + ' 只：');
kantoMiss.forEach(([n, id]) => console.log('  #' + id + ' ' + n));

/* 3. 进化目标缺失：目标名字到底是数据源里的写法，还是表里根本没有 */
const MISS = ['霸王花', '美丽花', '猫老大', '喵头目', '蚊香泳士', '蚊香蛙皇', '呆壳兽', '呆呆王', '巨钳螳螂', '劈斧螳螂', '水伊布', '雷伊布', '火伊布', '太阳伊布', '月亮伊布', '叶伊布', '冰伊布', '仙子伊布', '沼王', '土王', '玛狃拉', '大狃拉', '飞腿郎', '快拳郎', '战舞郎', '武斗酷猫'];
console.log('\n进化目标是否在物种表里：');
MISS.forEach(n => {
  const inTable = !!byName[n];
  const inApi = API_IDS.has(n);
  console.log('  ' + n.padEnd(8) + (inTable ? '✅ 在表里' : '❌ 不在表里') + (inApi ? ('（PokéAPI 有，#' + API_IDS.get(n) + '）') : '（PokéAPI 也没这个名字）'));
});
