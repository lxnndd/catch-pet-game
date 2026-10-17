/* v29c：①城镇（树围起来）成为安全区，不再遇敌 ②城镇之间用十字街连通 ③左上角小地图
   用法：node v29-patch-f.mjs --apply */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v29f.html';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const done = [];
const rep = (a, b, tag) => {
  if (!work.includes(a)) { console.error('  !! 找不到锚点: ' + tag); process.exit(1); }
  work = work.replace(a, b); done.push(tag); console.log('  [改动] ' + tag);
};

/* ── 1. 常量：城镇安全区半径 ── */
rep('var TOWNS=[];',
  ['var TOWNS=[];',
    'var TOWN_HW=10, TOWN_HH=8;   /* v29c：城镇安全区半径（与 buildTown 的树围栏一致） */'].join('\n'),
  '新增 TOWN_HW / TOWN_HH 常量');

/* ── 2. 全局 inTownAt（安全区判定） ── */
rep('function tileAt(x,y){ if(x<0||y<0||x>=MW||y>=MH) return T.TREE; return map[y*MW+x]; }',
  ['/* v29c：城镇范围判定 —— 树围起来的这片就是安全区，里面不会遇到宠 */',
    'function inTownAt(x,y){',
    '  for(var i=0;i<TOWNS.length;i++){',
    '    var t=TOWNS[i];',
    '    if(Math.abs(x-t.x)<=TOWN_HW && Math.abs(y-t.y)<=TOWN_HH) return t;',
    '  }',
    '  return null;',
    '}',
    'function tileAt(x,y){ if(x<0||y<0||x>=MW||y>=MH) return T.TREE; return map[y*MW+x]; }'].join('\n'),
  '新增全局 inTownAt()');

/* ── 3. move()：城镇内不遇敌 ── */
rep('  var _er=encRateOf(tv);',
  ['  /* v29c：城镇（树围起来那片）是安全区，里面不会遇到宠 */',
    '  var _er=inTownAt(nx,ny) ? 0 : encRateOf(tv);'].join('\n'),
  'move() 城镇内不遇敌');

/* ── 4. genMap：城镇之间铺路连通 ── */
rep(
  ['    buildTown(spot.x,spot.y,reg,cfg[0],cfg[1],cfg[2]);',
    '  });',
    '  if(TOWNS.length){'].join('\n'),
  ['    buildTown(spot.x,spot.y,reg,cfg[0],cfg[1],cfg[2]);',
    '  });',
    '  /* v29c：城镇之间用十字街连通 —— 每个镇都接一条路到平原镇（中心），形成放射状路网。',
    '     用 BFS 找路：优先绕开深水/浅水，绕不开才穿水；沿途把树/岩/岩浆清成 STREET。 */',
    '  if(TOWNS.length>=2){',
    '    var _hubT=null;',
    '    TOWNS.forEach(function(t){ if(t.region==="plain") _hubT=t; });',
    '    if(!_hubT) _hubT=TOWNS[0];',
    '    var _bfsPath=function(x0,y0,x1,y1,avoidWater){',
    '      var prev=new Int32Array(MW*MH); prev.fill(-1);',
    '      var q=[I(x0,y0)]; prev[q[0]]=q[0];',
    '      var goal=I(x1,y1);',
    '      for(var head=0;head<q.length;head++){',
    '        var cur=q[head];',
    '        if(cur===goal) break;',
    '        var cx4=cur%MW, cy4=(cur-cx4)/MW;',
    '        var nb=[[cx4+1,cy4],[cx4-1,cy4],[cx4,cy4+1],[cx4,cy4-1]];',
    '        for(var k4=0;k4<4;k4++){',
    '          var nx4=nb[k4][0], ny4=nb[k4][1];',
    '          if(!inb2(nx4,ny4)) continue;',
    '          var ni4=I(nx4,ny4);',
    '          if(prev[ni4]!==-1) continue;',
    '          var v4=m[ni4];',
    '          if(avoidWater && (v4===T.WATER||v4===T.DEEP)) continue;',
    '          prev[ni4]=cur; q.push(ni4);',
    '        }',
    '      }',
    '      if(prev[goal]===-1) return null;',
    '      var path=[], c4=goal;',
    '      while(c4!==prev[c4]){ path.push(c4); c4=prev[c4]; }',
    '      path.push(c4);',
    '      return path;',
    '    };',
    '    var _pave=function(idx){',
    '      var v5=m[idx];',
    '      if(v5===T.HOSP||v5===T.GYM||v5===T.LEAGUE) return;   /* 不压建筑 */',
    '      m[idx]=T.STREET;',
    '    };',
    '    TOWNS.forEach(function(t){',
    '      if(t===_hubT) return;',
    '      var path=_bfsPath(_hubT.x,_hubT.y,t.x,t.y,true) || _bfsPath(_hubT.x,_hubT.y,t.x,t.y,false);',
    '      if(path) path.forEach(_pave);',
    '    });',
    '  }',
    '  if(TOWNS.length){'].join('\n'),
  'genMap 城镇之间铺路连通（BFS 寻路）');

