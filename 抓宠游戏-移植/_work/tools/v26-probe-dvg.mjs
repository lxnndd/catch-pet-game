/* v26 探测 dvg 站：编号 → 名字 的权威对照 URL 格式 */
const H = { 'User-Agent': 'Mozilla/5.0 Chrome/120', 'Referer': 'https://roco.dvg.cn/spirits.php' };
const cands = [
  'https://roco.dvg.cn/spirit/13.html',
  'https://roco.dvg.cn/spirits/13.html',
  'https://roco.dvg.cn/spirit-13.html',
  'https://roco.dvg.cn/spirits.php?spiritid=13',
  'https://roco.dvg.cn/spirits.php?id=13',
  'https://roco.dvg.cn/dbsource/spirit/13.json',
  'https://roco.dvg.cn/dbsource/spirit/detail/13',
  'https://roco.dvg.cn/dbsource/spirit/13.html',
  'https://roco.dvg.cn/spirits.php',
  'https://roco.dvg.cn/',
];
for (const u of cands) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 15000);
  try {
    const r = await fetch(u, { headers: H, signal: ac.signal });
    const txt = await r.text();
    const has13 = txt.includes('13');
    console.log(String(r.status).padEnd(4) + u);
    console.log('     长度 ' + txt.length + ' · 含"火苗龙"' + txt.includes('火苗龙') + ' · 含"蹦蹦草"' + txt.includes('蹦蹦草') + ' · 含"遁鼠"' + txt.includes('遁鼠'));
    if (r.status === 200 && txt.length < 3000) console.log('     片段: ' + txt.replace(/\s+/g, ' ').slice(0, 300));
  } catch (e) { console.log('ERR  ' + u + ' → ' + e.message); } finally { clearTimeout(t); }
}
