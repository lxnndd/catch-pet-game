/* v31：技能调整改为「拖动式」—— 左栏=没学的，右栏=学了的，拖动即可调配
   修复的三个问题：
   ①编辑模式（🔧 调整技能）右侧卡片被 disabled，根本换不了招
   ②只能「先点左再点右」两步，不符合直觉
   ③没有「卸下技能」的能力
   用法：node v31-patch.mjs --apply */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v31.html';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const done = [];
const rep = (a, b, tag) => {
  if (!work.includes(a)) { console.error('  !! 找不到锚点: ' + tag); process.exit(1); }
  work = work.replace(a, b); done.push(tag); console.log('  [改动] ' + tag);
};

/* ── ① 拖拽内核 + 落点处理（插在 moveChip 之前） ── */
rep('function moveChip(id, opts){',
  ['/* ══ v31 技能拖动 ══',
    '   卡片带 data-skill / data-side 两个标记，按住拖动时用 elementFromPoint 找落点。',
    '   用 pointer 事件而不是 HTML5 drag&drop —— 后者在手机上完全不生效。 */',
    'var _skillDrag=null;',
    'function clearDropHi(){',
    '  var ns=document.querySelectorAll(".learn-card.drop-hi");',
    '  for(var i=0;i<ns.length;i++) ns[i].classList.remove("drop-hi");',
    '}',
    'function _hiAt(x,y){',
    '  clearDropHi();',
    '  var el=document.elementFromPoint(x,y);',
    '  var card=(el && el.closest) ? el.closest(".learn-card[data-skill]") : null;',
    '  if(card) card.classList.add("drop-hi");',
    '  return card;',
    '}',
    'function bindSkillDrag(el, skillId, side){',
    '  el.setAttribute("data-skill", skillId);',
    '  el.setAttribute("data-side", side);',
    '  el.style.touchAction="none";',
    '  el.addEventListener("pointerdown", function(ev){',
    '    if(el.disabled) return;',
    '    if(ev.button!==undefined && ev.button!==0) return;',
    '    ev.preventDefault();',
    '    var sx=ev.clientX, sy=ev.clientY, ghost=null, moved=false, lastCard=null;',
    '    var onMove=function(e2){',
    '      var dx=e2.clientX-sx, dy=e2.clientY-sy;',
    '      if(!moved){',
    '        if(Math.abs(dx)+Math.abs(dy)<8) return;          /* 8px 以内算点击 */',
    '        moved=true;',
    '        ghost=el.cloneNode(true);',
    '        ghost.className="learn-card dragging-ghost";',
    '        ghost.style.cssText="position:fixed;pointer-events:none;z-index:99999;opacity:.92;width:"+el.offsetWidth+"px;";',
    '        document.body.appendChild(ghost);',
    '        el.classList.add("dragging");',
    '      }',
    '      ghost.style.left=(e2.clientX-el.offsetWidth/2)+"px";',
    '      ghost.style.top=(e2.clientY-22)+"px";',
    '      lastCard=_hiAt(e2.clientX, e2.clientY);',
    '    };',
    '    var onUp=function(e3){',
    '      document.removeEventListener("pointermove",onMove);',
    '      document.removeEventListener("pointerup",onUp);',
    '      document.removeEventListener("pointercancel",onUp);',
    '      el.classList.remove("dragging");',
    '      if(ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);',
    '      clearDropHi();',
    '      if(!moved) return;                                  /* 没拖动 → 交给普通 click */',
    '      var card=lastCard || _hiAt(e3.clientX, e3.clientY);',
    '      if(!card) return;',
    '      applySkillDrop(learnDlg, side, skillId, card.getAttribute("data-side"), card.getAttribute("data-skill"));',
    '    };',
    '    document.addEventListener("pointermove",onMove);',
    '    document.addEventListener("pointerup",onUp);',
    '    document.addEventListener("pointercancel",onUp);',
    '  });',
    '}',
    '/* 拖动落点结算：池→槽 = 学会并换上；槽→槽 = 互换位置；槽→池 = 卸下 */',
    'function applySkillDrop(d, fromSide, fromId, toSide, toId){',
    '  if(!d || !d.pet || !fromId) return;',
    '  var pet=d.pet;',
    '  if(fromSide===toSide && fromId===toId) return;',
    '  ensureMoves(pet);',
    '  if(fromSide==="pool" && toSide==="cur"){',
    '    var i=pet.moves.indexOf(toId);',
    '    if(i<0) return;',
    '    pet.moves[i]=fromId;                                /* 用新技能顶掉这个槽 */',
    '  } else if(fromSide==="cur" && toSide==="cur"){',
    '    var a=pet.moves.indexOf(fromId), b2=pet.moves.indexOf(toId);',
    '    if(a<0||b2<0) return;',
    '    var tmp=pet.moves[a]; pet.moves[a]=pet.moves[b2]; pet.moves[b2]=tmp;',
    '  } else if(fromSide==="cur" && toSide==="pool"){',
    '    if(pet.moves.length<=1){ toast("至少要留一个技能～"); return; }',
    '    var j=pet.moves.indexOf(fromId);',
    '    if(j<0) return;',
    '    pet.moves.splice(j,1);                              /* 卸下，回到左边池子 */',
    '  } else return;',
    '  /* 学习模式下这次调整就用掉了本等级段的学习机会 */',
    '  if(d.mode==="learn" && d.node && (pet.learned||[]).indexOf(d.node)<0){',
    '    pet.learned=(pet.learned||[]).concat([d.node]);',
    '  }',
    '  pet.moves=pet.moves.filter(function(id){ return !!MOVES[id]; });',
    '  syncPP(pet);',
    '  save();',
    '  if(B) renderMoveRow();',
    '  toast("🔧 "+byId(pet.sp).name+"：" + movesOf(pet).map(function(id){ return MOVES[id].name; }).join(" / "));',
    '  if(d.mode==="learn") nextLearnOrClose(); else renderLearnDialog();',
    '}',
    'function moveChip(id, opts){'].join('\n'),
  '新增拖拽内核 bindSkillDrag / applySkillDrop');

