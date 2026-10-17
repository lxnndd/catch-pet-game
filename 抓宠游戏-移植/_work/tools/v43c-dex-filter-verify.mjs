/* v43c 验收：图鉴筛选改成「默认全部 → 点击排除 → 再点加回」的开关，且筛选条一屏显示全
   ① 默认状态：无排除、显示全部 1205 只、「全部」按钮高亮
   ② 点「火」→ 火属性被排除（数量减少 = 该属性只数）；按钮变为「已排除」样式
   ③ 再点「火」→ 完全恢复
   ④ 双属性：排除「飞行」后，火/飞行的喷火龙也应消失
   ⑤ 「全部」按钮可一键清空所有排除
   ⑥ 布局：筛选条不再滚动（max-height:none / overflow:visible），19 个按钮全部渲染出来
   用法：node v43c-dex-filter-verify.mjs [url] [cdpPort] */
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
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: URL_BASE + '?t=' + Date.now() });
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof dexList==='function')")) break; }

const r = await ev(`(function(){
  try{
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var p=newPet('pk-001'); p.hp=maxHpOf(p); ensureMoves(p);
    S.party=[p]; S.lead=p.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    ['panel-petinfo','panel-battle','panel-learn','panel-hosp','panel-gym','panel-swap'].forEach(function(k){ var e=$(k); if(e) e.classList.add('hidden'); });
    DEX_EXCLUDE={}; openDex(0);
    var tb=$('dex-toolbar'), out={};
    function fireN(){ return SPECIES.filter(function(x){ return x.type==='fire'||x.type2==='fire'; }).length; }
    function flyN(){ return SPECIES.filter(function(x){ return x.type==='flying'||x.type2==='flying'; }).length; }
    function btn(t){ return tb.querySelector('.dex-flt[data-type="'+t+'"]'); }
    function allBtn(){ return tb.querySelector('button'); }
    function layout(){
      var cs=getComputedStyle(tb);
      var bs=tb.querySelectorAll('button');
      var tops={}; bs.forEach(function(b){ tops[b.offsetTop]=1; });
      return {maxH:cs.maxHeight, ovY:cs.overflowY, n:bs.length, rows:Object.keys(tops).length,
              h:bs[0]?Math.round(bs[0].getBoundingClientRect().height):0};
    }
    out.total=dexList().length; out.totalAll=SPECIES.length;
    out.fireN=fireN(); out.flyN=flyN();
    out.allOn=allBtn().className.split(' ').indexOf('on')>=0; out.allCls=allBtn().className;
    out.allText=allBtn().textContent;
    out.layout=layout();
    out.btnCount=tb.querySelectorAll('.dex-flt').length;
    /* ② 点「火」= 排除 */
    btn('fire').click();
    out.afterFire=dexList().length;
    out.fireOffClass=/off/.test(btn('fire').className);
    out.fireOffAttr=btn('fire').getAttribute('data-excluded');
    out.fireOpacity=getComputedStyle(btn('fire')).opacity;
    out.allTextAfter=allBtn().textContent;
    /* ③ 再点「火」= 加回 */
    btn('fire').click();
    out.restored=dexList().length;
    /* ④ 排除「飞行」→ 火/飞行的喷火龙应消失 */
    btn('flying').click();
    out.afterFly=dexList().length;
    out.hasCharizard=dexList().some(function(s){ return s.id==='pk-006'; });
    out.flyingBtnOff=/off/.test(btn('flying').className);
    /* ⑤ 全部按钮一键清空 */
    allBtn().click();
    out.afterAll=dexList().length;
    out.exclAfterAll=Object.keys(DEX_EXCLUDE).length;
    return out;
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (r.__err) { ck(false, '筛选实验可跑', r.__err); }
else {
  console.log('① 默认：显示 ' + r.total + ' / ' + r.totalAll + ' 只 · 按钮 ' + r.btnCount + ' 个属性 + 1 个「全部」');
  ck(r.total === r.totalAll, '默认显示全部', r.total + ' / ' + r.totalAll);
  ck(r.allOn === true, '「全部」按钮默认高亮', 'class="' + r.allCls + '" · ' + r.allText);
  ck(r.btnCount === 18, '18 个属性按钮全部渲染', String(r.btnCount));
  ck(r.layout.maxH === 'none' && r.layout.ovY === 'visible', '筛选条不再滚动（max-height:none / overflow:visible）', r.layout.maxH + ' / ' + r.layout.ovY);
  ck(r.layout.h >= 28, '按钮已做大（高度 ≥28px）', r.layout.h + 'px 高 · 共 ' + r.layout.rows + ' 行排完');
  console.log('② 点「火」→ 排除');
  ck(r.afterFire === r.totalAll - r.fireN, '排除火属性后数量 = 总数 − 火属性只数', r.afterFire + ' = ' + r.totalAll + ' − ' + r.fireN);
  ck(r.fireOffClass && r.fireOffAttr === '1', '按钮变为「已排除」样式（划掉 + 变暗）', 'opacity=' + r.fireOpacity);
  ck(/已排除 1/.test(r.allTextAfter), '「全部」按钮提示已排除数量', r.allTextAfter);
  console.log('③ 再点「火」→ 加回');
  ck(r.restored === r.totalAll, '完全恢复', r.restored + ' / ' + r.totalAll);
  console.log('④ 双属性（排除「飞行」）');
  ck(r.afterFly === r.totalAll - r.flyN, '排除飞行后数量 = 总数 − 飞行只数', r.afterFly + ' = ' + r.totalAll + ' − ' + r.flyN);
  ck(r.hasCharizard === false, '火/飞行的喷火龙也随「飞行」被排除', '');
  console.log('⑤ 「全部」一键清空');
  ck(r.afterAll === r.totalAll && r.exclAfterAll === 0, '点「全部」→ 清空所有排除、恢复全部', r.afterAll + ' 只 · 排除数 ' + r.exclAfterAll);
}

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v43c 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项: ' + fails.join(' | '));
ws.close();
process.exit(fail ? 1 : 0);
