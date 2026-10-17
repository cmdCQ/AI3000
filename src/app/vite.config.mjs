// 前端构建：Vite 是 build/nginx 的**唯一**写入者（deploy/sync.sh 里那条
// `src/web → build/nginx` 的 rsync 已被本构建取代）。
//
//   src/app/  新前端（React / ESM）。每个 src/app/<页>/index.html 自动成为一个入口；
//             同目录下的其它 <名字>.html 也各成一个入口（保住老的 `.html` 地址，
//             见下面「加一个页面」那段）。
//   src/web/  还没搬过来的老页面，交给 publicDir **逐字**拷过去，Vite 不解析它们。
//
// 为什么老页面不能交给 Vite 处理（实测，不是推测）：
//   它会把 <link href="/css/x.css"> 重写成 /assets/x-<hash>.css，
//   却**完全不管** <script src="/js/x.js">，也从不把那些 js 发出去 ——
//   老页面全是传统 script（19 个页面没有一个 type="module"）且靠跨文件全局变量
//   互相调用，走 Vite 会静默丢掉全部 JS。
//
// 搬迁方式：src/web/<页>/ 删掉，src/app/<页>/ 建起来。src/web/ 空了就把
// publicDir 改成 false —— 到那时代码里不再有第二棵树。
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '..', '..')
const LEGACY = join(REPO, 'src', 'web')

// 加一个页面 = 加一个 `<页>/index.html`，或者 `<页>/<名字>.html`，不用回来改这张表。
//
// 为什么也认 `<页>/<名字>.html`：老的六爻结果页 / 记录页线上地址是
// `/liuyao/result.html` 与 `/liuyao/history.html`（**带 .html**，不是目录），
// 而记录页 `viewRecord()` 与后台 `admin.js` 都还写着这两个 URL。
// 如果按「一页一目录」把它做成 `liuyao/result/index.html`，产物就是 `/liuyao/result/`
// —— 老地址直接 404。所以这两页的 HTML 就放在 `liuyao/result.html` / `liuyao/history.html`，
// 入口名的取法随之变成：
//   index.html     → `<页>`            （产物 `<页>/index.html`，即 `/liuyao/`）
//   其它 <名字>.html → `<页>/<名字>`    （产物 `<页>/<名字>.html`，即 `/liuyao/result.html`）
// 输出路径本来就是「源文件相对 root 的路径」，所以两种取法产出的文件名都正确；
// 这里给 input 起名只是为了让 rollup 的 chunk 名与产物一一对应
// （`assets/liuyao/result-<hash>.js`），不参与 URL 生成。
const input = {}
// ★ 首页是唯一一个**不在子目录里**的入口：它的线上地址是 `/`，产物必须是
// `build/nginx/index.html`。而 Vite 的 HTML 输出路径 = 源文件相对 root 的路径，
// 所以源文件只能是 `src/app/index.html`，放 `src/app/home/index.html` 会产出
// `/home/index.html`（地址就错了）。页面自己的逻辑仍住在 `src/app/home/` 里。
if (existsSync(join(HERE, 'index.html'))) input['index'] = join(HERE, 'index.html')
for (const d of readdirSync(HERE, { withFileTypes: true })) {
  if (!d.isDirectory() || d.name === 'node_modules' || d.name === 'lib') continue
  const dir = join(HERE, d.name)
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.html')) continue
    const entry = join(dir, f)
    input[f === 'index.html' ? d.name : d.name + '/' + f.replace(/\.html$/, '')] = entry
  }
}

export default defineConfig({
  root: HERE,
  base: '/',
  plugins: [react()],
  publicDir: existsSync(LEGACY) ? LEGACY : false,
  build: {
    outDir: join(REPO, 'build', 'nginx'),
    // 实测过：emptyOutDir 只删 outDir 的**子文件**，不重建目录本身。
    // 这点很要紧 —— build/nginx 是 nginx 容器的 bind mount 点，目录被重建
    // 会让容器继续服务已删除的旧 inode（AGENTS.md §4 记的那次事故）。
    emptyOutDir: true,
    rollupOptions: { input },
  },
})
