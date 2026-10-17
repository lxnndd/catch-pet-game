/* v29 批次 B：①图鉴去掉说明文字 + 顶端分类筛选 ②队伍/仓库宠物点击弹出详情面板（HP/攻/防/特攻/特防/速度/经验）
   用法：node v29-patch-b.mjs --apply */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v29b.html';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const done = [];
const rep = (a, b, tag) => {
  if (b && work.includes(b)) { console.log('  [跳过] ' + tag + '（已改过）'); return; }
  if (!b && !work.includes(a)) { console.log('  [跳过] ' + tag + '（已删除）'); return; }
  if (!work.includes(a)) { console.error('  !! 找不到锚点: ' + tag); process.exit(1); }
  work = work.replace(a, b); done.push(tag); console.log('  [改动] ' + tag);
};

/* ── 1. 图鉴 DOM：删掉长说明文字，换成顶端工具条 ── */
rep(
  ['        <p class="dex-note">克制速查：草→水→火→草、电→水、岩克火电、战斗克普与岩但被草水电反制、传说克全系但被抵抗；同系互抵。七大地区含花海，天空宠在花海/海洋/林间上空更易出没，战斗系坐镇火山与洞穴。</p>',
    '        <div class="dex-grid" id="dex-grid"></div>'].join('\n'),
  ['        <div class="dex-toolbar" id="dex-toolbar"></div>',
    '        <div class="dex-grid" id="dex-grid"></div>'].join('\n'),
  '图鉴顶部：删说明文字 + 新增 #dex-toolbar');

/* ── 2. 新增宠物详情面板 DOM ── */
rep(
  '  <!-- SECTION: hospital modal dom -->',
  ['  <!-- SECTION: pet info modal dom (v29) -->',
    '  <div class="overlay hidden" id="panel-petinfo">',
    '    <div class="modal modal-sm">',
    '      <div class="modal-head"><h2 id="petinfo-title">🔍 宠物详情</h2><button class="x-btn" data-close="panel-petinfo">✕</button></div>',
    '      <div class="modal-body" id="petinfo-body"></div>',
    '    </div>',
    '  </div>',
    '',
    '  <!-- SECTION: hospital modal dom -->'].join('\n'),
  '新增 #panel-petinfo 弹窗 DOM');

/* ── 3. CSS：工具条 + 属性/经验列表 ── */
rep(
  '.rarity-tag{font-size:11px; padding:1px 8px;',
  ['.dex-toolbar{display:flex; flex-wrap:wrap; gap:6px; justify-content:center; padding:2px 0 8px;}',
    '/* v29 宠物详情：属性/经验列表 */',
    '.stat-list{display:flex; flex-direction:column; gap:4px; margin:8px 0;}',
    '.stat-line{display:flex; justify-content:space-between; align-items:center; padding:5px 10px; border-radius:8px; background:rgba(255,255,255,.06); font-size:13px;}',
    '.stat-line b{font-weight:700;}',
    '.rarity-tag{font-size:11px; padding:1px 8px;'].join('\n'),
  'CSS：.dex-toolbar / .stat-list / .stat-line');

/* ── 4. openDex：去掉卡片说明行，筛选移到顶端工具条 ── */
rep(
  ['      meta.textContent=typeText(sp)+" · 血量基数 "+hpBaseOf(sp)+(sp.ride?" · "+({fly:"🕊 飞行坐骑",water:"🌊 水上坐骑",land:"🐎 陆地坐骑"}[sp.ride]||"可骑乘"):"")+(sp.fly?" ☁天空":"")+" · 持有×"+ownedCount(sp.id)+" · "+sp.habitat.map(function(h){return REGION_NAME[h];}).join("/");',
    '    }else{',
    '      var src=evoSrcOf(sp.id);',
    '      meta.textContent=src?("进化形态 · "+src.name+" 到 Lv."+src.lv+"自动进化"+(src.branch?"（或另一分支）":"")):"未捕获 · "+RARITY_NAME[sp.rarity]+" · "+sp.habitat.map(function(h){return REGION_NAME[h];}).join("/");'].join('\n'),
  ['      /* v29：图鉴卡片不再显示说明文字，只留头像/名字/来源 */',
    '    }else{',
    '      var src=evoSrcOf(sp.id);'].join('\n'),
  'openDex 删除已捕获卡的说明行');