/* ── 5. 小地图 DOM ── */
rep('      <canvas id="game-canvas"></canvas>',
  ['      <canvas id="game-canvas"></canvas>',
    '      <canvas id="minimap" width="264" height="188" title="小地图：黄点是小镇，红点是当前位置"></canvas>'].join('\n'),
  '新增 #minimap canvas');

/* ── 6. 小地图 CSS ── */
rep('#stage{\n  position:relative;',
  ['#minimap{',
    '  position:absolute; left:8px; top:8px; width:132px; height:94px;',
    '  border-radius:8px; border:2px solid rgba(0,0,0,.55); background:#18220f;',
    '  box-shadow:0 2px 10px rgba(0,0,0,.35); z-index:6; image-rendering:pixelated; pointer-events:none;',
    '}',
    '@media (max-width:520px){ #minimap{width:104px; height:74px;} }',
    '#stage{',
    '  position:relative;'].join('\n'),
  '小地图 CSS');

/* ── 7. 小地图绘制函数 ── */
rep('function resizeCanvas(){',
  ['/* v29c：左上角小地图 —— 地形缩略图（缓存）+ 小镇黄点 + 玩家红点 */',
    'var _mmBase=null, _mmMapRef=null;',
    'function mmColors(){',
    '  return {',
    '    "0":[206,186,140],   /* PATH 沙地 */',
    '    "1":[112,178,110],   /* GRASS 草地 */',
    '    "2":[70,140,80],     /* TALL 高草 */',
    '    "3":[38,84,48],      /* TREE 树 */',
    '    "4":[96,150,200],    /* WATER 浅水 */',
    '    "5":[240,240,240],   /* HOSP 医院 */',
    '    "6":[220,90,40],     /* LAVA 岩浆 */',
    '    "7":[120,112,104],   /* ROCK 岩壁 */',
    '    "8":[46,92,150],     /* DEEP 深海 */',
    '    "9":[226,150,190],   /* FLOWER 花田 */',
    '    "10":[232,240,246],  /* SNOW 雪地 */',
    '    "11":[180,120,200],  /* GYM 道馆 */',
    '    "12":[240,200,90],   /* LEAGUE 联盟 */',
    '    "13":[160,150,140],  /* ROCKFLOOR 岩地 */',
    '    "14":[228,206,150],  /* TOWN 城镇地面 */',
    '    "15":[160,160,158]   /* STREET 石板街 */',
    '  };',
    '}',
    'function buildMinimapBase(){',
    '  var cv=$("minimap"); if(!cv || !map || !map.length) return;',
    '  var g=cv.getContext("2d");',
    '  var cols=mmColors();',
    '  var W=cv.width, H=cv.height;',
    '  var img=g.createImageData(W,H);',
    '  for(var py=0;py<H;py++){',
    '    var y=Math.min(MH-1, Math.floor(py*MH/H));',
    '    for(var px=0;px<W;px++){',
    '      var x=Math.min(MW-1, Math.floor(px*MW/W));',
    '      var c=cols[String(map[y*MW+x])] || [40,60,40];',
    '      var o=(py*W+px)*4;',
    '      img.data[o]=c[0]; img.data[o+1]=c[1]; img.data[o+2]=c[2]; img.data[o+3]=255;',
    '    }',
    '  }',
    '  g.putImageData(img,0,0);',
    '  _mmBase=g.getImageData(0,0,W,H);',
    '  _mmMapRef=map;',
    '}',
    'function drawMinimap(){',
    '  var cv=$("minimap");',
    '  if(!cv || !map || !map.length || !S || !S.pos) return;',
    '  var g=cv.getContext("2d");',
    '  if(!_mmBase || _mmMapRef!==map) buildMinimapBase();',
    '  if(!_mmBase) return;',
    '  g.putImageData(_mmBase,0,0);',
    '  var W=cv.width, H=cv.height, sx=W/MW, sy=H/MH;',
    '  /* 小镇（大致位置） */',
    '  for(var i=0;i<TOWNS.length;i++){',
    '    var t=TOWNS[i];',
    '    var px=t.x*sx, py=t.y*sy;',
    '    g.beginPath(); g.arc(px,py,8,0,Math.PI*2); g.fillStyle="rgba(0,0,0,.5)"; g.fill();',
    '    g.beginPath(); g.arc(px,py,5.5,0,Math.PI*2); g.fillStyle="#ffd54a"; g.fill();',
    '    g.lineWidth=1.5; g.strokeStyle="#2b1d00"; g.stroke();',
    '  }',
    '  /* 玩家当前位置 */',
    '  var mx=S.pos.x*sx, my=S.pos.y*sy;',
    '  g.beginPath(); g.arc(mx,my,8,0,Math.PI*2); g.fillStyle="rgba(255,255,255,.92)"; g.fill();',
    '  g.beginPath(); g.arc(mx,my,5,0,Math.PI*2); g.fillStyle="#e5484d"; g.fill();',
    '  g.lineWidth=1.2; g.strokeStyle="#fff"; g.stroke();',
    '}',
    'function resizeCanvas(){'].join('\n'),
  '新增 mmColors / buildMinimapBase / drawMinimap');

