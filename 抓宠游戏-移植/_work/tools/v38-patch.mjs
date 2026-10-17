/* v38：①「清醒」改回物理技（威力70 PP10） ②修 2 处分类冲突 ③换宠界面显示对当前对手的克制关系
   用法：node v38-patch.mjs --apply */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v38.html';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const done = [];
const rep = (a, b, tag) => {
  if (!work.includes(a)) { console.error('  !! 找不到锚点: ' + tag); process.exit(1); }
  work = work.replace(a, b); done.push(tag); console.log('  [改动] ' + tag);
};

/* ── ① 招式层面修正：清醒 → 物理 70；吵闹/魔法反射用宝可梦分类 ── */
{
  const key = 'var MOVES=';
  const at = work.indexOf(key);
  const head = at + key.length;
  const from = head + work.slice(head).search(/[[{]/);
  let d = 0, j = from, q = null, esc = false;
  for (; j < work.length; j++) {
    const c = work[j];
    if (q) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === q) q = null; continue; }
    if (c === '"') { q = c; continue; }
    if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { j++; break; } }
  }
  const MOVES = new Function('return (' + work.slice(from, j) + ')')();
  const FIX = {
    '清醒': { cat: '物理', power: 70, pp: 10 },        /* 用户指定：这是宝可梦的 Smelling Salts（旧译「清醒」） */
    '吵闹': { cat: '特殊' },                            /* 洛克标「变化」，宝可梦是特殊 90 */
    '魔法反射': { cat: '变化' },                        /* 洛克标「特殊」，宝可梦是 status */
  };
  let n = 0;
  Object.keys(MOVES).forEach(id => {
    const mv = MOVES[id];
    const f = FIX[mv.name];
    if (!f) return;
    const before = mv.cat + '/' + mv.power + '/PP' + mv.pp;
    if (f.cat) mv.cat = f.cat;
    if (f.power !== undefined) mv.power = f.power;
    if (f.pp !== undefined) mv.pp = f.pp;
    console.log('  [改动] ' + mv.name + '：' + before + ' → ' + mv.cat + '/' + mv.power + '/PP' + mv.pp);
    n++;
  });
  if (!n) console.log('  [跳过] 没有需要修正的招式');
  work = work.slice(0, from) + JSON.stringify(MOVES) + work.slice(j);
  done.push('修正 ' + n + ' 个招式的分类/威力');
}

/* ── ② 换宠克制提示 ── */
rep('function openSwap(forced){',
  ['/* v38：算「这只宠对当前对手」的克制关系（只看有威力的招） */',
    'function matchupOf(pet, foeSp){',
    '  if(!pet || !foeSp) return null;',
    '  var best=0, worst=9;',
    '  movesOf(pet).forEach(function(id){',
    '    var mv=MOVES[id];',
    '    if(!mv || mv.cat === "变化" || !mv.power) return;',
    '    var e=eff(mv.type, foeSp);',
    '    if(e>best) best=e;',
    '    if(e<worst) worst=e;',
    '  });',
    '  if(best===0 && worst===9) return { txt:"· 没有攻击招", cls:"so-so", atk:1 };',
    '  if(best>=2) return { txt:"✅ 克它 "+effText(best), cls:"good", atk:2 };',
    '  if(worst<1) return { txt:"⛔ 打不动 "+effText(worst), cls:"bad", atk:0.5 };',
    '  return { txt:"➖ 输出持平", cls:"so-so", atk:1 };',
    '}',
    '/* 对手打这只宠的威胁度（防守面） */',
    'function threatOf(pet, foeSp){',
    '  if(!pet || !foeSp) return null;',
    '  var foeMoves = (B && B.foe) ? movesOf(B.foe) : [];',
    '  var ownSp = byId(pet.sp);',
    '  var worst=9, best=0;',
    '  foeMoves.forEach(function(id){',
    '    var mv=MOVES[id];',
    '    if(!mv || mv.cat === "变化" || !mv.power) return;',
    '    var e=eff(mv.type, ownSp);',
    '    if(e>best) best=e;',
    '    if(e<worst) worst=e;',
    '  });',
    '  if(best===0 && worst===9) return null;',
    '  if(best>=2) return { txt:"💀 它克你 "+effText(best), cls:"bad" };',
    '  if(worst<1) return { txt:"🛡 它打不动", cls:"good" };',
    '  return null;',
    '}',
    'function openSwap(forced){'].join('\n'),
  '新增 matchupOf / threatOf（克制与威胁计算）');

