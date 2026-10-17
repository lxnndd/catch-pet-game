/* Step2b：道馆/联盟交互 + 徽章系统 + HUD 徽章显示 */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const F = ROOT + '/抓宠游戏-v12-clean.html';
copyFileSync(F, F.replace(/\.html$/, '.bak-v19-step2b.html'));
let src = readFileSync(F, 'utf8');
const before = src.length;
const done = [];
function insertAfter(anchor, text, label) {
  const i = src.indexOf(anchor);
  if (i < 0) { console.log('  ⚠️ 锚点未找到：' + label + ' → ' + anchor.slice(0, 50)); return false; }
  src = src.slice(0, i + anchor.length) + text + src.slice(i + anchor.length);
  done.push(label);
  return true;
}
function replaceOnce(re, text, label) {
  if (!re.test(src)) { console.log('  ⚠️ 未匹配：' + label); return false; }
  src = src.replace(re, text); done.push(label); return true;
}

/* 1) HUD 加徽章 chip */
insertAfter('<span class="chip">📖<b id="hud-dex">0/60</b></span>',
  '\n      <span class="chip">🏅<b id="hud-badges">0/8</b></span>', 'HUD 徽章显示');

/* 2) 存档加 badges */
replaceOnce(/v:2, coins:20, treats:1, balls:\[3,0,0\],/, 'v:2, coins:20, treats:1, balls:[3,0,0], badges:[],', 'freshSave 加 badges');
/* load 的迁移：v2/v3/v4 分支里补 badges */
replaceOnce(/(if\(d\.v===2\|\|d\.v===3\|\|d\.v===4\)\{\r?\n      d\.discovered=d\.discovered\|\|\{\}; d\.party=d\.party\|\|\[\]; d\.box=d\.box\|\|\[\];)/,
  '$1\n      d.badges=d.badges||[];', 'load 迁移补 badges');

/* 3) move() 加道馆/联盟判定（放在医院判定之后） */
insertAfter('if(tv===T.HOSP){ updateHUD(); draw(); save(); openHospital(); return; }',
  `
  /* v19：踩到道馆 / 联盟大赛 */
  if(tv===T.GYM){ var _gt=gymAt(nx,ny); updateHUD(); draw(); save(); if(_gt){ openGym(_gt); return; } }
  if(tv===T.LEAGUE){ updateHUD(); draw(); save(); openLeague(); return; }`, 'move 道馆/联盟判定');

/* 4) 道馆/联盟弹窗 DOM（插在 sparring modal 之前） */
const DOM_ANCHOR = '<!-- SECTION: sparring modal dom -->';
if (src.indexOf(DOM_ANCHOR) < 0) throw new Error('找不到 modal 锚点');
insertAfter(DOM_ANCHOR, `
  <!-- SECTION: v19 gym / league modal -->
  <div class="overlay hidden" id="panel-gym">
    <div class="modal modal-sm">
      <div class="modal-head"><h2 id="gym-title">🏛️ 道馆</h2><button class="x-btn" data-close="panel-gym">✕</button></div>
      <div class="modal-body">
        <div class="enc-box">
          <div class="enc-emoji" id="gym-emoji">🏛️</div>
          <b id="gym-name">道馆</b>
          <span class="enc-sub" id="gym-sub"></span>
        </div>
        <p class="dex-note" id="gym-note"></p>
        <div class="enc-actions">
          <button class="btn-big" id="gym-ok">知道了</button>
        </div>
      </div>
    </div>
  </div>`, '道馆/联盟弹窗 DOM');

/* 5) 逻辑函数（插在 openHospital 之前） */
const FN_ANCHOR = 'function openHospital(){';
if (src.indexOf(FN_ANCHOR) < 0) throw new Error('找不到 openHospital');
insertAfter('function ppLow(p){', `
/* ══ v19 道馆 / 联盟 ══ */
function gymAt(x,y){
  for(var i=0;i<TOWNS.length;i++){ var t=TOWNS[i];
    if(Math.abs(x-t.gym.x)<=1 && Math.abs(y-t.gym.y)<=1) return t; }
  return null;
}
function badgeCount(){ return (S && S.badges) ? S.badges.length : 0; }
function openGym(t){
  var tn=(typeof TYPE_NAME!=="undefined" && TYPE_NAME[t.gymType]) ? TYPE_NAME[t.gymType] : t.gymType;
  $("gym-title").textContent="🏛️ "+t.gymName;
  $("gym-emoji").textContent="🏛️";
  $("gym-name").textContent=t.gymName;
  $("gym-sub").textContent=t.name+" · "+tn+"系 · 馆主 "+t.leaderName;
  $("gym-note").textContent="馆主 "+t.leaderName+" 出门修行去了，道馆暂时闭馆。\\n（道馆对战正在建设中，等做好了再来挑战拿徽章吧～）";
  $("panel-gym").classList.remove("hidden");
}
function openLeague(){
  var n=badgeCount();
  $("gym-title").textContent="🏆 宝可梦联盟";
  $("gym-emoji").textContent="🏆";
  $("gym-name").textContent="联盟大赛会场";
  $("gym-sub").textContent="徽章 "+n+" / "+BADGE_MAX;
  if(n>=BADGE_MAX) $("gym-note").textContent="你已集齐 "+BADGE_MAX+" 枚徽章，冠军之路即将开启……\\n（联盟大赛正在建设中，敬请期待）";
  else $("gym-note").textContent="参加联盟大赛需要集齐 "+BADGE_MAX+" 枚徽章，你目前有 "+n+" 枚。\\n先去各地城镇的道馆挑战馆主、收集徽章吧！";
  $("panel-gym").classList.remove("hidden");
}
function ppLowEnd(){}
`, '道馆/联盟逻辑函数');

/* 6) updateHUD 里刷新徽章 */
replaceOnce(/(\$\("hud-dex"\)\.textContent=[^;]+;)/, '$1\n  if($("hud-badges")) $("hud-badges").textContent=badgeCount()+"/"+BADGE_MAX;', 'updateHUD 刷新徽章');

/* 7) 弹窗关闭按钮（data-close 通用绑定已存在，这里补 gym-ok） */
insertAfter('$("tab-box").addEventListener("click",function(){ setHospTab("box"); });',
  '\n  if($("gym-ok")) $("gym-ok").addEventListener("click",function(){ $("panel-gym").classList.add("hidden"); });', 'gym-ok 关闭按钮');

writeFileSync(F, src, 'utf8');
console.log('Step2b 完成：' + (before / 1024).toFixed(0) + ' → ' + (src.length / 1024).toFixed(0) + ' KB');
done.forEach(d => console.log('  ✅ ' + d));
console.log('  校验：' + [
  src.includes('hud-badges') ? 'HUD✅' : 'HUD❌',
  src.includes('badges:[]') ? '存档✅' : '存档❌',
  src.includes('gymAt(nx,ny)') ? 'move判定✅' : 'move❌',
  src.includes('panel-gym') ? '弹窗✅' : '弹窗❌',
  src.includes('function openGym') ? '函数✅' : '函数❌',
].join(' · '));
