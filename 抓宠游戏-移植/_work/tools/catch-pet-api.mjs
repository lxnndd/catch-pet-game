// 实测千问预览资源接口，拿「抓宠游戏-v12.html」的真实地址
import { writeFileSync } from 'node:fs';

const FID = process.argv[2] ?? 'e6b1a06c89864910bfb9582137528dc8';
const BASES = ['https://doc-reader.qianwen.com', 'https://doc-reader-pre.qianwen.com'];
const PATHS = [
  '/2/reader/visitor/web_preview/resource/guest/info',
  '/reader/visitor/web_preview/resource/guest/info'
];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const log = [];
const say = (s) => { log.push(s); console.log(s); };

for (const base of BASES) {
  for (const path of PATHS) {
    const rid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const url = `${base}${path}?biz_id=quark_mos&req_id=${rid}&chid=${rid}&uc_param_str=`;
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': UA, 'Accept': 'application/json, text/plain, */*' },
        body: JSON.stringify({ biz_id: 'quark_mos', resource_keys: [FID] }),
        signal: AbortSignal.timeout(20000)
      });
      const text = await r.text();
      say(`\n### ${url}\nSTATUS=${r.status} LEN=${text.length}\n${text.slice(0, 900)}`);
      if (/download_url/.test(text)) {
        say('\n>>> 命中 download_url！');
      }
    } catch (e) {
      say(`\n### ${url}\nERR ${e.message}`);
    }
  }
}
writeFileSync('C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/api-probe.txt', log.join('\n'), 'utf8');
