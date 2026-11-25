// v96-push-api.mjs —— 当 github.com:443 被阻断、只有 api.github.com 可达时，
// 用 Git Data API 把「本地已有 commit」等价地复制到远端（目标：得到完全相同的 commit hash）。
//
// 用法：node v96-push-api.mjs [--apply]
// 只读模式只打印将要做的操作与基线校验结果。
import { execSync } from 'child_process';

const APPLY = process.argv.includes('--apply');
const REPO = 'lxnndd/catch-pet-game';
const BRANCH = 'main';

const git = (cmd) => execSync(cmd.replace(/^git\s+/, 'git -c core.quotepath=false '), { cwd: process.cwd(), encoding: 'utf8' }).trim();
const TOKEN = execSync('gh auth token', { encoding: 'utf8' }).trim();

async function api(path, init = {}, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await apiOnce(path, init);
    } catch (e) {
      lastErr = e;
      if (!/fetch failed|timeout|ECONNRESET/i.test(String(e && e.message))) throw e;
      console.log('   (重试 ' + (i + 1) + '/' + tries + '：' + (e.cause ? e.cause.code : e.message) + ')');
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw lastErr;
}

async function apiOnce(path, init = {}) {
  const res = await fetch('https://api.github.com' + path, {
    ...init,
    headers: {
      Authorization: 'Bearer ' + TOKEN,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* 非 JSON */ }
  if (!res.ok) throw new Error(`API ${path} -> ${res.status}: ${text.slice(0, 400)}`);
  return json;
}

// ---- 本地提交元信息 ----
const head = git('git rev-parse HEAD');
const tree = git('git log -1 --format=%T');
const base = git('git rev-parse HEAD~1');
const meta = {
  name: git('git log -1 --format=%an'),
  email: git('git log -1 --format=%ae'),
  date: git('git log -1 --format=%aI'),
  cName: git('git log -1 --format=%cn'),
  cEmail: git('git log -1 --format=%ce'),
  cDate: git('git log -1 --format=%cI'),
  msg: git('git log -1 --format=%B').trim(),
};

// ---- 远端基线（先取，changed 相对远端 tree 计算）----
const ref = await api(`/repos/${REPO}/git/ref/heads/${BRANCH}`);
const remoteHead = ref.object.sha;
const remoteCommit = await api(`/repos/${REPO}/git/commits/${remoteHead}`);
const remoteTree = remoteCommit.tree.sha;

let changed;
try {
  changed = git(`git diff --name-only ${remoteTree} HEAD`).split(/\r?\n/).filter(Boolean);
} catch (e) {
  console.error("\n❌ 本地缺少远端 tree 对象 " + remoteTree + "，无法计算差异（请先 git fetch）");
  process.exit(1);
}

console.log('本地 HEAD   :', head);
console.log('本地 tree   :', tree);
console.log('本地父提交  :', base);
console.log('作者/时间   :', meta.name + ' <' + meta.email + '> ' + meta.date);
console.log('提交信息    :', meta.msg.split('\n')[0]);
console.log('\n远端 HEAD   :', remoteHead);
console.log('远端 tree   :', remoteTree);
console.log('改动文件    :', changed.length, '个');
changed.forEach((f) => console.log("   -", f));

if (!changed.length) {
  console.log("\n✅ 远端内容已与本地一致（tree 差异为空），无需推送");
  process.exit(0);
}

if (!APPLY) {
  console.log('\n(试运行，未调用写接口；加 --apply 才会真正推送)');
  process.exit(0);
}

// ---- 1. 建 blob ----
const fs = await import('fs');
const entries = [];
for (const f of changed) {
  const buf = fs.readFileSync(f);
  const blob = await api(`/repos/${REPO}/git/blobs`, {
    method: 'POST',
    body: JSON.stringify({ content: buf.toString('base64'), encoding: 'base64' }),
  });
  entries.push({ path: f.split('\\').join('/'), mode: '100644', type: 'blob', sha: blob.sha });
  console.log('  blob', blob.sha.slice(0, 10), f);
}

// ---- 2. 建 tree ----
const newTree = await api(`/repos/${REPO}/git/trees`, {
  method: 'POST',
  body: JSON.stringify({ base_tree: remoteCommit.tree.sha, tree: entries }),
});
console.log('new tree    :', newTree.sha, newTree.sha === tree ? '（与本地一致 ✅）' : '（⚠️ 与本地不同）');

// ---- 3. 建 commit ----
const newCommit = await api(`/repos/${REPO}/git/commits`, {
  method: 'POST',
  body: JSON.stringify({
    message: meta.msg,
    tree: newTree.sha,
    parents: [remoteHead],
    author: { name: meta.name, email: meta.email, date: meta.date },
    committer: { name: meta.cName, email: meta.cEmail, date: meta.cDate },
  }),
});
console.log('new commit  :', newCommit.sha, newCommit.sha === head ? '（与本地一致 ✅）' : '（⚠️ 与本地不同）');

// ---- 4. 移动分支 ----
await api(`/repos/${REPO}/git/refs/heads/${BRANCH}`, {
  method: 'PATCH',
  body: JSON.stringify({ sha: newCommit.sha, force: false }),
});
console.log(`\n✅ 已推送：${BRANCH} -> ${newCommit.sha}`);
if (newCommit.sha !== head) {
  console.log('⚠️ 远端 commit hash 与本地不同（时间戳/字段细微差异），但 tree 相同；');
  console.log('   下次能连 github.com 时，git fetch 后 `git reset --hard origin/main` 即可对齐，工作区不会变。');
}
