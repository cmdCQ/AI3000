<div align="center">

# 易三千

**中国传统术数的排盘引擎，加上 AI 解读。**

真太阳时四柱八字 · 梅花易数 · 六爻 · 六十四卦 · 流式 AI 对话

[![官网](https://img.shields.io/badge/%E5%AE%98%E7%BD%91-sqw.somtfly.com-brightgreen)](https://sqw.somtfly.com)
[![node](https://img.shields.io/badge/node-%E2%89%A518-brightgreen)](https://nodejs.org)
[![mysql](https://img.shields.io/badge/mysql-8.0-blue)](https://www.mysql.com)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

</div>

---

排盘、组织、解读分成三段：`src/server/paipan/` 是纯算法（干支历、节气、真太阳时、
六爻纳甲、梅花体用），后端把它组织成 JSON，前端负责画出来；AI 解读单独走 SSE 流式，
和排盘结果拼进同一个上下文。前端没有框架也没有构建步骤，HTML/CSS/JS 由 nginx 直接发出去。

## 功能

| 页面 | 路径 | 说明 |
| --- | --- | --- |
| 新建命盘 | `/charts/` | 真太阳时四柱排盘：十神、藏干、大运、流年 |
| 我的命盘 | `/my-charts/` | 已存命盘的列表与详情；格局、用神、五行力量、合冲刑害 |
| 梅花易数 | `/mhys/` | 体用生克、互卦错卦综卦，起卦到断语一条线 |
| 六爻 | `/liuyao/` | 六爻纳甲、六亲六神、世应、旺衰空亡 |
| 六十四卦 | `/hexagrams/` | 六十四卦的卦辞、爻辞、象传，全站可检索 |
| AI 对话 | `/ai-chat/` | 流式问答，可挂上排盘结果一起问 |
| 个人中心 | `/my/` | 账号、额度、已存命盘 |
| 后台管理 | `/admin/` | 用户、额度、公告、数据看板 |

## 架构

```
                    ┌────────────────┐
   浏览器 ──HTTPS──▶ │  ai3000-nginx  │  静态文件 + /api/ 反代
                    └────────┬───────┘
                             │
                    ┌────────▼────────┐        ┌───────────────┐
                    │ ai3000-backend  │───────▶│  ai3000-mysql │
                    │  Node 18 / pm2  │        └───────────────┘
                    └───┬─────────┬───┘
                        │         │
             ┌──────────▼──┐  ┌───▼───────────┐
             │  ai3000-rag │  │ ai3000-upload │
             │ FastAPI+向量 │  │   Node 18     │
             └─────────────┘  └───────────────┘
```

| 服务 | 技术栈 | 职责 |
| --- | --- | --- |
| `nginx` | nginx (alpine) | 静态资源、gzip、按内容哈希的强缓存、`/api/` 反代 |
| `backend` | Node 18 · pm2 · mysql2 | 账号、短信、命盘存取、排盘 API、AI 对话（SSE 流式） |
| `mysql` | MySQL 8 | 用户与命盘 |
| `rag` | Python 3.11 · FastAPI · ChromaDB | 术数典籍的向量检索，给 AI 问答提供引用 |
| `upload` | Node 18 | 图片中转 |

## 排盘引擎

`src/server/paipan/` 二十六个模块，只做算术、不碰 HTTP：

- **历法与干支** — `ganzhi.js` `constants.js` `bazi_tables.js`：节气、真太阳时、六十甲子
- **四柱** — `bazi.js` `bazi_full.js` `relations.js`：四柱、十神、藏干、合冲刑害
- **论断** — `yongshen.js` `bazi_yongshen.js` `bazi_patterns.js` `bazi_combos.js`：格局、用神、组合
- **运势** — `current_fortune.js` `bazi_fortune.js` `bazi_report.js`：大运、流年、应期
- **术数** — `meihua.js` 梅花体用 · `liuyao.js` 六爻纳甲 · `pingze.js` 平仄
- **提示词** — `prompt.js` `bazi_prompt.js` `master_synthesis.js`：把盘面组织成给模型的上下文

## 开发

源码在 `src/`，`build/` 是产物、不进版本库。改完跑一条：

```sh
./deploy/sync.sh             # 同步到 build/ + 重算资源版本号 + 自检
./deploy/sync.sh --dry-run   # 只看会改什么
```

`sync.sh` 把 `src/web/` 同步到 `build/nginx/`、把 `src/server/` 同步到 `build/backend/`
（后端是单文件挂载，必须 `--inplace`，否则容器读到的还是旧 inode），给每个静态资源算出
内容哈希写进 `?v=`，最后逐文件比对宿主机和容器里的 md5。

验证不是看日志，是发请求：

```sh
curl -skI https://sqw.somtfly.com/<改过的路径>
webprobe https://sqw.somtfly.com/<页面>/    # 元素数/样式表数/脚本数/文本长度/控制台报错
```

改前端时改动前后各跑一次 `webprobe`，元素数和文本长度一致才算等价替换。

## 许可

[MIT](./LICENSE) © 2026 CQ
