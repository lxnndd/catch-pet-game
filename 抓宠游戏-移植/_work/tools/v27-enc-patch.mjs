/* v27 遇敌频率补丁：把「只有高草丛/水域遇敌」改成「按地形表遇敌」
   背景：genMap 给雪原铺 90% 雪地、火山铺 74% 岩地，这两种地形原来不参与遇敌判定
        → 雪原/火山永远遇不到怪；平原 94% 是普通草地 → 平均 80+ 步才遇一次。
   用法：node v27-enc-patch.mjs --apply */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v27-enc.html';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
const norm = s => s.split('\r\n').join('\n');
let work = norm(src);
const changes = [];

/* ── 1. 常量区插入 ENC_RATE 地形遇敌表 ── */
const anchor1 = 'var RARITY_W=[1,0.087,0.0011];';
const block = [
  'var RARITY_W=[1,0.087,0.0011];',
  '/* v27 遇敌率按地形配置 —— 原来只有高草丛(TALL)与水域会遇敌，',
  '   而雪原 90% 是雪地、火山 74% 是岩地、平原 94% 是普通草地，这些地形都不参与判定，',
  '   导致「雪原/火山永远遇不到怪、平原要走 80+ 步」。这里给各类地面统一配率，',
  '   九地区实测落在 10~20 步一次。道路/城镇/街道/深林不在此表 → 永不遇敌。 */',
  'var ENC_RATE={};',
  'ENC_RATE[T.TALL]=0.20;        /* 高草丛 */',
  'ENC_RATE[T.GRASS]=0.05;       /* 普通草地 */',
  'ENC_RATE[T.FLOWER]=0.06;      /* 花田 */',
  'ENC_RATE[T.SNOW]=0.10;        /* 雪原雪地 */',
  'ENC_RATE[T.ROCKFLOOR]=0.10;   /* 矿洞/火山岩地 */',
  'ENC_RATE[T.PATH]=0.05;        /* 荒漠沙地 */',
  'ENC_RATE[T.WATER]=0.10;       /* 浅水 */',
  'ENC_RATE[T.DEEP]=0.08;        /* 深海 */',
  'function encRateOf(v){ return ENC_RATE[v]||0; }',
].join('\n');
if (work.includes(anchor1 + '\n/* v27 遇敌率按地形配置')) {
  console.log('[1] ENC_RATE 已存在，跳过');
} else if (work.includes(anchor1)) {
  work = work.replace(anchor1, block);
  changes.push('已插入 ENC_RATE 地形遇敌表（8 种地形）');
} else { console.error('!! 找不到 RARITY_W 锚点'); process.exit(1); }

/* ── 2. move() 里的遇敌判定改成查表（原来只认 TALL / 水域两段） ── */
const oldMove = [
  '  var got=checkSparkle(nx,ny);',
  '  if(!got && tv===T.TALL){',
  '    maybeSpawnSparkle();',
  '    if(Math.random()<0.20){ draw(); openEncounter(rollEnemy()); return; }',
  '  }',
  '  /* 水域遇敌（河里海里也有宠） */',
  '  if(!got && isWaterTile(tv)){',
  '    maybeSpawnSparkle();',
  '    if(Math.random()<0.16){ draw(); openEncounter(rollEnemy()); return; }',
  '  }',
].join('\n');
const newMove = [
  '  var got=checkSparkle(nx,ny);',
  '  /* v27：遇敌率统一走地形表 ENC_RATE（高草丛/草地/花田/雪地/岩地/沙地/水域），',
  '     原来只判定 TALL 与水域，雪原(雪地)与火山(岩地)等于永不遇敌。 */',
  '  var _er=encRateOf(tv);',
  '  if(!got && _er>0){',
  '    maybeSpawnSparkle();',
  '    if(Math.random()<_er){ draw(); openEncounter(rollEnemy()); return; }',
  '  }',
].join('\n');
if (work.includes(newMove)) {
  console.log('[2] move() 遇敌判定已改过，跳过');
} else if (work.includes(oldMove)) {
  work = work.replace(oldMove, newMove);
  changes.push('move() 遇敌判定改为地形查表');
} else { console.error('!! 找不到 move() 遇敌段（原文不匹配）'); process.exit(1); }

/* ── 校验：新代码必须完整 ── */
const need = ['var ENC_RATE={}', 'function encRateOf(v)', 'ENC_RATE[T.SNOW]=0.10', 'var _er=encRateOf(tv)'];
need.forEach(n => { if (!work.includes(n)) { console.error('!! 校验失败，缺: ' + n); process.exit(1); } });
console.log('\n校验通过。改动 ' + changes.length + ' 项：');
changes.forEach((c, i) => console.log('  ' + (i + 1) + '. ' + c));
if (!apply) { console.log('\n（未加 --apply，仅预演）'); process.exit(0); }
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('\n已备份 → ' + BAK); }
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE + ' (' + Buffer.byteLength(work, 'utf8') + ' 字节)');
