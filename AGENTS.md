# AGENTS.md — 易三千（sqw.somtfly.com）

给在这个仓库里干活的 AI 会话看的。人的话也一样适用。

这个文件的存在理由：这个项目里出过的每一次事故，都不是因为谁不会写代码，而是因为
**没有人记得住上一个会话定下的约束**。约束不写进文件、不被机器检查，就等于不存在。
所以这里只写两类东西：①必须遵守的硬规则；②违反时会怎样（用真实事故说明）。

---

## 0. 一句话规则

> **人只改 `src/`，`build/` 是生成出来的。改完跑 `./deploy/sync.sh`。**

`build/` 在 `.gitignore` 里，`git ls-files build` 必须永远是 0。它随时可以被
`rm -rf build/ && ./deploy/sync.sh` 完全重建 —— 这是这个仓库最重要的性质，
也是所有其它规则成立的前提。

---

## 1. 目录结构

```
src/web/        前端源码（改这里）
src/server/     后端源码（auth-server.js、paipan/）
src/rag/        RAG 服务
src/upload/     上传服务
deploy/
  sync.sh                  唯一的部署入口
  nginx-conf/default.conf  ★ 线上真正生效的 nginx 配置
  version-assets.py        给静态资源算 ?v= 内容哈希
  extract-inline.py        内联 CSS/JS 外提 + 检查
  Dockerfile.nginx         nginx 镜像（只加 curl，不烘 webroot）
docker/docker-compose.yml  容器编排
data/                      运行时数据（users.json 等，已 gitignore）
```

`build/nginx/` = `src/web/` 的产物（nginx 目录挂载，普通 rsync）。
`build/backend/` = `src/server/` 的产物（**单文件挂载，必须 `--inplace`**，见 §4）。

`src/rag/` **没有产物目录**：它的代码烤在 `docker-rag` 镜像里，`sync.sh` 完全不管它（见 §4h）。

---

## 2. 改完必须做的三件事

```sh
./deploy/sync.sh                    # 同步 + 版本化 + 自检（会自动重建需要的容器）
```

1. **看自检输出**：`产物 <md5> / 容器 <md5> ✓`。✗ 就说明容器读到的不是产物内容，
   多半是挂载绑在旧 inode 上（§4 的坑）。
2. **线上验证**（不是看日志，是发请求）：
   ```sh
   curl -skI https://sqw.somtfly.com/<改过的路径>
   ```
3. **页面等价性**（改前端时）：
   ```sh
   webprobe https://sqw.somtfly.com/<页面>/     # 元素数/样式表数/脚本数/文本长度/控制台报错
   ```
   改动前后各跑一次逐字段对比。**元素数和文本长度一致 = 等价替换**；
   不一致就是改坏了，别靠肉眼。

**不要说"应该没问题"。要么有上面三条里的输出，要么别说完成。**

---

## 3. 硬规则

| # | 规则 | 违反的后果（真实发生过） |
|---|---|---|
| 1 | 不直接编辑 `build/` 下的任何文件 | 下次 `sync.sh` 悄悄覆盖掉你的修改，或者更糟：git 里和线上不一致 |
| 2 | 不在 `src/` 里手写 `?v=xxx` | `sync.sh` 每次按内容重算，手写的被覆盖；抄错哈希会把用户永远钉在旧缓存上 |
| 3 | 不在仓库里放 `.bak`/`.old`/`.orig` | 曾经有 7 个 `.bak` 被 commit 进库，`.bak` 在替 git 干回滚 |
| 4 | `gzip_types` 里**绝不加** `text/event-stream`，绝不用 `gzip_types *` | AI 对话是 SSE 流式（`auth-server.js` 的 `/api/chat/send` 与 `streamBaziParse`）。压缩它等于把逐字输出变成"憋很久来一大坨"，功能直接坏掉 |
| 5 | 不给 `src/web/**/*.html` 里加 >=1KB 的内联 `<style>`/`<script>` | 内联代码没有独立 URL，无法单独缓存、无法被工具检查。曾经 ai-chat/index.html 80KB 里 71KB 是内联 |
| 6 | 内联脚本外提时**不加 `defer`/`async`** | 内联脚本解析到就同步执行；加 defer 会推迟到文档解析完，DOMContentLoaded 次序改变 —— 是行为变更不是等价替换 |
| 7 | 容器挂载**不挂单个文件**，挂目录 | 单文件 bind mount 钉在 inode 上。用编辑器或 `sed -i` 保存会产生新 inode，容器永远读旧的，`nginx -s reload` 加载的还是旧配置（§4） |
| 8 | 改 nginx 配置后用 `deploy/nginx-conf/default.conf`，不用 `build/nginx/` 下的 | 曾经 webroot 里躺着一份"第二事实来源"，导致线上行为和仓库内容不一致 |
| 9 | 别在 live 事故里试探索性配置改动 | 见 §4 的事故：我先错误地去掉了 `proxy_protocol`，把 3 分钟的中断拉长 |
| 10 | 归档旧文件进库前先扫凭据 | 旧 `.bak` 最容易藏凭据：2026-10-16 归档的 16 个里有一个硬编码着**线上在用的阿里云 AccessKey**，push 被 GitHub 拦下 |

