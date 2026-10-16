// 前端构建：Vite 是 build/nginx 的**唯一**写入者（deploy/sync.sh 里那条
// `src/web → build/nginx` 的 rsync 已被本构建取代）。
//
//   src/app/  新前端（React / ESM）。每个 src/app/<页>/index.html 自动成为一个入口。
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

// 加一个页面 = 加一个目录，不用回来改这张表
const input = {}
for (const d of readdirSync(HERE, { withFileTypes: true })) {
  if (!d.isDirectory() || d.name === 'node_modules' || d.name === 'lib') continue
  const entry = join(HERE, d.name, 'index.html')
  if (existsSync(entry)) input[d.name] = entry
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
