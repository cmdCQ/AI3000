# ai3000 本地移植说明 (2026-09-07 柒柒)

来源: 103.24.217.153 → cq-server 本地 docker
- compose: /var/www/sqw.somtfly.com/docker/docker-compose.yml (build 已改 image: docker-*:latest,
  原版在 backups/webroot-cleanup-20261016-154906/docker/docker-compose.yml.bak-103orig)
- 数据卷: ai3000_{mysql_data,rag_vector_db,nginx_certs,upload_data,huggingface_cache} (本地 172.18.0.1 网关 ai3000_net)
- 证书: /etc/letsencrypt
- ⚠️ freep.somt.top 转发块未加入本地 conf, 等内网穿透阶段接
  (2026-10-16 删掉两份过时副本 deploy/nginx-default.conf.live-103 与 deploy/nginx-stage1.conf,
   需要时从 git 历史取: git show 90030f4^:deploy/nginx-stage1.conf)
- 测试: faker.ren / sqw.somtfly.com / somt.top 全 200
  (www.somtfly.com / somtfly.com / www.somt.top / www.faker.ren 已不解析, 2026-10-16 清理完毕)

## 2026-10-16: nginx 配置搬出 webroot（重要）
- **生效的配置 = `deploy/nginx-conf/default.conf`**。compose 挂载的是这个**目录**
  (`deploy/nginx-conf:/etc/nginx/conf.d:ro`)，不再是单个文件。
- 为什么改：原来挂 `build/nginx/nginx-default.conf` 这个**单文件**。用 sed/编辑器替换主机
  文件会产生新 inode，容器仍绑在旧 inode 上 —— 改了配置"不生效"，`nginx -s reload` 也只是
  把旧内容重载一遍。2026-10-16 就是踩了这个坑（主机 22609B / 容器 21961B，两个 inode）。
- 改配置后固定两步：
  `docker exec ai3000-nginx nginx -t && docker exec ai3000-nginx nginx -s reload`
- 改完自查容器读到的确实是新内容：
  `docker exec ai3000-nginx md5sum /etc/nginx/conf.d/default.conf`
- webroot (`build/nginx/`) 只放静态文件：不放任何 `.conf`、不放备份、不放日志
  （公网可下载 `.conf` 已在 2026-10-16 修掉，见 `deploy/nginx-conf/default.conf:80-82`）。

## 2026-10-16: 源码与部署产物彻底分离（重要）
- **人只改 `src/`，`build/` 是生成物，不要直接编辑** —— 下次同步会覆盖回去。
- 改完跑 `./deploy/sync.sh`（支持 `--dry-run`）：

  | 源码 | 产物 | 谁在用它 |
  |---|---|---|
  | `src/web/`    | `build/nginx/`   | nginx 容器挂 `/usr/share/nginx/html`（**目录**挂载） |
  | `src/server/` | `build/backend/` | backend 容器挂 `/app/{auth-server,config,chat-proxy}.js` + `/app/paipan`（**单文件**挂载） |
  | `src/rag/`、`src/upload/` | 无产物 | 不被挂载，是构建 `docker-rag` / `docker-upload` 镜像的源码 |

- compose 里的挂载路径**刻意没动**（避免线上中断），两边内容由 sync.sh 保证一致。
- 两个实际踩过的坑，sync.sh 都做了防护：
  1. **单文件挂载钉在 inode 上**。backend 挂的是三个单文件：用编辑器 / `sed -i` 替换主机文件
     会产生新 inode，容器继续读旧 inode —— 改了代码"不生效"，而且完全静默（nginx 配置
     2026-10-16 出事就是这个形态）。所以 `src/server → build/backend` 用 `rsync --inplace`，
     直接写进原文件、inode 不变（实测：改内容前后 inode 都是 13254506）。
  2. **`rsync -a` 默认用「大小 + 修改时间」判断要不要传**，同一秒内、大小不变的改写会被
     误判成"无需更新"。所以加了 `-c`（校验和）。
- `build/` 已整体进 `.gitignore`。完全重建（**已实测通过**）：
  `rm -rf build/ && ./deploy/sync.sh`
  脚本检测到产物目录是新建的，会 `--force-recreate` 对应容器重新绑定挂载。
- 自检：脚本末尾比对「所有被挂载文件」的 md5 清单摘要，容器读到的必须就是产物内容。
  刻意**不用文件个数** —— backend 的 `/app` 里还有镜像自带的 `node_modules`（6361 个文件），
  个数天然对不上；而且个数也发现不了「绑在旧 inode 上」这种过期。
- 这条边界解决的问题：以前 `build/` 同时是 git 真相来源、挂载产物目录、手工编辑工作区、
  备份堆放处四个身份，导致源码与产物互相覆盖、`.bak` 代替 git 干回滚。

## 2026-10-16: 清理掉的死内容（都已提交，可用 git 找回）
- `build/nginx/music/` + `build/music-api/` + `ai3000-music-api` 容器 + `ai3000_music_data` 卷
  + `docker-music-api:latest` 镜像 —— 9/7 从 103 整体 tar 过来的成品，**源码不在本机**，
  前端零页面引用
- `build/nginx/faker/` —— 被 Halo 博客取代的旧 React 静态站
  （faker.ren 现解析到 47.83.172.187，由 faker-nginx + halo 容器服务，不经过 ai3000-nginx；
  母本在 `/root/.openclaw/workspace/faker-site`，`diff -rq` 验证过与线上逐字节一致）
- `build/nginx/personal/` —— 零链接的旧 SOMTFLY 个人首页
- nginx 配置里 `faker.ren` / `somtfly.com` / `www.somtfly.com` / `www.somt.top`
  等已不解析的 server 块与别名（原先 5 个死域名，现为 0）
- `deploy/nginx-default.conf.live-103`、`deploy/nginx-stage1.conf`（过时配置副本）
- webroot 内 15 个 `.bak-*`、5 个零引用文件、1 组重复文件（md5 均为 `03a7c8bb…`）
- `build/rag/__pycache__/` 14 个 `.pyc`
- 顺带修掉的真 bug：`--adm-*` 令牌断层（后台搜索框无边框）、17 页被 Google Fonts
  阻塞首屏、sqw 的 SPA fallback 把每个 404 伪装成 200（死链因此永远发现不了）、
  `nginx-stage1.conf` 与 `nginx-default.conf.live-103` 可被公网直接下载
