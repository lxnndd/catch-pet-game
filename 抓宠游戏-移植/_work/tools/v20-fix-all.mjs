/* v20 综合修复：7 个问题 */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const F = ROOT + '/抓宠游戏-v12-clean.html';
const MOVES_JSON = ROOT + '/_work/out/moves-v17.json';
copyFileSync(F, F.replace(/\.html$/, '.bak-v20-before.html'));
let src = readFileSync(F, 'utf8');
const before = src.length;
const done = [];
const rep = (re, to, label) => { if (!re.test(src)) { console.log('  ⚠️ ' + label + ' 未匹配'); return false; } src = src.replace(re, to); done.push(label); return true; };

/* ③ PP 统一 10/10（改数据层，最彻底：所有招式 pp=10） */
const mv = JSON.parse(readFileSync(MOVES_JSON, 'utf8'));
let ppChanged = 0;
mv.forEach(m => { if (m.pp !== 10) { m.pp = 10; ppChanged++; } });
writeFileSync(MOVES_JSON, JSON.stringify(mv, null, 1), 'utf8');
done.push('PP 全部改为 10（' + ppChanged + ' 个招式）');

/* ② 新增可通行的岩石地板地形 + 矿洞/火山地面改用它 */
rep(/var MW=350, MH=250, T=\{PATH:0,GRASS:1,TALL:2,TREE:3,WATER:4,HOSP:5,LAVA:6,ROCK:7,DEEP:8,FLOWER:9,SNOW:10,GYM:11,LEAGUE:12\};/,
  'var MW=350, MH=250, T={PATH:0,GRASS:1,TALL:2,TREE:3,WATER:4,HOSP:5,LAVA:6,ROCK:7,DEEP:8,FLOWER:9,SNOW:10,GYM:11,LEAGUE:12,ROCKFLOOR:13};',
  '新增 ROCKFLOOR 地形');
/* 矿洞地面 → 岩地（可走），只留少量岩壁当障碍 */
rep(/else if\(r==="mine"\) v=Math\.random\(\)<0\.55\?T\.ROCK:\(Math\.random\(\)<0\.25\?T\.TALL:T\.GRASS\);/,
  'else if(r==="mine") v=Math.random()<0.08?T.ROCK:(Math.random()<0.12?T.TALL:T.ROCKFLOOR);   /* v20：矿洞地板改成可通行的岩地，只留少量岩壁 */',
  '矿洞地面改岩地');
/* 火山地面也改岩地（暗色背景板，不再是绿草） */
rep(/else if\(r==="volcano"\) v=Math\.random\(\)<0\.14\?T\.LAVA:\(Math\.random\(\)<0\.22\?T\.ROCK:T\.GRASS\);/,
  'else if(r==="volcano") v=Math.random()<0.12?T.LAVA:(Math.random()<0.16?T.ROCK:T.ROCKFLOOR);   /* v20：火山地面用暗岩地 */',
  '火山地面改岩地');
