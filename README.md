<div align="center">

# 易三千

**中国传统术数的排盘引擎，加上 AI 解读。**

真太阳时四柱八字 · 梅花易数 · 六爻 · 六十四卦 · 流式 AI 对话

[![官网](https://img.shields.io/badge/%E5%AE%98%E7%BD%91-sqw.somtfly.com-brightgreen)](https://sqw.somtfly.com)
[![node](https://img.shields.io/badge/node-%5E20.19%20%7C%7C%20%3E%3D22.12-brightgreen)](https://nodejs.org)
[![mysql](https://img.shields.io/badge/mysql-8.0-blue)](https://www.mysql.com)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

</div>

---

排盘、组织、解读分成三段：`src/server/paipan/` 是纯算法（干支历、节气、真太阳时、
六爻纳甲、梅花体用），`auth-server.js` 把它组织成 JSON 并负责鉴权、落库，前端 React
只负责渲染和交互。AI 解读走流式返回，盘面由后端算好再交给模型——模型不自己起卦。

## 功能

| 页面 | 路径 | 说明 |
| --- | --- | --- |
| 首页 | `/` | 入口：AI 对话、四柱八字、六十四卦、梅花易数、六爻 |
| 新建命盘 | `/charts/` | 真太阳时四柱排盘：十神、藏干、大运、流年 |
| 我的命盘 | `/my-charts/` | 已存命盘的列表与详情；格局、用神、五行力量、合冲刑害 |
| 选择命盘 | `/select-chart/` | 从已存命盘中选一张 |
| 梅花易数 | `/mhys/` | 体用生克、互卦错卦综卦，起卦到断语一条线 |
| 六爻 | `/liuyao/` | 六爻纳甲、六亲六神、世应、旺衰空亡 |
| 六十四卦 | `/hexagrams/` | 六十四卦的卦辞、爻辞、象传，可按卦名、拼音、卦象搜索 |
| AI 对话 | `/ai-chat/` | 流式问答，可挂上排盘结果一起问 |
| 个人中心 | `/my/` | 账号、剩余次数与个人资料 |
| 提交建议 | `/suggestion/` | 反馈与建议 |
| 后台管理 | `/admin/` | 用户、命盘、占卜记录、设置、建议、书籍与提示词 |

另有登录 `/login/`、注册 `/register/`、重置密码 `/forgot-password/`，以及结果页与记录页
`/liuyao/result.html`、`/liuyao/history.html`、`/mhys/result.html`、`/mhys/history.html`。

### 排盘引擎

`src/server/paipan/` 共 26 个文件（25 个 JS 加 `tables.json`），只做算术、不碰 HTTP：

- **历法与干支** — `ganzhi.js` `constants.js` `bazi_tables.js` `tables.json`：干支历、节气与查表数据
- **四柱** — `bazi.js` `bazi_full.js` `bazi_relations.js` `relations.js`：四柱、十神、藏干、合冲刑害
- **论断** — `yongshen.js` `bazi_yongshen.js` `bazi_patterns.js` `bazi_combos.js`：格局、用神、组合
- **运势** — `current_fortune.js` `bazi_fortune.js` `bazi_report.js`：大运、流年、应期
- **应用与总断** — `bazi_applications.js` `overview.js` `synthesis.js` `master_synthesis.js`
- **术数** — `meihua.js` 梅花体用 · `liuyao.js` 六爻纳甲 · `pingze.js` 平仄 · `strokes.js` 字占笔画
- **提示词** — `prompt.js` `bazi_prompt.js`：把盘面组织成给模型的上下文
- **兼容层** — `pycompat.js`：对齐 Python 侧的取数语义

## 快速开始

前置依赖：

- Node.js `^20.19.0 || >=22.12.0`（Vite 8 的 `engines`；后端容器本身仍是 `node:18-alpine`）
- pnpm（前端锁文件是 `src/app/pnpm-lock.yaml`）
- 完整栈还需要 Docker + Docker Compose（MySQL 8、RAG、nginx 都由 compose 提供）；
  `deploy/` 下的脚本还要 `python3`

最小可运行路径（只起前端看界面，不需要数据库）：

```sh
pnpm --dir src/app install
pnpm --dir src/app dev
# 打开 http://127.0.0.1:5173
```

这条路径只有静态页面：`vite.config.mjs` 没有配置 `/api` 反代，登录、排盘、AI 对话都要
后端参与。要连完整服务，按「部署」起容器。

环境变量：仓库里没有 `.env.example`。需要的话在仓库根目录新建 `.env`，必填项见
「配置」；Compose 通过 `docker/.env` 这个符号链接读取它。

## 配置

`config.js` 只读 `process.env`、不解析 `.env` 文件；容器里的变量由 Compose 注入。
`.env` 已在 `.gitignore` 里，**不要提交真实密钥**。

| 变量 | 说明 | 必填 |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | DeepSeek API Key，backend 与 RAG 共用 | 是 |
| `MYSQL_PASSWORD` | `ai3000` 数据库用户的密码 | 是 |
| `MYSQL_ROOT_PASSWORD` | MySQL root 密码，供 compose 初始化 | 是（Compose） |
| `ADMIN_PASSWORD` | `/admin/` 后台登录密码 | 是 |
| `ALIBABA_ACCESS_KEY_ID` | 阿里云短信 AccessKey ID | 是 |
| `ALIBABA_ACCESS_KEY_SECRET` | 阿里云短信 AccessKey Secret | 是 |
| `MYSQL_HOST` | 数据库地址，默认 `localhost`；Compose 注入 `mysql` | 否 |
| `MYSQL_USER` | 数据库用户，默认 `ai3000` | 否 |
| `MYSQL_DATABASE` | 数据库名，默认 `ai3000` | 否 |
| `DEEPSEEK_BASE_URL` | 模型接口地址，默认 `https://api.deepseek.com/v1` | 否 |
| `ALIBABA_SIGN_NAME` | 短信签名，默认 `速通互联验证码` | 否 |
| `ALIBABA_TEMPLATE_CODE` | 短信模板，默认 `100001` | 否 |
| `WECHAT_APP_SECRET` | 微信登录密钥，缺省为空 | 否 |
| `RAG_URL` | backend 访问 RAG 的地址，默认 `http://localhost:8800`；Compose 注入 `http://rag:8800` | 否 |
| `UPLOAD_TOKEN` | upload 服务的访问令牌 | 否（upload 用） |
| `UPLOAD_ADMIN_PW` | upload 服务的管理密码 | 否（upload 用） |
| `UPLOAD_MAX_TOTAL` | upload 总容量上限，默认 2GB | 否 |

## 使用示例

线上实例有一个匿名的当前干支接口，可以直接调用：

```sh
curl -s https://sqw.somtfly.com/api/now/gz
```

返回 `solar`、`lunar`、`year_gz`、`month_gz`、`day_gz`、`hour_gz` 等字段的 JSON。接口只做
纯计算、匿名可用，但不承诺对外稳定性。

## 项目结构

- `src/app/` —— 前端源码，React 19 + Vite 8。每个页面一个入口（`<页>/index.html`，
  结果页是 `<页>/result.html`），Vite 构建时自动收集；`lib/` 放请求封装
  `api.js`、AI 对话页的流式读取 `aiStream.js`、鉴权与各渲染器；`shared/` 放跨页组件、历法数据与
  共享样式；`public/` 是 Vite 原样拷贝的静态资源（图片、ACME 验证文件）；`tests/` 是
  Playwright 与 Vitest。
- `src/server/` —— 后端，无框架的单文件 Node HTTP 服务 `auth-server.js`（账号、短信、
  微信、命盘存取、排盘 API、AI 对话），`config.js` 负责环境变量校验，`chat-tools.js`
  与 `chat-proxy.js` 是 AI 侧的工具与代理层，`paipan/` 是纯排盘算法。
- `src/rag/` —— Python 3.11 + FastAPI + ChromaDB + fastembed 的典籍检索服务，
  配置在 `src/rag/config.yaml`，入口 `src/rag/src/main.py`。
- `src/upload/` —— Node 临时文件中转服务，上传后 24 小时自动删除。
- `deploy/` —— 唯一发布入口 `sync.sh`，以及资源版本号、内联检查、nginx 配置和镜像 Dockerfile。
- `docker/` —— Compose 编排、MySQL 初始化 SQL、本地移植说明。
- `data/` —— 运行时 JSON 数据（用户、公告、配置等），已被 gitignore。
- `build/` —— 部署产物，gitignore；`build/nginx` 是 nginx 的 webroot，`build/backend` 是后端挂载源。
- `duipan/` —— 排盘对拍 harness、金标准与冻结基线脚本。
- `tools/` —— 一次性探针、截图与 RAG 语料整理脚本，不是运行入口。

请求流转：浏览器先到 nginx，静态页面和资源从 `build/nginx` 直接返回，`/api/` 反代到
`backend:3301`。`auth-server.js` 解析请求，排盘类接口调用 `paipan/` 里的纯函数，把结果
组织成 JSON；AI 对话接口把 `chat-tools.js` 定义的工具交给模型，由模型按需调用排盘工具；
需要典籍时向 `rag:8800/api/retrieve` 取片段，再调 DeepSeek 模型。模型输出由 `res.write` 分段写回，
前端的流式读取（`lib/aiStream.js` / `shared/aiPanel.js`）用 `XMLHttpRequest.onprogress`
增量读取。上传走 `/api/up/` 到 upload 服务。

## 开发

前置条件：先完成「快速开始」里的 `pnpm --dir src/app install`。只改前端时不需要容器；
要在本机起后端和数据库，按「部署」准备 `.env` 与 compose。人只改 `src/`，`build/` 是生成物。

```sh
pnpm --dir src/app dev        # Vite 开发服务器，改前端即时生效
```

新增页面只需建 `src/app/<页>/index.html`，Vite 会把它收成入口。请求封装在
`src/app/lib/api.js`，AI 对话页的流式读取在 `src/app/lib/aiStream.js`，结果页的 AI 面板在
`src/app/shared/aiPanel.js`。

后端在容器里由 `pm2-runtime` 启动；直接在本机跑 `node src/server/auth-server.js` 需要
自己提供可连的 MySQL，并先把环境变量导出到进程环境（`config.js` 不读 `.env` 文件）。

发布与自查：

```sh
./deploy/sync.sh --dry-run    # 只看会改什么
./deploy/sync.sh              # 构建前端 + 同步后端 + 重算资源版本号 + 自检
```

`sync.sh` 用 Vite 把 `src/app/` 构建到 `build/nginx/`，用 `rsync -a -c --inplace` 把
`src/server/` 同步到 `build/backend/`（后端是单文件挂载，换 inode 容器会继续读旧文件），
再给静态资源打内容哈希 `?v=`，最后逐文件比对宿主机与容器里的 md5。

改前端时，改动前后各跑一次 `webprobe`（部署机上的外部工具 `/usr/local/bin/webprobe`，
不在本仓库），元素数、文本长度一致才算等价替换；没有它就用 `curl -skI` 看状态码与响应头。

## 测试

端到端（Playwright）：

```sh
pnpm --dir src/app test:e2e
```

默认 `baseURL` 是线上 `https://sqw.somtfly.com`，也可以用 `BASE_URL` 指向别处，或用
`PROBE_DIR` 让 `playwright.config.mjs` 起本地 probe server 打本地构建。首次运行需要
`pnpm --dir src/app exec playwright install chromium`。

当前全量 138 项：136 通过，1 条重试后通过（`/admin/` 登录卡片像素基线），1 条失败
（`/charts/` 的「编辑模式标题」实际仍是「我的命盘」）。以 `tests/.report` 里的详情为准。

纯函数单测（Vitest）：

```sh
pnpm --dir src/app test:unit
```

注意：当前 `tests/auth-pages.logic.test.mjs` 在 `environment: node` 下会报
`window is not defined`（`shared/auth.js:27`），修好前以端到端结果为准。

排盘数学另有一套对拍基线（`duipan/`）：

```sh
# 本机没有 shushu 的 Python 时显式降级（依赖 shushu 的断言会逐条跳过）
NO_SHUSHU=1 PY=/usr/bin/python3 sh duipan/freeze_backend.sh
```

有 shushu 环境时用 `PY=/path/to/python sh duipan/freeze_backend.sh` 做完整校验；两者都
需要真 Firefox。

## 部署

线上由 `docker/docker-compose.yml` 编排五个容器：`nginx`（80/443，本机映射到
`8080`/`443`）、`backend`（3301）、`mysql`（8.0）、`rag`（8800）、`upload`（3401），
共用 external 网络 `ai3000_net`。

日常发布入口只有一条（栈已经在跑时）：

```sh
./deploy/sync.sh
```

Compose 里没有 `build:`，镜像要先手动构建（`docker/deploy.sh --build` 会打印同样的命令）：

```sh
docker build -f deploy/Dockerfile.nginx -t docker-nginx:latest deploy
docker build -f src/server/Dockerfile -t docker-backend:latest src/server
docker build -f src/rag/Dockerfile -t docker-rag:latest src/rag
docker build -f src/upload/Dockerfile -t docker-upload:latest src/upload
```

首次起栈还需要 external 网络与卷（Compose 不会自动创建）：

```sh
docker network create ai3000_net
for v in ai3000_mysql_data ai3000_rag_vector_db ai3000_nginx_certs ai3000_model_cache; do
  docker volume create "$v"
done
```

`ai3000_upload_data` 会自动创建。RAG 的本地向量模型要先灌进模型卷：

```sh
./deploy/fetch-embedding-model.sh
```

然后 `docker compose -f docker/docker-compose.yml up -d`。首次按这个顺序准备好之后，每次发布
只需要再跑 `./deploy/sync.sh`。

几个部署环境的事实：Compose 的 bind mount 写死了 `/var/www/sqw.somtfly.com`；nginx 依赖
`/etc/letsencrypt` 证书，443 使用 frp 必需的 `proxy_protocol`，80 会 301 到 HTTPS；
换机器部署要同时改 compose 和 `deploy/nginx-conf/default.conf`。移植记录见
[docker/README-本地移植.md](docker/README-本地移植.md)。

`src/rag/` 没有产物目录，代码是烤进镜像的：改完要重建 `docker-rag:latest` 并重建 rag
容器，`sync.sh` 不会替你更新它。

## 常见问题

**改了 `src/` 线上没变化？** `build/` 是生成物，先跑 `./deploy/sync.sh`。后端挂的是
`build/backend` 里的单文件，脚本用 `--inplace` 保住 inode；不要手工 `cp` 或 `sed -i`。

**改了 `src/rag/` 为什么没生效？** RAG 没有产物目录，`sync.sh` 只同步前端和后端。重建
`docker-rag:latest` 后 `docker compose -f docker/docker-compose.yml up -d --force-recreate rag`。

**本地 `docker compose up` 起不来？** 先建 external 网络与卷，再准备证书；compose 里的
宿主路径和 `proxy_protocol` 都是按部署机写的，换机器要改配置。

## 贡献

欢迎提 Issue 反馈问题或建议。开 PR 前请先开 Issue 讨论方向。提交前请跑
`pnpm --dir src/app test:e2e`（或至少 `./deploy/sync.sh --dry-run`）确认没有破坏现有行为。

## 免责声明

本项目内容仅供文化研究与娱乐参考，不构成任何决策依据。

## License

[MIT](./LICENSE) © 2026 CQ

## 致谢

- [CQ（cmdCQ）](https://github.com/cmdCQ) —— 设计、排盘引擎、AI 解读、部署
- 早期提交是服务器上的部署机身份署的名，[`.mailmap`](./.mailmap) 已把它们归到本人名下
- 依赖的开源项目：React、Vite、Vitest、Playwright、FastAPI、ChromaDB、fastembed、
  `lunar-javascript`，以及 DeepSeek 的模型接口