rep(
  '    card.appendChild(face); card.appendChild(nm); card.appendChild(badge); card.appendChild(meta);',
  '    card.appendChild(face); card.appendChild(nm); card.appendChild(badge);',
  'openDex 不再把说明行挂到卡片上');
/* 顶端工具条渲染 + 底部只留翻页 */
rep(
  ['  var bar=document.createElement("div"); bar.className="dex-pager";',
    '  bar.style.cssText="grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center;padding:8px 0;";',
    '  [["all","全部"],["pk","宝可梦"],["kz","洛克王国"]].forEach(function(it){',
    '    var b=document.createElement("button"); b.className="btn-sm"+(DEX_FILTER===it[0]?" on":"");',
    '    var n=it[0]==="all"?SPECIES.length:SPECIES.filter(function(x){return dexSourceOf(x)===it[0];}).length;',
    '    b.textContent=it[1]+" "+n;',
    '    b.addEventListener("click",function(){ DEX_FILTER=it[0]; DEX_PAGE=0; openDex(0); });',
    '    bar.appendChild(b);',
    '  });'].join('\n'),
  ['  /* v29：分类筛选挪到顶端工具条（原来挤在底部翻页条里） */',
    '  var tb=$("dex-toolbar");',
    '  if(tb){',
    '    tb.textContent="";',
    '    [["all","全部"],["pk","宝可梦"],["kz","洛克王国"]].forEach(function(it){',
    '      var b=document.createElement("button"); b.className="btn-sm"+(DEX_FILTER===it[0]?" on":"");',
    '      var n=it[0]==="all"?SPECIES.length:SPECIES.filter(function(x){return dexSourceOf(x)===it[0];}).length;',
    '      b.textContent=it[1]+" "+n;',
    '      b.addEventListener("click",function(){ DEX_FILTER=it[0]; DEX_PAGE=0; openDex(0); });',
    '      tb.appendChild(b);',
    '    });',
    '  }',
    '  var bar=document.createElement("div"); bar.className="dex-pager";',
    '  bar.style.cssText="grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center;padding:8px 0;";'].join('\n'),
  'openDex 筛选按钮移到顶端 #dex-toolbar');

