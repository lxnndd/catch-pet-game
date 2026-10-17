/* Step1：修正 rarity 误判（用 PokéAPI 权威名单）+ 应用新爆率 RARITY_W=[1, 0.087, 0.0011] */
import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const SPECIES_JSON = ROOT + '/_work/out/species-v17.json';
const LEG_JSON = ROOT + '/_work/v17-data/poke-legendary.json';
const F = ROOT + '/抓宠游戏-v12-clean.html';

const leg = JSON.parse(readFileSync(LEG_JSON, 'utf8'));
const LEG = new Set(leg.legendary), MYTH = new Set(leg.mythical);
const isGod = (num) => LEG.has(num) || MYTH.has(num);
console.log('权威名单：传奇 ' + LEG.size + ' · 幻兽 ' + MYTH.size);

const sp = JSON.parse(readFileSync(SPECIES_JSON, 'utf8'));
let toGod = 0, demoted = 0, kept = 0;
const demotedList = [];
sp.forEach(s => {
  if (s.src !== 'pk') return;                      /* 先只修宝可梦（洛克的稀有度另论） */
  const num = Number(String(s.id).replace(/^pk-0*/, ''));
  const god = isGod(num);
  const hp = s.hpBase || 50;
  if (god) {
    if (s.rarity !== 2) toGod++;
    s.rarity = 2;
  } else if (s.rarity === 2) {
    /* 原来被 note 里的"传说 阿尔宙斯"误判成神兽的普通宠 → 按体型重新定档 */
    demoted++;
    demotedList.push(s.name + '(#' + num + ')');
    s.rarity = hp >= 100 ? 1 : 0;
  } else {
    /* 非神兽：保持「血厚=稀有」的规则（准神/大器晚成） */
    const want = hp >= 100 ? 1 : 0;
    if (s.rarity !== want) { s.rarity = want; kept++; }
  }
});
writeFileSync(SPECIES_JSON, JSON.stringify(sp, null, 1), 'utf8');
console.log('✅ 修正：新增神兽档 ' + toGod + ' 只 · 误判降级 ' + demoted + ' 只 · 其他调整 ' + kept + ' 只');
console.log('   被降级的（原来被当成神兽的普通宠）：' + demotedList.slice(0, 12).join('、') + (demotedList.length > 12 ? ' …共 ' + demotedList.length + ' 只' : ''));
const pk = sp.filter(s => s.src === 'pk');
console.log('   现在宝可梦：常见 ' + pk.filter(s => s.rarity === 0).length + ' · 稀有 ' + pk.filter(s => s.rarity === 1).length + ' · 神兽 ' + pk.filter(s => s.rarity === 2).length);
console.log('   其中神兽：' + pk.filter(s => s.rarity === 2).slice(0, 20).map(s => s.name).join('、') + ' …');

/* 改 HTML 里的爆率权重：传说 0.1% / 稀有 8% / 常见 91.9% */
let src = readFileSync(F, 'utf8');
const OLD_W = /var RARITY_W=\[[^\]]*\];/;
const m = src.match(OLD_W);
console.log('\n原 RARITY_W：' + (m ? m[0] : '未找到'));
/* 令常见=1，则稀有 = 0.08/0.919 = 0.08705，传说 = 0.001/0.919 = 0.001088 */
const NEW_W = 'var RARITY_W=[1,0.087,0.0011];';
if (m) src = src.replace(OLD_W, NEW_W);
else throw new Error('找不到 RARITY_W');
/* 同步注释里的概率说明 */
src = src.replace(/\/\* 稀有度 = 相遇概率权重（越稀有越低）：[^*]*\*\//,
  '/* 稀有度 = 相遇概率权重（越稀有越低）：常见 91.9% / 稀有 8.0% / 神兽·幻兽 0.10% */');
writeFileSync(F, src, 'utf8');
console.log('✅ RARITY_W 已改为 ' + NEW_W);
const tot = 1 + 0.087 + 0.0011;
console.log('   换算：常见 ' + (1 / tot * 100).toFixed(1) + '% · 稀有 ' + (0.087 / tot * 100).toFixed(1) + '% · 神兽 ' + (0.0011 / tot * 100).toFixed(3) + '%');
console.log('   校验注释同步：' + (src.includes('神兽·幻兽 0.10%') ? '✅' : '❌'));