---

## 4. 这个环境特有的坑（都踩过）

**a) 单文件 bind mount 的 inode 陷阱**
后端容器挂的是 `build/backend/auth-server.js` 这类单文件。宿主机用 `sed -i`/编辑器
保存会生成新 inode，容器继续读旧 inode —— 改代码"不生效"且完全静默。
所以 `sync.sh` 对后端用 `rsync --inplace`（写进原文件，inode 不变），并用 `-c`
（校验和）而不是默认的"大小+时间"判断 —— 同秒同大小的改动会被默认快捷检查跳过。
**验证方法不是数文件个数**（容器 `/app` 里还有镜像自带的 6361 个 node_modules 文件），
是逐文件 md5 清单比对。

**b) 443 上的 `proxy_protocol` 不能删**
公网流量经外部中继（香港 149.88.95.206 的 frps）转发，中继会注入 PROXY v2 header，
所以 `listen 443 ssl http2 proxy_protocol;` 是必需的。删掉 → 全站 HTTPS 直接 000。

**c) `docker exec ai3000-nginx cat /var/log/nginx/access.log` 会挂住**
不要用它读日志（会留下一个永不结束的后台作业）。统计访问量要换方式。

**d) chromium 是 snap 包，有私有 `/tmp`**
`--screenshot=/tmp/x.png` 实际落在 `/tmp/snap-private-tmp/snap.chromium/tmp/`；
`file:///tmp/x.html` 它读不到。`--remote-debugging-port=0` 写的端口文件也在私有目录，
宿主读不到 —— 要用固定端口并轮询 `http://127.0.0.1:PORT/json/version`。
用现成的 `/usr/local/bin/shot2`（截图）和 `/usr/local/bin/webprobe`（页面指纹）。

**e) 判断引用/压缩必须看内容，不能看计数**
`grep -c` 会把注释、备份目录、自己的输出算进去（曾据此误报"10 个多余 `:root`"
和"2 个孤儿文件还在被引用"）。**一律打印命中行**。
测 gzip 必须 `curl --compressed` 或带 `-H 'Accept-Encoding: gzip'`，否则量到的是原始字节。

**f) `pkill -f <模式>` 会匹配到自己的命令行**
曾导致命令自杀（SIGTERM），什么都没执行还以为跑完了。

**g) DNS 把 `github.com` 解析到被墙的 IP**
本仓库已在 `.git/config` 钉住（没动系统 DNS）：
```sh
git config http.curloptResolve github.com:443:140.82.114.3
```
该 IP 失效就换一个（`140.82.112.3`、`20.27.177.113` 也可用）。凭据放
`~/.git-credentials`(600)，不要写进 `.git/config` 或入库文件。

**h) 改 `src/rag/` 跑 `sync.sh` 会静默不生效**
`sync.sh` 只覆盖 web 和 backend，rag 没有产物目录，所以它会一路自检 ✓ 而线上仍是旧代码。
rag 的代码是 `COPY src/ ./src/` 烤进镜像的，必须重建镜像。**但别直接 `docker build src/rag`**：
`requirements.txt` 只锁顶层，传递依赖会漂（实测 tenacity 9.1.4→9.2.1、orjson 3.11.9→3.13.0、
mmh3 4.1.0→5.3.1），且 pip 层无缓存挂载，PyPI 抖一次就废掉整轮 11 分钟。
在现有已知可用镜像上覆盖源码层即可，5 秒、不联网：
```sh
printf 'FROM docker-rag:latest\nCOPY src/ ./src/\n' > /tmp/Dockerfile.rag
docker build -f /tmp/Dockerfile.rag -t docker-rag:latest src/rag
docker compose -f docker/docker-compose.yml up -d --force-recreate rag
```
新镜像要先 `docker run --rm --entrypoint sh <img> -c 'python -c "import chromadb,fastembed"'`
确认依赖还在，再切 `latest`。