/* ── 8. draw() 末尾刷新小地图 ── */
rep(
  ['  var lsp=leadSp();',
    '  if(lsp){',
    '    ctx.font="15px sans-serif";',
    '    ctx.fillText(lsp.emoji,ppx+15,ppy+6);',
    '  }',
    '}'].join('\n'),
  ['  var lsp=leadSp();',
    '  if(lsp){',
    '    ctx.font="15px sans-serif";',
    '    ctx.fillText(lsp.emoji,ppx+15,ppy+6);',
    '  }',
    '  drawMinimap();   /* v29c：同步刷新左上角小地图 */',
    '}'].join('\n'),
  'draw() 末尾刷新小地图');

/* ── 校验 ── */
const need = ['var TOWN_HW=10, TOWN_HH=8;', 'function inTownAt(x,y){', 'var _er=inTownAt(nx,ny) ? 0 : encRateOf(tv);',
  'var _bfsPath=function(x0,y0,x1,y1,avoidWater){', 'id="minimap"', 'function drawMinimap(){', 'drawMinimap();   /* v29c'];
need.forEach(n => { if (!work.includes(n)) { console.error('!! 校验失败，缺: ' + n); process.exit(1); } });
console.log('\n共 ' + done.length + ' 项改动' + (apply ? '' : '（未加 --apply，仅预演）'));
if (!apply) process.exit(0);
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE + ' (' + Buffer.byteLength(work, 'utf8') + ' 字节)');
