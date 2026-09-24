// 临时文件中转服务 — 上传后 24 小时自动删除
// 纯 Node 原生实现，无第三方依赖。仅供个人临时中转使用。
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3401;
const DATA_DIR = '/data';
const TTL_MS = 24 * 60 * 60 * 1000;     // 24 小时
const MAX_SIZE = 200 * 1024 * 1024;     // 单文件 200MB
const MAX_TOTAL = parseInt(process.env.UPLOAD_MAX_TOTAL || '', 10) || 2 * 1024 * 1024 * 1024; // 全部文件上限,默认2GB
const TOKEN = process.env.UPLOAD_TOKEN || '';
const ADMIN_PW = process.env.UPLOAD_ADMIN_PW || '';

fs.mkdirSync(DATA_DIR, { recursive: true });

// meta: id -> { name, size, expires }
const metaPath = path.join(DATA_DIR, '_meta.json');
let meta = {};
try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch (_) {}
function saveMeta() { try { fs.writeFileSync(metaPath, JSON.stringify(meta)); } catch (_) {} }

function cleanup() {
  const now = Date.now();
  let changed = false;
  for (const id of Object.keys(meta)) {
    if (meta[id].expires && meta[id].expires <= now) {  // expires=0 表示永久，不过期
      try { fs.unlinkSync(path.join(DATA_DIR, id)); } catch (_) {}
      delete meta[id]; changed = true;
    }
  }
  // 清理孤儿文件（meta 里没有的）
  try {
    for (const f of fs.readdirSync(DATA_DIR)) {
      if (f === '_meta.json') continue;
      if (!meta[f]) { try { fs.unlinkSync(path.join(DATA_DIR, f)); } catch (_) {} }
    }
  } catch (_) {}
  if (changed) saveMeta();
}
setInterval(cleanup, 60 * 1000);
cleanup();

