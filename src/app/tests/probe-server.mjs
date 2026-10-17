// 在**部署之前**用真浏览器测一次构建产物。
//
// 为什么需要它：`vite build` 的产物进 `build/nginx` 那一刻就已经是线上内容了
// （nginx 容器把这个目录 bind mount 着，`deploy/sync.sh` 里那条 rsync 早被构建取代）。
// 也就是说「先构建、再测线上」在顺序上已经晚了 —— 测的是已经发布的东西。
// 这个服务把产物挂在一个**隔离端口**上，`/api/*` 反代到真站，于是可以在
// 「产物已生成、尚未落进 build/nginx」时把同样的 Playwright 判据跑一遍。
//
// 用法（`PROBE_DIR` 一给，playwright.config.mjs 就会自动起这个服务）：
//   PROBE_DIR=/tmp/home-probe npx playwright test
//
// 它只是判据的脚手架，不参与部署，也不被 nginx 引用。
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { request as httpsRequest } from 'node:https'

const ROOT = resolve(process.env.PROBE_DIR || '')
const PORT = Number(process.env.PROBE_PORT || 8080)
const UPSTREAM = process.env.PROBE_UPSTREAM || 'sqw.somtfly.com'

if (!existsSync(ROOT)) {
  console.error(`PROBE_DIR 不存在：${ROOT}`)
  process.exit(1)
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
}

// `/api/*` 一律反代到真站：公告内容、登录态这些判据要打真后端，
// 桩掉就等于用桩去证明桩。
function proxy(req, res) {
  const upstreamReq = httpsRequest(
    {
      host: UPSTREAM,
      port: 443,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: UPSTREAM },
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers)
      upstreamRes.pipe(res)
    }
  )
  upstreamReq.on('error', (e) => {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' })
    res.end(`反代失败：${e.message}`)
  })
  req.pipe(upstreamReq)
}

createServer((req, res) => {
  if (req.url.startsWith('/api/')) return proxy(req, res)

  let pathname = decodeURIComponent(req.url.split('?')[0])
  if (pathname.endsWith('/')) pathname += 'index.html'

  // 目录穿越防护：normalize 后必须仍在 ROOT 下
  const filePath = normalize(join(ROOT, pathname))
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end('forbidden')
    return
  }

  let target = filePath
  if (existsSync(target) && statSync(target).isDirectory()) target = join(target, 'index.html')
  if (!existsSync(target)) {
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
    res.end('<h1>404</h1>')
    return
  }

  res.writeHead(200, {
    'content-type': MIME[extname(target)] || 'application/octet-stream',
    // 与线上 nginx 对齐：产物文件名带 hash，可以长缓存；HTML 不缓存
    'cache-control': extname(target) === '.html' ? 'no-cache' : 'public, max-age=31536000',
  })
  createReadStream(target).pipe(res)
}).listen(PORT, '127.0.0.1', () => {
  console.log(`probe server: http://127.0.0.1:${PORT}  ←  ${ROOT}（/api 反代 ${UPSTREAM}）`)
})