/* draw 渲染岩地（灰色背景板） */
rep(/    else if\(v===T\.SNOW\)\{/,
  `    else if(v===T.ROCKFLOOR){
      /* v20 岩地（矿洞/火山的地板）：只是背景，可以走 */
      ctx.fillStyle="#b9b2a6"; ctx.fillRect(px,py,TILE,TILE);
      ctx.fillStyle="#aea79b"; ctx.fillRect(px+2,py+3,9,7); ctx.fillRect(px+15,py+16,11,8);
      ctx.fillStyle="#c9c2b6"; ctx.fillRect(px+6,py+22,7,4);
    }
    else if(v===T.SNOW){`,
  'draw 渲染岩地');

/* ① 城镇围栏：四个方向都留出入口 + 向外清出通道（矿洞也能进） */
rep(/for\(var fy=cy-6;fy<=cy\+6;fy\+\+\)for\(var fx=cx-8;fx<=cx\+8;fx\+\+\)\{\r?\n    if\(!inb2\(fx,fy\)\) continue;\r?\n    if\(Math\.abs\(fx-cx\)===8\|\|Math\.abs\(fy-cy\)===6\)\{\r?\n      var isDoor=\(\(fy===cy\|\|fy===cy\+1\)&&Math\.abs\(fx-cx\)===8\);\r?\n      m\[I\(fx,fy\)\]=isDoor\?T\.PATH:T\.TREE;\r?\n    \}\r?\n  \}/,
  `/* v20：围栏四个方向都留 3 格宽出入口 */
  for(var fy=cy-6;fy<=cy+6;fy++)for(var fx=cx-8;fx<=cx+8;fx++){
    if(!inb2(fx,fy)) continue;
    if(Math.abs(fx-cx)===8||Math.abs(fy-cy)===6){
      var isDoor=((Math.abs(fy-cy)<=1&&Math.abs(fx-cx)===8)||(Math.abs(fx-cx)<=1&&Math.abs(fy-cy)===6));
      m[I(fx,fy)]=isDoor?T.PATH:T.TREE;
    }
  }
  /* v20：从四个出入口向外再清 8 格通道，保证一定能走进城镇（矿洞/火山尤其需要） */
  [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(dir){
    for(var k=1;k<=8;k++){
      var px2=cx+dir[0]*(8+k), py2=cy+dir[1]*(6+k);
      for(var w=-1;w<=1;w++){
        var qx2=px2+(dir[0]?0:w), qy2=py2+(dir[0]?w:0);
        if(!inb2(qx2,qy2)) continue;
        var qv=m[I(qx2,qy2)];
        if(qv!==T.HOSP&&qv!==T.GYM&&qv!==T.LEAGUE) m[I(qx2,qy2)]=T.PATH;
      }
    }
  });`,
  '城镇四向出入口 + 外清通道');

/* ⑤ 初始伙伴 5 级 */
rep(/(function chooseStarter\(id\)\{\r?\n  var sp=byId\(id\);\r?\n  var pet=newPet\(id\);)/,
  `$1
  /* v20：初始伙伴直接 5 级（原来 1 级太弱，开局体验差） */
  pet.lv=5; pet.exp=0; pet.hp=maxHpOf(pet); ensureMoves(pet);`,
  '初始伙伴 5 级');

/* ⑦ 道馆只弹一次（记录已访问） */
rep(/if\(tv===T\.GYM\)\{ var _gt=gymAt\(nx,ny\); updateHUD\(\); draw\(\); save\(\); if\(_gt\)\{ openGym\(_gt\); return; \} \}/,
  `if(tv===T.GYM){ var _gt=gymAt(nx,ny); updateHUD(); draw(); save();
    if(_gt){ if(!S.gymsSeen) S.gymsSeen={}; if(!S.gymsSeen[_gt.region]){ S.gymsSeen[_gt.region]=1; openGym(_gt); return; } } }`,
  '道馆只弹一次');
rep(/v:2, coins:20, treats:1, balls:\[3,0,0\], badges:\[\],/, 'v:2, coins:20, treats:1, balls:[3,0,0], badges:[], gymsSeen:{},', '存档加 gymsSeen');

/* ⑥ 遇敌提示 HP 修正：在 rollEnemy 里就定下等级与 HP，面板与实战一致 */
rep(/return \{sp:sp,hp:hp,trait:randTrait\(\)\}/,
  `/* v20：遇敌时就把等级与 HP 定下来（原来面板显示的是 Lv1 的 HP，进战斗又按等级重算 → 对不上） */
  var _reg2=regionAt(S.pos.x,S.pos.y), _lr2=LV_RANGE[_reg2]||[1,25];
  var _top2=topPartyLv();
  var _lv2=clamp(_top2+ri(-3,3),1,100);
  _lv2=clamp(_lv2,_lr2[0],_lr2[1]);
  if(_top2<=2) _lv2=Math.min(_lv2,3);
  var _hp2=Math.max(1, Math.round(maxHpAt(sp,_lv2)*(0.9+Math.random()*0.2)));
  return {sp:sp,hp:_hp2,lv:_lv2,trait:randTrait()}`,
  '遇敌定等级与HP');
/* startWildBattle 优先用 e.lv */
rep(/if\(opts\.foeLv\)\{ foeLv=clamp\(opts\.foeLv,1,100\); \}/,
  'if(opts.foeLv){ foeLv=clamp(opts.foeLv,1,100); } else if(e && e.lv){ foeLv=clamp(e.lv,1,100); }',
  '开战沿用遇敌时的等级');
rep(/function maxHpAt\(sp,lv\)|var maxHpAt=function/,
  (m0) => m0, '（maxHpAt 存在性检查）');

/* ④ 队伍面板：按钮独占一行，别压住 HP */
rep(/\.pet-row \.acts\{display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end;\}/,
  `.pet-row .desc{flex:1 1 55%; min-width:0;}
.pet-row .acts{display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-start; flex:1 1 100%; margin-top:4px;}`,
  '队伍面板布局修正');

writeFileSync(F, src, 'utf8');
console.log('v20 修复：' + (before / 1024).toFixed(0) + ' → ' + (src.length / 1024).toFixed(0) + ' KB');
done.forEach(d => console.log('  ✅ ' + d));
console.log('  校验：' + [
  src.includes('ROCKFLOOR:13') ? '岩地✅' : '岩地❌',
  src.includes('pet.lv=5') ? '5级✅' : '5级❌',
  src.includes('gymsSeen') ? '道馆一次✅' : '道馆❌',
  src.includes('e.lv') ? '遇敌等级✅' : '遇敌❌',
  src.includes('flex:1 1 100%') ? 'UI✅' : 'UI❌',
].join(' · '));
