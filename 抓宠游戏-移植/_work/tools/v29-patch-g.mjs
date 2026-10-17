/* v29d：所有道路统一 1 格宽
   现状：镇内十字街（1 格 ✅）· 镇间连接路（1 格 ✅）· 城镇门口四向通道（3 格 ❌）· 围栏的门（3 格 ❌）
   用法：node v29-patch-g.mjs --apply */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
/* 2026-09-28：项目已迁到 AI\抓宠游戏\抓宠游戏-移植\，这里改用相对定位（tools 在 _work/tools 下），
   以后整个项目再搬家，脚本也不会因为硬编码路径而失效。 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v29g.html';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const done = [];
const rep = (a, b, tag) => {
  if (!work.includes(a)) { console.error('  !! 找不到锚点: ' + tag); process.exit(1); }
  work = work.replace(a, b); done.push(tag); console.log('  [改动] ' + tag);
};

/* ── 1. 城镇门口的四向通道：3 格宽 → 1 格宽 ── */
rep(
  ['    /* v20：四个方向向外清 10 格通道，保证被岩壁/树包围时也能进城 */',
    '    [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(dir){',
    '      for(var k=1;k<=4;k++){',
    '        var cpx=cx+dir[0]*(7+k), cpy=cy+dir[1]*(5+k);',
    '        for(var cw=-1;cw<=1;cw++){',
    '          var cqx=cpx+(dir[0]?0:cw), cqy=cpy+(dir[0]?cw:0);',
    '          if(!inb2(cqx,cqy)) continue;',
    '          var cqv=m[I(cqx,cqy)];',
    '          if(cqv!==T.HOSP&&cqv!==T.GYM&&cqv!==T.LEAGUE) m[I(cqx,cqy)]=gbase;   /* v23：城外通道铺地区地面，不再是一条石板大道跑到城外 */',
    '        }',
    '      }',
    '    });'].join('\n'),
  ['    /* v29d：四个方向向外清 4 格通道，宽度收成 1 格（与镇内街道、镇间道路同宽） */',
    '    [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(dir){',
    '      for(var k=1;k<=4;k++){',
    '        var cpx=cx+dir[0]*(7+k), cpy=cy+dir[1]*(5+k);',
    '        if(!inb2(cpx,cpy)) continue;',
    '        var cqv=m[I(cpx,cpy)];',
    '        if(cqv!==T.HOSP&&cqv!==T.GYM&&cqv!==T.LEAGUE) m[I(cpx,cpy)]=gbase;   /* 城外通道铺地区地面，不铺石板 */',
    '      }',
    '    });'].join('\n'),
  '城镇门口通道 3 格宽 → 1 格宽');

/* ── 2. 围栏的门：3 格宽 → 1 格宽 ── */
rep(
  '        var isDoor=((Math.abs(fy-cy)<=1&&Math.abs(fx-cx)===8)||(Math.abs(fx-cx)<=1&&Math.abs(fy-cy)===6));',
  '        var isDoor=((fy===cy&&Math.abs(fx-cx)===8)||(fx===cx&&Math.abs(fy-cy)===6));   /* v29d：门收成 1 格宽 */',
  '围栏的门 3 格宽 → 1 格宽');

/* ── 校验 ── */
const need = ['var isDoor=((fy===cy&&Math.abs(fx-cx)===8)||(fx===cx&&Math.abs(fy-cy)===6));',
  'if(cqv!==T.HOSP&&cqv!==T.GYM&&cqv!==T.LEAGUE) m[I(cpx,cpy)]=gbase;'];
need.forEach(n => { if (!work.includes(n)) { console.error('!! 校验失败，缺: ' + n); process.exit(1); } });
if (work.includes('for(var cw=-1;cw<=1;cw++){')) { console.error('!! 仍有 3 格宽通道'); process.exit(1); }
if (work.includes('Math.abs(fy-cy)<=1&&Math.abs(fx-cx)===8')) { console.error('!! 仍有 3 格宽门'); process.exit(1); }
console.log('\n共 ' + done.length + ' 项改动' + (apply ? '' : '（未加 --apply，仅预演）'));
if (!apply) process.exit(0);
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE + ' (' + Buffer.byteLength(work, 'utf8') + ' 字节，LF 计)');
