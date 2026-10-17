// ============ 抓宠游戏 · 一键部署到服务器 ============
// node tools/catch-pet-deploy.mjs
// 流程：打包(site + server.mjs) → sftp 上传 → 解压到 /opt/catch-pet/app → systemd 注册 catch-pet.service → 本机健康检查
// 独立端口 8727，独立服务，与劫火烙八荒（8726 / jiehuo.service）完全互不影响。
import { readFileSync, mkdtempSync, rmSync, copyFileSync, mkdirSync, cpSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';

const cfg = JSON.parse(readFileSync(new URL('./deploy-config.json', import.meta.url), 'utf-8'));
const ROOT = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
/* 2026-09-28：改用相对定位（tools 在 _work/tools 下），项目搬家后不再失效 */
const SRC_APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'app');
const APP_DIR = '/opt/catch-pet/app';
const PORT = 8727;

console.log('== 1/4 本地打包 ==');
/* 2026-09-25：%TEMP% 被沙箱拒绝（EPERM），tarball 改放项目内的 _work\ 下（工作区内，符合"文件只放语义化子文件夹"规则）。
   注意：tar 的命令行参数里不能出现中文路径（会乱码成 Failed to open 'ץ����Ϸ'），
   所以用 cwd（由 Node 设置，不经 shell 编码）+ 纯 ASCII 相对路径 ../_work/_deploy.tgz。 */
const tarball = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '_deploy.tgz');
try {
  execSync('tar -czf ../_work/_deploy.tgz server.mjs site', { cwd: SRC_APP, stdio: 'pipe' });
  console.log('  打包完成 →', tarball);
} catch (e) {
  console.error('打包失败:', String(e));
  process.exit(1);
}

const conn = new Client();
function sshRun(cmd) {
  console.log('  [ssh]', cmd.slice(0, 150) + (cmd.length > 150 ? '…' : ''));
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = ''; let code = 0;
      stream.on('data', d => (out += d.toString()))
        .stderr.on('data', d => (out += d.toString()))
        .on('exit', c => { code = typeof c === 'number' ? c : 1; })
        .on('close', () => {
          console.log(`  [ssh] exit=${code} out=${JSON.stringify(out.slice(0, 200))}`);
          code === 0 ? resolve(out) : reject(new Error(`exit ${code}: ${out.slice(-400)}`));
        });
    });
  });
}
const sftpPut = (local, remote) => new Promise((resolve, reject) => {
  conn.sftp((err, sftp) => err ? reject(err) : sftp.fastPut(local, remote, e => e ? reject(e) : resolve()));
});

conn.on('ready', async () => {
  try {
    console.log('== 2/4 上传 ==');
    await sshRun(`mkdir -p ${APP_DIR}`);
    await sftpPut(tarball, '/tmp/catch-pet.tgz');
    await sshRun(`set -e; cd /opt/catch-pet && rm -rf app && mkdir -p app log && tar -xzf /tmp/catch-pet.tgz -C app && ls -la app && ls -la app/site`);
    console.log('  上传解压完成');

    console.log('== 3/4 systemd 服务 ==');
    // unit 内容一律 base64 传输：避免 shell 转义把换行写成字面 \n（会导致 systemd "Bad message"）
    // Description 保持纯 ASCII：systemd 对非 UTF-8 locale 下的中文描述会报错
    const unit = [
      '[Unit]',
      'Description=catch-pet static game server (zhuachong)',
      'After=network.target',
      '[Service]',
      `WorkingDirectory=${APP_DIR}`,
      `Environment=PORT=${PORT}`,
      `Environment=ROOT=${APP_DIR}/site`,
      'Environment=LOG_DIR=/opt/catch-pet/log',
      `ExecStart=/usr/local/bin/node ${APP_DIR}/server.mjs`,
      'Restart=always',
      'RestartSec=3',
      '[Install]',
      'WantedBy=multi-user.target',
      ''
    ].join('\n');
    const b64 = Buffer.from(unit, 'utf8').toString('base64');
    await sshRun(`mkdir -p /etc/catch-pet && echo '${b64}' | base64 -d > /etc/catch-pet/catch-pet.service && wc -l /etc/catch-pet/catch-pet.service && head -3 /etc/catch-pet/catch-pet.service`);
    await sshRun(`set -e; cp /etc/catch-pet/catch-pet.service /etc/systemd/system/catch-pet.service
systemctl daemon-reload
systemctl reset-failed catch-pet 2>/dev/null || true
systemctl enable catch-pet
systemctl restart catch-pet
sleep 2
systemctl is-active catch-pet`);

    console.log('== 4/4 本机验证 ==');
    const health = await sshRun(`curl -s http://127.0.0.1:${PORT}/health || echo FAIL`);
    if (!health.includes('"ok":true')) throw new Error('服务未正常响应');
    const page = await sshRun(`curl -s -o /dev/null -w '%{http_code} %{size_download} %{content_type}' http://127.0.0.1:${PORT}/`);
    console.log('  首页:', page.trim());
    await sshRun(`ss -lntp | grep ${PORT} || true`);
    console.log('== 部署完成 ==');
    console.log(`  内网地址 http://127.0.0.1:${PORT}/`);
    console.log(`  公网地址 http://${cfg.host}:${PORT}/  （需在阿里云轻量控制台「防火墙」放行 ${PORT}）`);
    try { rmSync(tarball, { force: true }); } catch (e) { /* 清理失败无所谓 */ }
    conn.end();
    process.exit(0);
  } catch (e) {
    console.error('[deploy] 失败:', e.message ? e.message : String(e));
    conn.end();
    process.exit(1);
  }
}).on('error', e => { console.error('[deploy] 连接失败:', e.message); process.exit(1); })
  .connect({ host: cfg.host, port: cfg.port, username: cfg.user, password: cfg.password, readyTimeout: 20000 });