/* ── 5. 新增 statValOf / openPetInfo ── */
rep(
  'function petRowEl(p, acts, faintSuffix){',
  ['/* v29：面板用的属性实际值（种族值 → 按等级换算，与战斗公式同源） */',
    'function statValOf(sp,key,lv){',
    '  if(!sp) return 0;',
    '  return Math.max(1, Math.floor((2*statOf(sp,key)+IV)*statLvK(lv||1)));',
    '}',
    '/* v29：宠物详情面板（队伍 / 仓库 / 换宠界面点击宠物行都会打开它） */',
    'function openPetInfo(p){',
    '  if(!p) return;',
    '  var sp=byId(p.sp); if(!sp) return;',
    '  ensureMoves(p);',
    '  $("petinfo-title").textContent="🔍 "+sp.name+" Lv."+p.lv;',
    '  var body=$("petinfo-body"); body.textContent="";',
    '  var head=document.createElement("div"); head.className="enc-box";',
    '  var face=document.createElement("div"); face.className="enc-emoji"; face.textContent=sp.emoji; setAvatar(face,sp);',
    '  var nm=document.createElement("b"); nm.textContent=sp.name+(S.lead===p.uid?" ⭐首发":"");',
    '  var sub=document.createElement("span"); sub.className="enc-sub";',
    '  sub.textContent=typeText(sp)+" · "+trOf(p.trait).name+" · "+RARITY_NAME[clamp(sp.rarity,0,2)];',
    '  head.appendChild(face); head.appendChild(nm); head.appendChild(sub);',
    '  body.appendChild(head);',
    '  var rows=[',
    '    ["❤️ HP",     p.hp+" / "+maxHpOf(p)],',
    '    ["⚔️ 攻击",   statValOf(sp,"a",p.lv)+"   （种族 "+statOf(sp,"a")+"）"],',
    '    ["🛡️ 防御",   statValOf(sp,"d",p.lv)+"   （种族 "+statOf(sp,"d")+"）"],',
    '    ["🔥 特攻",   statValOf(sp,"spa",p.lv)+"   （种族 "+statOf(sp,"spa")+"）"],',
    '    ["💠 特防",   statValOf(sp,"spd",p.lv)+"   （种族 "+statOf(sp,"spd")+"）"],',
    '    ["💨 速度",   statValOf(sp,"s",p.lv)+"   （种族 "+statOf(sp,"s")+"）"],',
    '    ["✨ 经验值", (p.exp||0)+" / "+expNeed(p.lv)+(p.lv>=100?"  （已满级）":"")]',
    '  ];',
    '  var list=document.createElement("div"); list.className="stat-list";',
    '  rows.forEach(function(r){',
    '    var line=document.createElement("div"); line.className="stat-line";',
    '    var k=document.createElement("span"); k.textContent=r[0];',
    '    var v=document.createElement("b"); v.textContent=r[1];',
    '    line.appendChild(k); line.appendChild(v); list.appendChild(line);',
    '  });',
    '  body.appendChild(list);',
    '  var mh=document.createElement("p"); mh.className="dex-note";',
    '  mh.textContent="技能（想换招去队伍面板点「🔧 调整技能」）";',
    '  body.appendChild(mh);',
    '  var mg=document.createElement("div"); mg.className="learn-grid";',
    '  var mvlist=movesOf(p);',
    '  if(!mvlist.length){ var e2=document.createElement("p"); e2.className="dex-note"; e2.textContent="还没有技能。"; mg.appendChild(e2); }',
    '  mvlist.forEach(function(id){',
    '    var mv=MOVES[id]; if(!mv) return;',
    '    var c=document.createElement("div"); c.className="learn-card";',
    '    var top=document.createElement("div"); top.className="lc-top";',
    '    var tg=document.createElement("span"); tg.className="type-tag"+(mv.type!=="nor"?" t-"+mv.type:"");',
    '    tg.textContent=TYPE_NAME[mv.type];',
    '    var nm2=document.createElement("b"); nm2.textContent=mv.name;',
    '    top.appendChild(tg); top.appendChild(nm2);',
    '    var sm=document.createElement("small");',
    '    var now=(p.pp && p.pp[id]!==undefined) ? p.pp[id] : ppMaxOf(id);',
    '    sm.textContent=(mv.power?("威力 "+mv.power):"变化技")+" · PP "+now+"/"+ppMaxOf(id);',
    '    c.appendChild(top); c.appendChild(sm); mg.appendChild(c);',
    '  });',
    '  body.appendChild(mg);',
    '  $("panel-petinfo").classList.remove("hidden");',
    '}',
    'function petRowEl(p, acts, faintSuffix){'].join('\n'),
  '新增 statValOf() + openPetInfo()');

/* ── 6. petRowEl：点击宠物行打开详情 ── */
rep(
  '  row.appendChild(ico); row.appendChild(d); row.appendChild(a);\n  return row;',
  ['  row.appendChild(ico); row.appendChild(d); row.appendChild(a);',
    '  /* v29：点宠物行（按钮除外）弹出详情面板 */',
    '  row.style.cursor="pointer";',
    '  row.addEventListener("click",function(ev){',
    '    if(ev.target && ev.target.closest && ev.target.closest(".acts")) return;',
    '    openPetInfo(p);',
    '  });',
    '  return row;'].join('\n'),
  'petRowEl 点击行打开详情面板');

/* ── 校验 ── */
const need = ['id="dex-toolbar"', 'id="panel-petinfo"', 'function openPetInfo(p)', 'function statValOf(sp,key,lv)',
  '.stat-line{', 'var tb=$("dex-toolbar");', 'openPetInfo(p);'];
need.forEach(n => { if (!work.includes(n)) { console.error('!! 校验失败，缺: ' + n); process.exit(1); } });
if (work.includes('克制速查：草→水→火→草')) { console.error('!! 图鉴长说明仍在'); process.exit(1); }
console.log('\n共 ' + done.length + ' 项改动' + (apply ? '' : '（未加 --apply，仅预演）'));
if (!apply) process.exit(0);
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE + ' (' + Buffer.byteLength(work, 'utf8') + ' 字节)');