/* ── ② moveChip 支持 side 参数并绑定拖拽 ── */
rep(
  '  if(opts.onClick) el.addEventListener("click", opts.onClick);\n  return el;\n}',
  ['  if(opts.onClick) el.addEventListener("click", opts.onClick);',
    '  bindSkillDrag(el, id, opts.side || "pool");   /* v31：每张卡都可拖 */',
    '  return el;',
    '}'].join('\n'),
  'moveChip 绑定拖拽');

/* ── ③ 左栏卡片带 side=pool，文案改成「拖动」 ── */
rep(
  ['  head.textContent = (d.mode === "learn")',
    '    ? ("这座池子有 " + d.cands.length + " 个候选" + (d.cands.length ? "" : "（这个等级段官方没有新招，点放弃即可）"))',
    '    : "全部已解锁技能";'].join('\n'),
  ['  head.textContent = (d.mode === "learn")',
    '    ? ("⬅️ 没学的（这座池子 " + d.cands.length + " 个）" + (d.cands.length ? "" : "——这个等级段官方没有新招，点「放弃」即可"))',
    '    : "⬅️ 没学的（已解锁但没带）";'].join('\n'),
  '左栏文案：没学的');
rep(
  '    boxes.appendChild(moveChip(id, {\n      on: d.pick === id, cur: owned, ppNow: owned ? (pet.pp[id] || 0) : undefined,',
  '    boxes.appendChild(moveChip(id, {\n      side: "pool",\n      on: d.pick === id, cur: owned, ppNow: owned ? (pet.pp[id] || 0) : undefined,',
  '左栏卡片标记 side=pool');
rep(
  '      disabled: d.mode === "learn" && owned,',
  '      disabled: d.mode === "learn" && owned,   /* 学习模式下已带的不能再选（避免重复） */',
  '左栏 disabled 说明');

/* ── ④ 右栏：取消 disabled、带 side=cur、文案改成「学了的」 ── */
rep(
  '  h2.textContent = (d.mode === "learn") ? "点一个换掉它：" : "当前携带：" + pet.moves.length + " / " + SKILL_SLOTS;',
  '  h2.textContent = "➡️ 学了的（" + pet.moves.length + " / " + SKILL_SLOTS + "）——从左边拖过来换上，拖回左边卸下";',
  '右栏文案：学了的');
rep(
  ['    cur.appendChild(moveChip(id, {',
    '      cur: true, ppNow: pet.pp[id] || 0,',
    '      disabled: d.mode === "edit",',
    '      onClick: function(){',
    '        if(d.mode !== "learn") return;',
    '        if(!d.pick){ toast("先在左边挑一个要学的新技能，再点这里换掉它"); return; }',
    '        doLearn(d.pet, d.node, d.pick, id);',
    '      }',
    '    }));'].join('\n'),
  ['    cur.appendChild(moveChip(id, {',
    '      side: "cur",',
    '      cur: true, ppNow: pet.pp[id] || 0,',
    '      /* v31：不再 disabled —— 编辑模式下也能拖（这是原来「无法实现调整」的直接原因） */',
    '      onClick: function(){',
    '        if(d.mode !== "learn") return;',
    '        if(!d.pick){ toast("把左边没学的技能拖到这里，就能换上它"); return; }',
    '        doLearn(d.pet, d.node, d.pick, id);',
    '      }',
    '    }));'].join('\n'),
  '右栏卡片可拖（取消 disabled）');

/* ── ⑤ 拖拽视觉 CSS ── */
rep(
  '.learn-card .lc-badge{',
  ['.learn-card.dragging{opacity:.35;}',
    '.learn-card.dragging-ghost{box-shadow:0 8px 22px rgba(0,0,0,.28); transform:scale(1.03);}',
    '.learn-card.drop-hi{outline:3px solid #3f9d6d; outline-offset:2px;}',
    '.learn-card[data-skill]{cursor:grab;}',
    '.learn-card[data-skill]:active{cursor:grabbing;}',
    '.learn-card .lc-badge{'].join('\n'),
  '拖拽视觉样式');

/* ── 校验 ── */
const need = ['function bindSkillDrag(el, skillId, side){', 'function applySkillDrop(d, fromSide, fromId, toSide, toId){',
  'bindSkillDrag(el, id, opts.side || "pool");', 'side: "cur",', 'side: "pool",', '.learn-card.drop-hi{'];
need.forEach(n => { if (!work.includes(n)) { console.error('!! 校验失败，缺: ' + n); process.exit(1); } });
if (work.includes('disabled: d.mode === "edit",')) { console.error('!! 右栏 disabled 仍在'); process.exit(1); }
console.log('\n共 ' + done.length + ' 项改动' + (apply ? '' : '（未加 --apply，仅预演）'));
if (!apply) process.exit(0);
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE);
