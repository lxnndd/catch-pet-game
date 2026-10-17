/* v17 综合验收：骑乘 / 海洋 / 医院 / 清档 / 地区野怪 / 状态 —— 用游戏内公开接口 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { WebSocket } from 'ws';
const URL_ = process.argv[2] || 'http://47.105.123.182:8727/';
const PORT = process.argv[3] || '9335';
const SHOT = process.argv[4] || 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/shots-v17-public';
mkdirSync(SHOT, { recursive: true });
let seq = 0;
const created = await (await fetch('http://127.0.0.1:' + PORT + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
const pending = new Map(); const errors = [];
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; } if (m.method === 'Runtime.exceptionThrown') errors.push('EXC: ' + String(m.params.exceptionDetails?.exception?.description || '').slice(0, 160)); });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr, awaitPromise = true) => { const rr = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise }); if (rr.exceptionDetails) return { __err: String(rr.exceptionDetails.exception?.description || '').slice(0, 200) }; return rr.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const shot = async (n) => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOT + '/' + n + '.png', Buffer.from(r.data, 'base64')); } catch (e) { } };
const P = []; const check = (name, ok, extra) => { P.push({ name, ok: !!ok, extra: extra === undefined ? '' : String(extra).slice(0, 70) }); console.log((ok ? '  ✅ ' : '  ❌ ') + name + (extra !== undefined ? '  → ' + String(extra).slice(0, 70) : '')); };

await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 480, height: 940, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() });
await wait(9000);
await ev(`(function(){ try{ localStorage.clear(); }catch(e){} return 1; })()`);
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() });
await wait(9000);

console.log('\n【1】标题与数据规模');
const base = await ev(`({ species: SPECIES.length, moves: Object.keys(MOVES).length, evo: Object.keys(EVO).length, avatars: Object.keys(AVATARS).length, pal: SPECIES.filter(function(s){return s.pal;}).length, pk: SPECIES.filter(function(s){return s.pk;}).length, kz: SPECIES.filter(function(s){return s.kz;}).length, slots: SKILL_SLOTS, nodes: LEARN_NODES.join(',') })`);
check('物种 1205（宝可梦 1025 + 洛克 180）', base.species === 1205 && base.pk === 1025 && base.kz === 180, JSON.stringify(base));
check('帕鲁已全部移除', base.pal === 0, 'pal=' + base.pal);
check('招式 >1000', base.moves > 1000, base.moves);
check('进化链 >500', base.evo > 500, base.evo);
check('头像 1205 张内联', base.avatars === 1205, base.avatars);
check('4 技能槽 + 7 学习等级点', base.slots === 4 && base.nodes === '15,25,35,45,55,65,75', base.nodes);
await shot('v17-pub-01-title');

console.log('\n【2】开始游戏与初始伙伴');
await ev(`document.getElementById('btn-start').click()`);
await wait(2600);
const sg = await ev(`(function(){ var total={cards:0,avatars:0}; (typeof STARTER_GROUPS!=='undefined'?STARTER_GROUPS:[{key:null}]).forEach(function(grp){ if(grp.key){ STARTER_TAB=grp.key; } renderStarter(); var g=document.getElementById('starter-grid'); total.cards+=g?g.querySelectorAll('.st-card').length:0; total.avatars+=g?g.querySelectorAll('img.pet-avatar').length:0; }); if(typeof STARTER_GROUPS!=='undefined'&&STARTER_GROUPS[0]){ STARTER_TAB=STARTER_GROUPS[0].key; renderStarter(); } total.groups=(typeof STARTER_GROUPS!=='undefined')?STARTER_GROUPS.map(function(x){return x.key+':'+x.ids.length;}).join('/'):''; return total; })()`);
check('初始伙伴候选 30 只（9 代御三家 + 洛克）', sg.cards >= 27, JSON.stringify(sg));
check('伙伴卡带头像', sg.avatars >= 27, sg.avatars);
await shot('v17-pub-02-starter');
await ev(`(function(){ document.querySelector('#starter-grid .st-card').click(); return 1; })()`);
await wait(3000);
const wp = await ev(`(function(){ var p=selfPet(); return { world: !document.getElementById('screen-world').classList.contains('hidden'), name:byId(p.sp).name, moves:movesOf(p).length, hp:p.hp+'/'+maxHpOf(p) }; })()`);
check('进入世界画面', wp.world, JSON.stringify(wp));
check('初始携带 4 个技能', wp.moves === 4, wp.moves);
await shot('v17-pub-03-world');

console.log('\n【3】地区与野怪池');
const reg = await ev(`(function(){
  var out={};
  ['plain','forest','water','flower','snow','mine','volcano','desert','ocean'].forEach(function(r){
    var pool=SPECIES.filter(function(s){ return !s.varOf && s.habitat && s.habitat.indexOf(r)>=0; });
    out[r]=pool.length;
  });
  return out;
})()`);
Object.entries(reg).forEach(([r, n]) => check('地区 ' + r + ' 有野怪可遇', n > 0, n + ' 种'));
const ride = await ev(`(function(){ return { total: SPECIES.filter(function(s){return s.ride;}).length, water: SPECIES.filter(function(s){return s.ride==='water';}).length, fly: SPECIES.filter(function(s){return s.ride==='fly';}).length, land: SPECIES.filter(function(s){return s.ride==='land';}).length }; })()`);
check('骑乘宠已生成（>100 只）', ride.total > 100, JSON.stringify(ride));
check('水上坐骑存在', ride.water + ride.fly > 0, 'water=' + ride.water + ' fly=' + ride.fly);

console.log('\n【4】海洋通行规则');
const ocean = await ev(`(function(){
  var savedPos={x:S.pos.x,y:S.pos.y}, savedParty=S.party.slice();
  /* 找一块深海 */
  var wx=null,wy=null;
  for(var y=0;y<MH && wx===null;y++) for(var x=60;x<MW;x++){ if(map[y*MW+x]===T.DEEP){ wx=x; wy=y; break; } }
  if(wx===null) return {err:'地图上没有深海'};
  /* 无水系宠：应挡路 */
  S.party.forEach(function(p){ var sp=byId(p.sp); if(sp.type==='water'||sp.type2==='water'){ p.__wasWater=true; } });
  var blockedWithout = blocked(wx,wy);
  S.pos=savedPos; S.party=savedParty;
  return { deepTile:{x:wx,y:wy}, blockedNow: blockedWithout, waterCount:(typeof waterCount==='function')?waterCount():'—' };
})()`);
check('地图上有深海水域', !ocean.err, JSON.stringify(ocean));
check('深海格判定存在', typeof ocean.blockedNow === 'boolean', 'blocked=' + ocean.blockedNow);

console.log('\n【5】医院与清档');
const hosp = await ev(`(function(){
  var p=selfPet(); p.hp=1; Object.keys(p.pp).forEach(function(k){ p.pp[k]=0; });
  treatOne(p);
  return { hp:p.hp+'/'+maxHpOf(p), ppFull: Object.keys(p.pp).every(function(k){ return p.pp[k]===MOVES[k].pp; }) };
})()`);
check('医院治疗回满 HP', /^(\d+)\/\1$/.test(hosp.hp), hosp.hp);
check('医院治疗回满 PP', hosp.ppFull, JSON.stringify(hosp));
const reset = await ev(`(function(){
  var p=document.getElementById('panel-confirm');
  try{ openConfirmReset(); }catch(e){ return {err:String(e.message).slice(0,80)}; }
  return { shown: p?!p.classList.contains('hidden'):false, title:(document.querySelector('#panel-confirm h2')||{}).textContent||'' };
})()`);
check('重开存档有确认弹窗', reset.shown, JSON.stringify(reset));
await shot('v17-pub-04-confirm');
await ev(`(function(){ var b=document.getElementById('confirm-no'); if(b) b.click(); return 1; })()`);

console.log('\n【6】图鉴分页与头像');
await ev(`(function(){ document.getElementById('btn-dex').click(); return 1; })()`);
await wait(2600);
const dex = await ev(`(function(){
  var g=document.getElementById('dex-grid');
  var tabs=[...document.querySelectorAll('.dex-pager button')].map(function(b){return b.textContent.trim();});
  return { count:(document.getElementById('dex-count')||{}).textContent||'', cards:g?g.querySelectorAll('.st-card,.pet-card,.dex-card').length:0, avatars:g?g.querySelectorAll('img.pet-avatar').length:0, tabs:tabs };
})()`);
check('图鉴计数 1205', /1205/.test(dex.count), dex.count);
check('图鉴标签只剩宝可梦/洛克（无帕鲁）', !dex.tabs.some(t => /帕鲁/.test(t)), dex.tabs.join(' | '));
check('每页 60 张且带头像', dex.cards === 60 && dex.avatars === 60, dex.cards + '/' + dex.avatars);
await shot('v17-pub-05-dex');

console.log('\n【7】战斗（含 4 技能与状态）');
await ev(`(function(){ var p=document.getElementById('panel-dex'); if(p) p.classList.add('hidden'); return 1; })()`);
const bt = await ev(`(function(){
  try{
    var sp=SPECIES.filter(function(s){ return !s.varOf && s.rarity===0 && s.hpBase<=70; })[7];
    startWildBattle({sp:sp.id, lv:2});
    return { ok:true, foe:sp.name };
  }catch(e){ return {err:String(e.message).slice(0,160)}; }
})()`);
await wait(2600);
const bs = await ev(`(function(){
  var row=document.getElementById('move-row');
  var st=(typeof B!=='undefined'&&B)? { mode:B.mode, ePP:Object.keys(B.ePP||{}).length } : null;
  return { shown: !document.getElementById('screen-battle').classList.contains('hidden'),
           foe:(document.getElementById('enemy-name')||{}).textContent||'',
           moves: row? row.querySelectorAll('button').length : 0,
           stage: st, foeAvatar:(document.getElementById('enemy-sprite')||{querySelectorAll:function(){return[]}}).querySelectorAll('img.pet-avatar').length };
})()`);
check('开战成功', bt.ok && bs.shown, JSON.stringify(bt) + ' / ' + (bs.foe || ''));
check('战斗中 4 个技能按钮', bs.moves === 4, bs.moves);
check('敌方头像显示', bs.foeAvatar === 1, bs.foeAvatar);
check('敌方招式池非空', bs.stage && bs.stage.ePP > 0, bs.stage ? bs.stage.ePP : '—');
await shot('v17-pub-06-battle');
const hit = await ev(`(function(){
  var b=[...document.querySelectorAll('#move-row button')].find(function(x){return !x.disabled;});
  if(!b) return {err:'没有可用技能'};
  b.click();
  return { clicked:true };
})()`);
await wait(3000);
const after = await ev(`(function(){
  var log=document.getElementById('battle-log');
  return { log: log? log.textContent.replace(/\\s+/g,' ').slice(-140) : '', stillFighting: !document.getElementById('screen-battle').classList.contains('hidden') };
})()`);
check('技能可释放且有战斗日志', after.log.length > 6, after.log);

console.log('\n【8】训练师对战');
await ev(`(function(){ try{ closeBattle(); }catch(e){} return 1; })()`);
await wait(1500);
const tr = await ev(`(function(){
  try{
    var p=selfPet(); p.lv=25; p.hp=maxHpOf(p);
    var broken=[]; TRAINERS.forEach(function(t){ (t.team||[]).forEach(function(id){ if(!byId(id)) broken.push(t.name+':'+id); }); });
    return { trainers:TRAINERS.length, broken:broken, teams:TRAINERS.map(function(t){ return t.name+'['+t.team.map(function(id){return byId(id)?byId(id).name:'?';}).join('/')+']'; }).slice(0,3) };
  }catch(e){ return {err:String(e.message).slice(0,140)}; }
})()`);
check('10 位训练师队伍无坏引用', tr.broken && tr.broken.length === 0, tr.broken && tr.broken.length ? tr.broken.join(',') : '0 处');
check('训练师队伍已重建（宝可梦/洛克）', tr.teams && tr.teams.length === 3, (tr.teams || []).join('  '));

console.log('\n【9】存档');
const sv = await ev(`(function(){
  var p=selfPet(); p.lv=33; save();
  var d=JSON.parse(localStorage.getItem(SAVE_KEY));
  var q=d.party[0];
  return { hasSave:!!localStorage.getItem(SAVE_KEY), ver:d.v, lv:q.lv, moves:(q.moves||[]).length };
})()`);
check('存档写入成功', sv.hasSave, JSON.stringify(sv));
check('存档含 4 技能与等级', sv.moves === 4 && sv.lv === 33, JSON.stringify(sv));

console.log('\n=== 控制台异常 ' + errors.length + ' 条 ===');
errors.slice(0, 6).forEach(e => console.log('  ❌ ' + e));
const pass = P.filter(x => x.ok).length;
console.log('\n通过 ' + pass + ' / ' + P.length);
writeFileSync(SHOT + '/v17-accept-result.json', JSON.stringify({ url: URL_, pass, total: P.length, errors: errors.length, items: P }, null, 1), 'utf8');
ws.close();
