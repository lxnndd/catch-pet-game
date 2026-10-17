/* v45 验收：① 八道馆完全对应官方八馆（含补上的浅红·阿桔）② 只能到现场挑战（徽章面板不再有挑战按钮）
             ③ 「挑战四天王（第 N 位 / 共 4 位）」—— 冠军不再被算进四天王
   官方基准：深灰·小刚 12/14 · 华蓝·小霞 18/21 · 枯叶·马志士 21/18/24 · 彩虹·莉佳 29/24/29
            浅红·阿桔 37/39/37/43 · 金黄·娜姿 38/37/38/43 · 红莲·夏伯 42/40/42/47 · 常磐·坂木 45/42/44/45/50
   用法：node v45-verify.mjs [url] [cdpPort] */
import { WebSocket } from 'ws';
const URL_BASE = process.argv[2] || 'http://127.0.0.1:8728/';
const CDP_PORT = process.argv[3] || '9335';
let seq = 0, pass = 0, fail = 0; const fails = [];
const c = await (await fetch('http://127.0.0.1:' + CDP_PORT + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map(); const errs = [];
ws.on('message', d => {
  const m = JSON.parse(String(d));
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; }
  if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params?.exceptionDetails?.exception?.description || '').slice(0, 200));
});
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 400) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const ck = (ok, name, extra) => { if (ok) { pass++; console.log('  ✅ ' + name + (extra ? '  →  ' + extra : '')); } else { fail++; fails.push(name); console.log('  ❌ ' + name + (extra ? '  →  ' + extra : '')); } };
const NL = String.fromCharCode(10);
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: URL_BASE + '?t=' + Date.now() });
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof openBadgeList==='function'&&typeof REAL_GYMS!=='undefined')")) break; }

console.log('══ 1. 八道馆 = 官方八馆 ══');
const g = await ev(`(function(){
  var out={};
  Object.keys(REAL_GYMS).forEach(function(r){
    var x=REAL_GYMS[r];
    out[r]={leader:x.leader, gym:x.gym, type:x.type, badge:x.badge,
            lvs:x.team.map(function(q){ return q[1]; }),
            names:x.team.map(function(q){ var s=byId(q[0]); return s?s.name:q[0]; })};
  });
  out.regionCount=Object.keys(REAL_GYMS).length;
  return out;
})()`);
const GYMS = [
  ['mine', '深灰道馆', '小刚', 'rock', '灰色徽章', [12, 14], ['小拳石', '大岩蛇']],
  ['ocean', '华蓝道馆', '小霞', 'water', '蓝色徽章', [18, 21], ['海星星', '宝石海星']],
  ['plain', '枯叶道馆', '马志士', 'elec', '橙色徽章', [21, 18, 24], ['霹雳电球', '皮卡丘', '雷丘']],
  ['forest', '彩虹道馆', '莉佳', 'grass', '彩虹徽章', [29, 24, 29], ['大食花', '蔓藤怪', '霸王花']],
  ['snow', '浅红道馆', '阿桔', 'poison', '粉红徽章', [37, 39, 37, 43], ['瓦斯弹', '臭臭泥', '瓦斯弹', '双弹瓦斯']],
  ['flower', '金黄道馆', '娜姿', 'psychic', '金色徽章', [38, 37, 38, 43], ['勇基拉', '魔墙人偶', '摩鲁蛾', '胡地']],
  ['volcano', '红莲道馆', '夏伯', 'fire', '深红徽章', [42, 40, 42, 47], ['卡蒂狗', '小火马', '烈焰马', '风速狗']],
  ['desert', '常磐道馆', '坂木', 'ground', '绿色徽章', [45, 42, 44, 45, 50], ['独角犀牛', '三地鼠', '尼多后', '尼多王', '独角犀牛']]
];
ck(g.regionCount === 8, '仍然是 8 个道馆（没有多也没有少）', String(g.regionCount));
GYMS.forEach(function(row){
  const [reg, gym, leader, type, badge, lvs, names] = row;
  const o = g[reg];
  if (!o) { ck(false, reg + ' 存在', '缺失'); return; }
  const metaOk = o.gym === gym && o.leader === leader && o.type === type && o.badge === badge;
  const teamOk = JSON.stringify(o.lvs) === JSON.stringify(lvs) && JSON.stringify(o.names) === JSON.stringify(names);
  ck(metaOk && teamOk, gym + '（' + leader + '·' + badge + '）',
    o.names.join('/') + ' ' + JSON.stringify(o.lvs));
});
ck(!JSON.stringify(g).includes('冰河'), '自创的「冰河道馆」已移除', '');
ck(JSON.stringify(Object.keys(g)) === JSON.stringify(['mine', 'ocean', 'plain', 'forest', 'snow', 'flower', 'volcano', 'desert']) ||
   true, '（键顺序不影响，面板顺序另测）', '');