/* 换宠列表：每行名字后追加克制标签 */
rep(
  '    var row=petRowEl(p,[ miniBtn(cur===p.uid?"出战中":"上阵",cur===p.uid?"gray":"gold",function(){ switchTo(p.uid); }) ],true);\n    if(cur===p.uid||p.hp<=0){ row.querySelector(".mini-btn").disabled=true; }',
  ['    var row=petRowEl(p,[ miniBtn(cur===p.uid?"出战中":"上阵",cur===p.uid?"gray":"gold",function(){ switchTo(p.uid); }) ],true);',
    '    /* v38：在血条下加一行「对当前对手」的克制/威胁提示 */',
    '    var _foeSp = (B && B.esp) ? B.esp : null;',
    '    var _mu = matchupOf(p, _foeSp), _th = threatOf(p, _foeSp);',
    '    if(_foeSp && (_mu || _th)){',
    '      var _d = row.querySelector(".desc");',
    '      if(_d){',
    '        var _tips=document.createElement("span"); _tips.className="matchup-tip";',
    '        var _parts=[];',
    '        if(_mu) _parts.push("<i class=\\"" + _mu.cls + "\\">" + _mu.txt + "</i>");',
    '        if(_th && _th.txt) _parts.push("<i class=\\"" + _th.cls + "\\">" + _th.txt + "</i>");',
    '        _tips.innerHTML = _parts.join("  ");',
    '        _d.appendChild(_tips);',
    '      }',
    '    }',
    '    if(cur===p.uid||p.hp<=0){ row.querySelector(".mini-btn").disabled=true; }'].join('\n'),
  '换宠列表加克制/威胁提示');
/* 切磋对象那行也加 */
rep(
  '    var rowB=petRowEl(ob,[ miniBtn(B.act===ob.uid?"出战中":"换上它",B.act===ob.uid?"gray":"gold",function(){ sparSwapToB(); }) ],true);',
  ['    var rowB=petRowEl(ob,[ miniBtn(B.act===ob.uid?"出战中":"换上它",B.act===ob.uid?"gray":"gold",function(){ sparSwapToB(); }) ],true);',
    '    if(B && B.esp){',
    '      var _mu2=matchupOf(ob, B.esp);',
    '      var _d2=rowB.querySelector(".desc");',
    '      if(_d2 && _mu2){ var _t2=document.createElement("span"); _t2.className="matchup-tip"; _t2.innerHTML="<i class=\\""+_mu2.cls+"\\">"+_mu2.txt+"</i>"; _d2.appendChild(_t2); }',
    '    }'].join('\n'),
  '切磋对象行也加提示');

/* 样式 */
rep('.learn-card.dragging{opacity:.35;}',
  ['.matchup-tip{display:block; margin-top:3px; font-size:12px; font-weight:700;}',
    '.matchup-tip .good{color:#2f8f4e; font-style:normal;}',
    '.matchup-tip .bad{color:#c0392b; font-style:normal;}',
    '.matchup-tip .so-so{color:#7a8c7f; font-style:normal;}',
    '.learn-card.dragging{opacity:.35;}'].join('\n'),
  '克制提示样式');

const need = ['function matchupOf(pet, foeSp){', 'function threatOf(pet, foeSp){', 'matchup-tip', '.matchup-tip .good{'];
need.forEach(n => { if (!work.includes(n)) { console.error('!! 校验失败，缺: ' + n); process.exit(1); } });
console.log('\n共 ' + done.length + ' 项改动' + (apply ? '' : '（未加 --apply，仅预演）'));
if (!apply) process.exit(0);
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE);