function totalSize() {
  return Object.values(meta).reduce((a, m) => a + (m.size || 0), 0);
}
// 普通(非常驻)文件占用 — 2G 上限只约束这部分
function normalSize() {
  return Object.values(meta).reduce((a, m) => a + (m.pinned ? 0 : (m.size || 0)), 0);
}
// 腾空间：为容纳 needBytes，按最早过期顺序删除【非常驻】旧文件，直到普通占用+needBytes <= MAX_TOTAL
function evictFor(needBytes) {
  if (needBytes > MAX_TOTAL) return; // 单文件超总上限，交给上层拒绝
  const order = Object.entries(meta)
    .filter(([, m]) => !m.pinned)               // 常驻文件永不被驱逐
    .sort((a, b) => a[1].expires - b[1].expires);
  let i = 0;
  while (normalSize() + needBytes > MAX_TOTAL && i < order.length) {
    const [id] = order[i++];
    try { fs.unlinkSync(path.join(DATA_DIR, id)); } catch (_) {}
    delete meta[id];
  }
  saveMeta();
}
function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}
function safeName(n) {
  return String(n || 'file').replace(/[\r\n"]/g, '').slice(0, 120) || 'file';
}

// ===== 后台 cookie 鉴权（HMAC 签名，24h）=====
const ADMIN_TTL = 24 * 60 * 60 * 1000;
function signCookie(exp) {
  const mac = crypto.createHmac('sha256', ADMIN_PW || 'x').update(String(exp)).digest('hex');
  return exp + '.' + mac;
}
function cookieValid(req) {
  const raw = req.headers.cookie || '';
  const m = raw.match(/(?:^|;\s*)up_admin=([^;]+)/);
  if (!m) return false;
  const val = decodeURIComponent(m[1]);
  const dot = val.indexOf('.');
  if (dot < 0) return false;
  const exp = parseInt(val.slice(0, dot), 10);
  if (!exp || exp <= Date.now()) return false;
  const expect = signCookie(exp);
  // 定长比较
  if (expect.length !== val.length) return false;
  let diff = 0; for (let i = 0; i < val.length; i++) diff |= expect.charCodeAt(i) ^ val.charCodeAt(i);
  return diff === 0;
}
// cookie 有效 或 pw 查询参数正确（保留兼容）
function adminOk(req, u) {
  if (cookieValid(req)) return true;
  return !!ADMIN_PW && u.searchParams.get('pw') === ADMIN_PW;
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const p = u.pathname;

  // 健康检查
  if (p === '/health') return json(res, 200, { ok: true });

  // 上传：POST /api/up/upload?name=xxx  body=raw bytes，需要 X-Token
  if (p === '/api/up/upload' && req.method === 'POST') {
    if (TOKEN && req.headers['x-token'] !== TOKEN) return json(res, 401, { error: '口令错误' });
    const name = safeName(u.searchParams.get('name'));
    const len = parseInt(req.headers['content-length'] || '0', 10);
    if (len > MAX_SIZE) return json(res, 413, { error: '文件超过 200MB 限制' });

    const id = crypto.randomBytes(9).toString('hex');
    const dest = path.join(DATA_DIR, id);
    const ws = fs.createWriteStream(dest);
    let got = 0, aborted = false;
    req.on('data', (c) => {
      got += c.length;
      if (got > MAX_SIZE) { aborted = true; req.destroy(); ws.destroy(); try { fs.unlinkSync(dest); } catch (_) {} }
    });
    ws.on('error', () => { if (!res.headersSent) json(res, 500, { error: '写入失败' }); });
    req.on('error', () => { try { fs.unlinkSync(dest); } catch (_) {} });
    req.pipe(ws);
    ws.on('finish', () => {
      if (aborted) return json(res, 413, { error: '文件超过 200MB 限制' });
      // 若加入新文件会超总量上限，先删最早的旧文件腾空间（新文件尚未入 meta，不会被误删）
      evictFor(got);
      meta[id] = { name, size: got, expires: Date.now() + TTL_MS };
      saveMeta();
      json(res, 200, { ok: true, id, name, size: got, url: '/api/up/f/' + id, expiresInMin: 24*60 });
    });
    return;
  }

  // 列表：GET /api/up/list （需要口令）
  if (p === '/api/up/list' && req.method === 'GET') {
    if (TOKEN && u.searchParams.get('t') !== TOKEN) return json(res, 401, { error: '口令错误' });
    const now = Date.now();
    const items = Object.entries(meta).map(([id, m]) => ({
      id, name: m.name, size: m.size, url: '/api/up/f/' + id,
      leftMin: Math.max(0, Math.round((m.expires - now) / 60000)),
    }));
    return json(res, 200, { items });
  }

  // 后台登录：POST /api/up/admin/login?pw=xxx → 成功种 cookie
  if (p === '/api/up/admin/login' && req.method === 'POST') {
    if (!ADMIN_PW || u.searchParams.get('pw') !== ADMIN_PW) return json(res, 401, { error: '密码错误' });
    const exp = Date.now() + ADMIN_TTL;
    const cookie = 'up_admin=' + encodeURIComponent(signCookie(exp))
      + '; Path=/api/up; Max-Age=' + Math.floor(ADMIN_TTL / 1000)
      + '; HttpOnly; Secure; SameSite=Strict';
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Set-Cookie': cookie });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // 后台登出：POST /api/up/admin/logout → 清 cookie
  if (p === '/api/up/admin/logout' && req.method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8',
      'Set-Cookie': 'up_admin=; Path=/api/up; Max-Age=0; HttpOnly; Secure; SameSite=Strict' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // 后台会话检查：GET /api/up/admin/check → cookie 是否有效
  if (p === '/api/up/admin/check' && req.method === 'GET') {
    return json(res, cookieValid(req) ? 200 : 401, { ok: cookieValid(req) });
  }

  // 后台上传：POST /api/up/admin/upload?name=xxx&hours=N （cookie 或 pw；hours=0 永久；常驻，免疫2G驱逐）
  if (p === '/api/up/admin/upload' && req.method === 'POST') {
    if (!adminOk(req, u)) return json(res, 401, { error: '密码错误' });
    const name = safeName(u.searchParams.get('name'));
    const hours = Math.max(0, parseInt(u.searchParams.get('hours') || '0', 10) || 0);
    const id = crypto.randomBytes(9).toString('hex');
    const dest = path.join(DATA_DIR, id);
    const ws = fs.createWriteStream(dest);
    let got = 0;
    req.on('data', (c) => { got += c.length; });
    ws.on('error', () => { if (!res.headersSent) json(res, 500, { error: '写入失败' }); });
    req.on('error', () => { try { fs.unlinkSync(dest); } catch (_) {} });
    req.pipe(ws);
    ws.on('finish', () => {
      // 常驻文件：expires=0 表示永久，否则 now+hours；pinned 不计入2G、不被驱逐
      meta[id] = { name, size: got, pinned: true, expires: hours ? Date.now() + hours * 3600000 : 0 };
      saveMeta();
      json(res, 200, { ok: true, id, name, size: got, url: '/api/up/f/' + id, pinned: true, hours });
    });
    return;
  }

  // 后台列表：GET /api/up/admin/list （cookie 或 pw）
  if (p === '/api/up/admin/list' && req.method === 'GET') {
    if (!adminOk(req, u)) return json(res, 401, { error: '密码错误' });
    const now = Date.now();
    const items = Object.entries(meta).map(([id, m]) => ({
      id, name: m.name, size: m.size, url: '/api/up/f/' + id,
      pinned: !!m.pinned,
      leftMin: m.expires ? Math.max(0, Math.round((m.expires - now) / 60000)) : -1, // -1 = 永久
      expires: m.expires,
    })).sort((a, b) => (b.pinned - a.pinned) || (b.expires - a.expires));
    return json(res, 200, { items, total: items.length, totalSize: totalSize(), normalSize: normalSize(), maxTotal: MAX_TOTAL });
  }

  // 后台删除：POST /api/up/admin/del?id=xxx （cookie 或 pw）
  if (p === '/api/up/admin/del' && req.method === 'POST') {
    if (!adminOk(req, u)) return json(res, 401, { error: '密码错误' });
    const id = u.searchParams.get('id') || '';
    if (!meta[id]) return json(res, 404, { error: '文件不存在' });
    try { fs.unlinkSync(path.join(DATA_DIR, id)); } catch (_) {}
    delete meta[id]; saveMeta();
    return json(res, 200, { ok: true });
  }

  // 下载：GET /api/up/f/:id
  if (p.startsWith('/api/up/f/') && req.method === 'GET') {
    const id = p.slice('/api/up/f/'.length);
    const m = meta[id];
    const gone = (msg) => {
      const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">`
        + `<meta name="viewport" content="width=device-width,initial-scale=1"><title>文件不存在</title>`
        + `<style>body{font-family:-apple-system,"PingFang SC",sans-serif;background:linear-gradient(135deg,#1e293b,#0f172a);`
        + `color:#e2e8f0;min-height:100vh;display:flex;align-items:center;justify-content:center;margin:0;padding:16px}`
        + `.c{background:#1e293b;border:1px solid #334155;border-radius:16px;padding:36px 28px;text-align:center;max-width:360px}`
        + `.i{font-size:44px;margin-bottom:12px}h1{font-size:19px;margin:0 0 8px}p{color:#94a3b8;font-size:14px;line-height:1.6;margin:0}</style>`
        + `</head><body><div class="c"><div class="i">🕒</div><h1>${msg}</h1>`
        + `<p>临时文件仅保留 24 小时，超时会自动删除。<br>请让对方重新上传后再获取新链接。</p></div></body></html>`;
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    };
    if (!m || (m.expires && m.expires <= Date.now())) return gone('文件不存在或已过期');
    const fp = path.join(DATA_DIR, id);
    if (!fs.existsSync(fp)) return gone('文件不存在');
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(m.name)}`,
      'Content-Length': m.size,
    });
    fs.createReadStream(fp).pipe(res);
    return;
  }

  json(res, 404, { error: 'not found' });
});

server.listen(PORT, () => console.log('upload-service on :' + PORT));
