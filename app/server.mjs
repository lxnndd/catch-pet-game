// ============ 抓宠游戏 · 静态托管服务器 ============
// 零依赖：仅用 node 内置模块。默认端口 8727，与劫火烙八荒（8726）并存。
// 环境变量：PORT（默认 8727）· ROOT（站点根目录，默认 ./site）· BASE_PATH（可选子路径前缀）
// v97 性能优化：对文本资源（.html/.js/.css/.json/.svg）启用 Gzip/Brotli 内存缓存（按 mtimeMs 自动失效），首屏 1MB → ~180KB
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, appendFile, mkdirSync } from 'node:fs';
import { gzipSync, brotliCompressSync, constants as zc } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8727);
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = path.resolve(process.env.ROOT || path.join(__dirname, 'site'));
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, 'logs');
const VERSION = '1.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.wasm': 'application/wasm'
};

const COMPRESSIBLE = new Set(['.html', '.htm', '.js', '.mjs', '.css', '.json', '.svg', '.txt', '.md']);
const fileCache = new Map(); // target -> { mtimeMs, raw, gzip, br }

if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  appendFile(path.join(LOG_DIR, 'access.log'), line, () => { /* 忽略日志写入失败 */ });
};

// 解析请求路径 → 本地文件，防目录穿越
function resolveTarget(urlPath) {
  let rel = decodeURIComponent(urlPath.split('?')[0]);
  const base = process.env.BASE_PATH || '';
  if (base && rel.startsWith(base)) rel = rel.slice(base.length);
  if (!rel.startsWith('/')) rel = '/' + rel;
  if (rel.endsWith('/')) rel += 'index.html';
  const abs = path.resolve(ROOT, '.' + rel);
  if (abs !== ROOT && !abs.startsWith(ROOT + path.sep)) return null; // 越界
  return abs;
}

async function getCachedFile(target, mtimeMs, ext) {
  const hit = fileCache.get(target);
  if (hit && hit.mtimeMs === mtimeMs) return hit;
  const raw = await readFile(target);
  let gzip = null, br = null;
  if (COMPRESSIBLE.has(ext) && raw.length > 1024) {
    try { gzip = gzipSync(raw, { level: 6 }); } catch {}
    try { br = brotliCompressSync(raw, { params: { [zc.BROTLI_PARAM_QUALITY]: 5 } }); } catch {}
  }
  const entry = { mtimeMs, raw, gzip, br };
  if (fileCache.size > 256) fileCache.clear();
  fileCache.set(target, entry);
  return entry;
}

const server = createServer(async (req, res) => {
  const started = Date.now();
  const urlPath = (req.url || '/').split('?')[0];

  // 健康检查 / 版本
  if (urlPath === '/health' || urlPath === (process.env.BASE_PATH || '') + '/health') {
    const body = JSON.stringify({ ok: true, name: '抓宠游戏静态站', version: VERSION, root: ROOT });
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(body);
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Method Not Allowed');
  }

  let target = resolveTarget(req.url || '/');
  if (!target) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Bad Request');
  }

  try {
    let st = await stat(target).catch(() => null);
    if (st && st.isDirectory()) {
      target = path.join(target, 'index.html');
      st = await stat(target).catch(() => null);
    }
    if (!st || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<meta charset="utf-8"><h1>404</h1><p>页面不存在</p>');
      log(`${req.method} ${req.url} 404 ${Date.now() - started}ms`);
      return;
    }
    const ext = path.extname(target).toLowerCase();
    const entry = await getCachedFile(target, st.mtimeMs, ext);
    const ae = String(req.headers['accept-encoding'] || '');
    let buf = entry.raw;
    let encoding = '';
    if (entry.br && /\bbr\b/.test(ae)) { buf = entry.br; encoding = 'br'; }
    else if (entry.gzip && /\bgzip\b/.test(ae)) { buf = entry.gzip; encoding = 'gzip'; }

    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': buf.length,
      // 游戏本体是单文件 HTML：不缓存，保证玩家刷新即拿到最新版
      'Cache-Control': ext === '.html' || ext === '.htm' ? 'no-cache' : 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
      'Vary': 'Accept-Encoding'
    };
    if (encoding) headers['Content-Encoding'] = encoding;
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    res.end(buf);
    log(`${req.method} ${req.url} 200 ${buf.length}B${encoding ? '(' + encoding + ')' : ''} ${Date.now() - started}ms`);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
    log(`${req.method} ${req.url} 500 ${e && e.message}`);
  }
});

server.listen(PORT, HOST, () => {
  log(`抓宠游戏静态站已启动 · http://${HOST}:${PORT} · ROOT=${ROOT} · v${VERSION}`);
});