---

## 5. 三条「干净」判据（验收标准）

这个仓库的治理目标就是这三条，任何改动都不该让它们倒退：

1. **一个文件要么是源码、要么是产物，不能同时是。**
2. **任何文件删掉后都能从源码重建**；不能重建的就不是产物，是没归位的源码。
3. **备份由版本控制承担**，不以文件形式存在。

推论：`backups/` 目录、`.bak` 文件、webroot 里的第二份配置，全都是这三条的违反形态。
发现即清理，并说明内容在哪个 commit 里可取回。

自查命令：
```sh
git ls-files build | wc -l                      # 必须是 0
find src/web -name '*.bak*' -o -name '*.old'    # 必须为空

# 「删了还能不能取回」不要用 git log / git rev-list 判断：它们把「删除这次改动」
# 也算作一次触碰，于是会给假的肯定答案（这个仓库里真的发生过：README 里写着的
# 两条恢复命令全都是取不回来的）。要直接问 blob 在不在：
p='deploy/nginx-stage1.conf'   # 换成要查的路径
git rev-list --all | while read -r c; do
  git cat-file -e "$c:$p" 2>/dev/null && { echo "可取回: git show $c:$p"; break; }
done
```

---

## 6. 环境和服务的硬事实

- 仓库根 `/var/www/sqw.somtfly.com`；分支 `main`，`git push` 直接可用。
  remote = `https://github.com/cmdCQ/AI3000.git`（**公开**）。网络见 §4g。
- 旧的对拍测试套件（`duipan/` 114 个、`tools/` 37 个）只在本地分支
  `holdout/origin-main`（不推）里：`git checkout holdout/origin-main -- duipan/ tools/`
- 容器：`ai3000-nginx`（8080→80、443→443）、`ai3000-backend`（pm2 跑 auth-server.js）、
  `ai3000-mysql`、`ai3000-rag`(8800)、`ai3000-upload`(3401)。另有**别的项目**的容器
  （`faker-nginx` 与 `halo` 属 `/var/www/faker.ren/`；还有 searxng / modscan 等）——
  它们不在这个仓库里，别在这个仓库里改它们。
- nginx 挂载：`build/nginx` → `/usr/share/nginx/html`（ro）、`deploy/nginx-conf` →
  `/etc/nginx/conf.d`（ro，目录挂载）。改前端文件立即生效，不用重建容器。
- 备份由 git 承担，所以**不要**用 `docker commit`、也不要往 webroot 里写副本。
- 真在用的 vhost：`sqw` / `gh` / `know` / `scan` / `dsh.somtfly.com`、`somt.top`、
  `freep.somt.top`。历史上还有一批已死域名（`somtfly.com`、`www.somtfly.com`、
  `www.somt.top`、`faker.ren`）的配置，已删除 —— **不要照抄旧 commit 里的 server 块加回来**。

---

## 7. 和用户打交道的规则

- 用户不是运维，**技术决定自己做，不要问**。
- 但**属于他的所有权 / 产品决策，必须提问让他选**，并写清每个选项的代价：
  删不删某块内容、某个域名/镜像/数据要不要留、文案和视觉怎么定。
  用带选项的提问，不要用「你觉得呢」。
- **一个问题的答案到手就回报，不要继续往深里钻**；不要把无关的探查留在后台跑。
- 提交信息只写**为什么改**和**怎么验证的**。改动本身 `git show` 看得到，不复述过程。
- **只留有把握必要的东西。** 一件事只有三成把握觉得该留，就不要加 —— 删掉。
  文档、注释、提交信息、代码，一律如此。

---

## 8. 常用命令

```sh
./deploy/sync.sh                       # 改完 src/ 唯一要跑的
./deploy/sync.sh --dry-run             # 只看会改什么
python3 deploy/extract-inline.py --check    # 内联块回归检查
python3 deploy/version-assets.py --help
docker exec ai3000-nginx md5sum /etc/nginx/conf.d/default.conf   # 确认容器读到新配置
docker exec ai3000-nginx nginx -t && docker exec ai3000-nginx nginx -s reload
git log --oneline | head -20
```
