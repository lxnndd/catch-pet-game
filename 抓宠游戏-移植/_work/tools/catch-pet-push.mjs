// ============ 抓宠游戏 · 免落盘部署（沙箱禁止子进程写文件时使用）============
// node catch-pet-push.mjs [文件...]
// 原理：node 只读本地文件 → 通过 ssh2 sftp 直接写入服务器，不生成任何本地临时文件。
// 默认推送 site/index.html 与 site/抓宠游戏-v12.html，然后重启服务并做健康检查。
import { readFileSync, existsSync } from 'node:fs';
import { Client } from 'ssh2';

const cfg = JSON.parse(readFileSync(new URL('./deploy-config.json', import.meta.url), 'utf-8'));
const SITE = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/app/site';
const REMOTE = '/opt/catch-pet/app/site';
const DEFAULT_FILES = ['index.html', '抓宠游戏-v12.html'];
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const files = args.length ? args : DEFAULT_FILES;

const conn = new Client();
const sh = cmd => new Promise((res, rej) => {
  conn.exec(cmd, (err, stream) => {
    if (err) return rej(err);
    let out = '', code = 0;
    stream.on('data', d => out += d.toString())
      .stderr.on('data', d => out += d.toString())
      .on('exit', c => { code = typeof c === 'number' ? c : 1; })
      .on('close', () => res({ code, out }));
  });
});

conn.on('ready', async () => {
  try {
    console.log('== 已连接 ' + cfg.host + ' ==');
    const sftp = await new Promise((res, rej) => conn.sftp((e, s) => e ? rej(e) : res(s)));
    for (const f of files) {
      const local = SITE + '/' + f;
      if (!existsSync(local)) { console.log('  [跳过] 本地不存在: ' + f); continue; }
      const data = readFileSync(local);
      await new Promise((res, rej) => sftp.writeFile(REMOTE + '/' + f, data, e => e ? rej(e) : res()));
      console.log('  [推送] ' + f + '  ' + data.length + ' 字节');
    }
    await new Promise(res => sftp.end(res));
    console.log('== 重启服务 ==');
    const r1 = await sh('systemctl restart catch-pet.service && sleep 1 && systemctl is-active catch-pet.service');
    console.log('  ' + String(r1.out).trim());
    const r2 = await sh('curl -s http://127.0.0.1:8727/health');
    console.log('  /health → ' + String(r2.out).trim());
    const r3 = await sh('curl -s -o /dev/null -w "%{http_code} %{size_download}" http://127.0.0.1:8727/');
    console.log('  首页   → ' + String(r3.out).trim());
    const r4 = await sh('sha256sum ' + REMOTE + '/index.html | cut -c1-64');
    console.log('  服务器 sha256 → ' + String(r4.out).trim());
    const r5 = await sh('cd /opt/catch-pet/app/site && ls -la | head -8');
    console.log('  目录:\n' + String(r5.out).trim().split('\n').map(l => '    ' + l).join('\n'));
    const r6 = await sh('systemctl is-active jiehuo.service');
    console.log('  劫火 8726 服务: ' + String(r6.out).trim());
  } catch (e) {
    console.error('部署失败: ' + String(e));
    process.exitCode = 1;
  } finally {
    conn.end();
  }
}).on('error', e => { console.error('连接失败: ' + String(e)); process.exit(1); })
  .connect({ host: cfg.host, port: cfg.port || 22, username: cfg.user, password: cfg.password, readyTimeout: 30000 });
