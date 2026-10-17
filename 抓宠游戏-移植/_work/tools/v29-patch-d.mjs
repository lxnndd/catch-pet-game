/* v29 批次 D：彻底移除野外 NPC（数据 + 渲染）+ 「训练师」模块改造为「徽章收集」
   用法：node v29-patch-d.mjs --apply */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v29d.html';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const done = [];
const rep = (a, b, tag) => {
  if (!work.includes(a)) { console.error('  !! 找不到锚点: ' + tag); process.exit(1); }
  work = work.replace(a, b); done.push(tag); console.log('  [改动] ' + tag);
};

/* ── 1. 清空野外训练师数据（draw / trainerAt / beatenCount 都以此为准，自动归零） ── */
{
  const i = work.indexOf('var TRAINERS=[');
  if (i < 0) { console.error('!! 找不到 var TRAINERS=['); process.exit(1); }
  let j = work.indexOf('\n', i); if (j < 0) j = work.length;
  const oldLine = work.slice(i, j);
  if (oldLine.trim() !== 'var TRAINERS=[];') {
    work = work.slice(0, i) + 'var TRAINERS=[];   /* v29：野外 NPC 已全部移除，训练师对战收拢到道馆（见 beginGymBattle） */' + work.slice(j);
    done.push('清空 TRAINERS（原 ' + oldLine.length + ' 字符 → 空数组）'); console.log('  [改动] 清空 TRAINERS');
  } else console.log('  [跳过] TRAINERS 已清空');
}

/* ── 2. HUD 按钮：训练师 → 徽章 ── */
rep('<button class="btn-sm" id="btn-trainer">训练师</button>',
  '<button class="btn-sm" id="btn-trainer">🏅 徽章</button>',
  'HUD 按钮改为「🏅 徽章」');
rep('<div class="modal-head"><h2>🧑‍🏫 训练师名册 <span id="trainer-count"></span></h2>',
  '<div class="modal-head"><h2>🏅 徽章收集 <span id="trainer-count"></span></h2>',
  '弹窗标题改为「徽章收集」');

/* ── 3. 新增 openBadgeList（放在 openTrainerList 之前） ── */
rep('function openTrainerList(){',
  ['/* v29：徽章收集面板（取代原「训练师名册」）——列八个地区的道馆与徽章状态，可直接发起挑战 */',
    'function openBadgeList(){',
    '  var body=$("trainer-body"); body.textContent="";',
    '  var have=S.badges||[];',
    '  var intro=document.createElement("p"); intro.className="dex-note";',
    '  intro.textContent="去各个城镇的道馆挑战馆主，每打赢一座就拿到一枚徽章。集齐 "+BADGE_MAX+" 枚就能挑战联盟大赛。规则：双方出相同数量的宝可梦，馆主等级等于该地区的等级上限。";',
    '  body.appendChild(intro);',
    '  var sec=document.createElement("p"); sec.className="dex-note";',
    '  sec.textContent="── 徽章 "+have.length+" / "+BADGE_MAX+" ──";',
    '  body.appendChild(sec);',
    '  var ORDER=["plain","forest","flower","mine","desert","ocean","volcano","snow"];',
    '  ORDER.forEach(function(reg){',
    '    var town=null;',
    '    TOWNS.forEach(function(t){ if(t && t.gym && t.gymType && gymRegion(t)===reg && !town) town=t; });',
    '    var got=have.indexOf(reg)>=0;',
    '    var row=document.createElement("div"); row.className="pet-row";',
    '    var ico=document.createElement("span"); ico.className="ico"; ico.textContent=got?"🏅":"🔒";',
    '    var d=document.createElement("span"); d.className="desc";',
    '    var b=document.createElement("b"); b.textContent=town?town.gymName:(REGION_NAME[reg]+"道馆");',
    '    var s=document.createElement("span");',
    '    s.textContent=REGION_NAME[reg]+" · "+(town?((TYPE_NAME[town.gymType]||town.gymType)+"系 · 馆主 "+town.leaderName):"尚未开放")+" · 等级 Lv."+((LV_RANGE[reg]||[1,25])[1]);',
    '    d.appendChild(b); d.appendChild(s);',
    '    var acts=document.createElement("span"); acts.className="acts";',
    '    if(town) acts.appendChild(miniBtn(got?"再挑战":"去挑战","gold",function(){',
    '      $("panel-trainer").classList.add("hidden");',
    '      if(!B) beginGymBattle(town);',
    '    }));',
    '    row.appendChild(ico); row.appendChild(d); row.appendChild(acts);',
    '    body.appendChild(row);',
    '  });',
    '  $("trainer-count").textContent="（"+have.length+"/"+BADGE_MAX+"）";',
    '  $("panel-trainer").classList.remove("hidden");',
    '}',
    'function openTrainerList(){'].join('\n'),
  '新增 openBadgeList()');

/* ── 4. 按钮绑定改到徽章面板 ── */
rep('$("btn-trainer").addEventListener("click",openTrainerList);',
  '$("btn-trainer").addEventListener("click",openBadgeList);   /* v29：训练师名册 → 徽章收集 */',
  '按钮绑定改为 openBadgeList');

/* ── 5. 统计文本：击败训练师 → 徽章 ── */
rep('Object.keys(S.discovered).length+"/"+SPECIES.length+"、击败训练师 "+beatenCount()+"/"+TRAINERS.length+',
  'Object.keys(S.discovered).length+"/"+SPECIES.length+"、徽章 "+badgeCount()+"/"+BADGE_MAX+',
  '统计文本改为徽章数');

/* ── 校验 ── */
const need = ['var TRAINERS=[];', 'function openBadgeList(){', 'addEventListener("click",openBadgeList)',
  'id="btn-trainer">🏅 徽章<', '🏅 徽章收集', '"、徽章 "+badgeCount()'];
need.forEach(n => { if (!work.includes(n)) { console.error('!! 校验失败，缺: ' + n); process.exit(1); } });
if (!/"t10"/.test(work.split('var TRAINERS=[];')[1] || '')) console.log('  （已确认 t1..t10 数据不在 TRAINERS 里）');
console.log('\n共 ' + done.length + ' 项改动' + (apply ? '' : '（未加 --apply，仅预演）'));
if (!apply) process.exit(0);
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE + ' (' + Buffer.byteLength(work, 'utf8') + ' 字节)');
