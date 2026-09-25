# AI三千问 · 易三千

> 作者：[CQ / 参群](https://github.com/cmdCQ)　·　线上：<https://sqw.somtfly.com>
> 仓库：[github.com/cmdCQ/AI3000](https://github.com/cmdCQ/AI3000)　·　协议：GPL-3.0

**一个把传统术数排盘 + 古籍语料 + 大模型解读接在一条链上的站点。**
梅花易数、六爻纳甲、八字（大运流年 / 格局 / 长报告）都能在网页上排盘，再由 AI 用白话讲一遍，
并在解读里引用古籍原文。

**这个项目服务于「不懂」的人。** 术语一律先说结论、再说依据；排盘明细逐项摆给用户看
（例如字占会告诉你每个字凭什么取这个数）。AI 的解读不是装饰，是这个站点的主产品。

---

## 功能

| 模块 | 页面 | 说明 |
|---|---|---|
| 梅花易数 | `/mhys/` | 时间 / 报数 / **字占**三种起卦；五种卦（本互变错综）、体用、旺衰、应期、判词 |
| 六爻纳甲 | `/liuyao/` | 摇卦 / 时间起卦；纳甲装卦、六亲六神、伏神、化冲化合、三合三会、用神取值 |
| 八字 | `/charts/` `/my-charts/` | 四柱、十神、藏干、旺衰、格局、调候、大运流年、神煞、AI 长报告 |
| 六十四卦 | `/hexagrams/` | 卦辞爻辞、象数速查 |
| AI 对话 | `/ai-chat/` | 结合当前盘面追问；排盘结果作为上下文注入 prompt |
| 命盘管理 | `/my-charts/` `/select-chart/` | 一人多盘、多人多盘；命盘记录可复用 |
| 用户系统 | `/login/` `/register/` | 手机号注册登录；游客可先免费解析（cookie + 同 IP 日上限，且不落库）、登录后不限 |
| 古籍语料 | `/admin/` | 古籍入库（分块 → 向量化 → 检索），AI 解析时自动引用原文 |
| 其他 | `/music/` `/check/` `/suggestion/` | 附属小工具 |

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | 原生 HTML / CSS / JS（无构建步骤，暗调新中式） |
| 后端 | Node.js（原生 `http`，无框架） |
| 数据库 | MySQL 8.0 |
| 排盘引擎 | **自研纯 JS 实现**（`build/backend/paipan/`），年历基于 [lunar-javascript](https://github.com/6tail/lunar-javascript) |
| AI | DeepSeek API（流式输出） |
| 古籍检索 | ChromaDB + 本地 Embedding（BAAI/bge-small-zh-v1.5），Python FastAPI |
| 部署 | Docker Compose（mysql / rag / backend / nginx / …） |

## 目录

```
├── build/
│   ├── backend/
│   │   ├── auth-server.js      # 主服务（HTTP + SSE + 鉴权 + 记录）
│   │   ├── paipan/            # 排盘引擎：六爻 / 梅花 / 八字（纯 JS，无框架）
│   │   │   ├── liuyao.js  meihua.js  bazi*.js
│   │   │   ├── strokes.js      # 字占笔画表（6944 字）
│   │   │   └── pingze.js       # 字占平仄取数表（入声 + 今音，生成物）
│   │   ├── config.js          # 全部密钥走环境变量，缺失即拒绝启动
│   │   └── Dockerfile
│   ├── nginx/                 # 前端站点（静态页面 + js/ + css/）
│   ├── rag/                   # 古籍向量检索服务（Python）
│   └── music-api/
├── docker/                    # docker-compose.yml、MySQL 初始化
├── tools/                     # 部署脚本、探针、校验脚本
└── duipan/                    # 排盘引擎的「对拍」harness（见下）
```

## 本地运行

```bash
git clone https://github.com/cmdCQ/AI3000.git && cd AI3000
cp docker/.env.example docker/.env     # 然后填进真值（见下表）
sh docker/deploy.sh --build            # 首次：重建镜像并起服务；日常改代码用 sh docker/deploy.sh
```

默认入口 `http://localhost:8080/`（nginx），后端 `127.0.0.1:3301`（`GET /api/me` 可用作健康检查）。

### 环境变量

密钥**全部**走环境变量，仓库里不存任何凭据（见 `.gitignore`）。

| 变量 | 必需 | 说明 |
|---|---|---|
| `DEEPSEEK_API_KEY` | ✅ | AI 解读 |
| `MYSQL_ROOT_PASSWORD` / `MYSQL_PASSWORD` | ✅ | 数据库 root / 应用账号密码 |
| `ADMIN_PASSWORD` | ✅ | 管理后台 |
| `ALIBABA_ACCESS_KEY_ID` / `ALIBABA_ACCESS_KEY_SECRET` | ✅ | 短信验证码（注册用） |
| `DEEPSEEK_BASE_URL` | | 默认 `https://api.deepseek.com/v1` |
| `MYSQL_HOST` / `MYSQL_USER` / `MYSQL_DATABASE` | | 默认 `localhost` / `ai3000` / `ai3000` |
| `BACKEND_PORT` | | 默认 `3301` |
| `WECHAT_APP_SECRET` | | 微信登录（可选） |

古籍检索服务另用 `build/rag/config.yaml` 配置（Embedding 模式 local / remote）。

## 排盘引擎：为什么不直接调现成的库

排盘结果不能只是「长得像」。同一时刻、同一组数字，**任何一处取数不同，卦就不同**，
而用户看不出两个卦里哪个才是对的。所以引擎是自己逐条对着古籍原文与参照实现写出来的，
每一步都留了判据。规则长在 `duipan/`：

- **优先级：事实 > 参照实现 > 本项目。** 参照实现与古籍原文冲突时，以原文为准。
  已经用原文推翻过一次：**字占根本不按笔画取数** —— 《梅花易数·字占》原文写的是
  「四字以上，不必数画数，只以平仄声音调之……十一字以上……止用字数」。
- 每个模块都有**金标准样例 + 差异申报表 + 覆盖断言**，判定标准不是「跑通了」，
  而是「差异集的每一项都能说出为什么」。
- 关键判据会**变异测试**：把实现故意改回错的，看判据抓不抓得住 —— 抓不住的就是橡皮章。
- 字占的音系口径：**现代普通话读音为底 + 平水韵入声字覆写为 4**。
  这个口径由原文自带的验算例「今日动静如何」逐字钉死（得地风升，初爻动）。

细节与全部实测记录见 [`duipan/README.md`](duipan/README.md)。

## 部署

```bash
sh tools/deploy_paipan.sh --check     # 只读：逐文件比哈希，不动线上
sh tools/deploy_paipan.sh --apply     # 备份 → 上传 → 容器内预检 → 重启
sh tools/deploy_nginx.sh --apply      # 前端静态资源（改过 js/css 要同步升 ?v= 指纹）
```

部署脚本本身不含任何密码：凭据由环境变量或本机 `~` 下的私密文件提供，不进仓库。

## 数据来源与致谢

| 用途 | 来源 |
|---|---|
| 年历 / 农历 / 节气 | [lunar-javascript](https://github.com/6tail/lunar-javascript)（MIT） |
| 现代读音（字占取数兜底） | [mozillazg/pinyin-data](https://github.com/mozillazg/pinyin-data)（MIT） |
| 平水韵入声字集 | [rbnyng/pingshui_rhyme](https://github.com/rbnyng/pingshui_rhyme)（MIT） |
| 繁→简转换 | [BYVoid/OpenCC](https://github.com/BYVoid/OpenCC)（Apache-2.0） |
| 六十四卦数据 | 前端语料源 cast64.com |
| 古籍文本 | [garychowcmu/daizhigev20](https://github.com/garychowcmu/daizhigev20) 等公开整理本 |

生成为 `build/backend/paipan/pingze.js` 之类的表都是**生成物**（生成器见 `duipan/`），
头注写着上游、协议、版本与复跑命令 —— 请勿手改。

## 免责声明

本站内容依据传统术数与古籍文献整理，仅供**文化研究与娱乐参考**，
不构成医疗、投资、法律或人生决策依据。请在现实中对自己负责。

## License

GNU General Public License v3.0 — 见 [LICENSE](./LICENSE)。