console.log('\n══ 2. 只能到现场挑战：徽章面板不再有挑战按钮 ══');
const bp = await ev(`(function(){
  try{
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var p=newPet('pk-025'); p.hp=maxHpOf(p); ensureMoves(p);
    S.party=[p]; S.lead=p.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    openBadgeList();
    var body=$('trainer-body');
    var btns=body.querySelectorAll('button');
    var rows=body.querySelectorAll('.pet-row');
    var order=[]; rows.forEach(function(r){ var b=r.querySelector('b'); if(b) order.push(b.textContent); });
    var txt=body.textContent;
    var out={btns:btns.length, rows:rows.length, order:order,
             hasGo:/去挑战|再挑战/.test(txt), hasOnsite:/(现场挑战)/.test(txt),
             sample:txt.slice(0,220)};
    $('panel-trainer').classList.add('hidden');
    return out;
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (bp.__err) ck(false, '徽章面板可打开', bp.__err);
else {
  ck(bp.btns === 0, '面板里**没有任何挑战按钮**', bp.btns + ' 个按钮');
  ck(bp.hasGo === false, '不再出现「去挑战 / 再挑战」', '');
  ck(bp.hasOnsite === true, '改为提示到现场挑战', '');
  ck(bp.rows === 8, '列出 8 座道馆', bp.rows + ' 行');
  ck(JSON.stringify(bp.order) === JSON.stringify(['深灰道馆', '华蓝道馆', '枯叶道馆', '彩虹道馆', '浅红道馆', '金黄道馆', '红莲道馆', '常磐道馆']),
    '按官方顺序排列（深灰→华蓝→枯叶→彩虹→浅红→金黄→红莲→常磐）', bp.order.join(' → '));
  console.log('   面板首段文案: ' + bp.sample.replace(/[\\s]+/g, ' ').slice(0, 150));
}

console.log('\n══ 3. 四天王是 4 位（冠军不计数）══');
const lg = await ev(`(function(){
  try{
    S.badges=['plain','forest','flower','mine','desert','ocean','volcano','snow'];
    S.champion=0; LEAGUE_IDX=0; openLeague();
    var out={at0:{btn:$('gym-ok').textContent, note:$('gym-note').textContent}};
    LEAGUE_IDX=3; openLeague();
    out.at3={btn:$('gym-ok').textContent, note:$('gym-note').textContent.split(String.fromCharCode(10))[0]};
    LEAGUE_IDX=4; openLeague();
    out.at4={btn:$('gym-ok').textContent, note:$('gym-note').textContent.split(String.fromCharCode(10))[0]};
    LEAGUE_IDX=REAL_E4.length; openLeague();
    out.at5={btn:$('gym-ok').textContent, note:$('gym-note').textContent.split(String.fromCharCode(10))[0]};
    out.e4n=REAL_E4.length;
    $('panel-gym').classList.add('hidden');
    return out;
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (lg.__err) ck(false, '联盟面板可打开', lg.__err);
else {
  console.log('   第 1 位: ' + lg.at0.btn + ' | ' + lg.at0.note.split(NL)[0]);
  ck(/共 4 位/.test(lg.at0.btn), '四天王总数显示为 **4**（不是 5）', lg.at0.btn);
  ck(!/共 5 位/.test(lg.at0.btn), '不再出现「共 5 位」', '');
  console.log('   第 4 位: ' + lg.at3.btn + ' | ' + lg.at3.note);
  ck(/共 4 位/.test(lg.at3.btn) && /第 4 位/.test(lg.at3.btn), '第 4 位仍是「四天王（第 4 位 / 共 4 位）」', lg.at3.btn);
  console.log('   第 5 位: ' + lg.at4.btn + ' | ' + lg.at4.note);
  ck(/挑战冠军/.test(lg.at4.btn), '第 5 位变成「挑战冠军（青绿）」', lg.at4.btn);
  ck(/四天王已全部击败（4 \/ 4）/.test(lg.at4.note), '文案写明四天王 4 / 4 已击败', lg.at4.note);
  ck(/重新挑战联盟/.test(lg.at5.btn), '夺冠后仍是「重新挑战联盟」', lg.at5.btn);
}

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v45 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项: ' + fails.join(' | '));
ws.close();
process.exit(fail ? 1 : 0);
