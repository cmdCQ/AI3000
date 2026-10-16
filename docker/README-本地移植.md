# ai3000 本地移植说明 (2026-09-07 柒柒)

来源: 103.24.217.153 → cq-server 本地 docker
- compose: /var/www/sqw.somtfly.com/docker/docker-compose.yml (build 已改 image: docker-*:latest, 原版在 docker-compose.yml.bak-103orig)
- 数据卷: ai3000_{mysql_data,rag_vector_db,nginx_certs,upload_data,huggingface_cache} (本地 172.18.0.1 网关 ai3000_net)
- 证书: /etc/letsencrypt (faker.ren/somt.top/freep.somt.top/somtfly.com 全搬)
- ⚠️ somtfly.com 证书 2026-09-04 已过期 (容器卷内那份也是), 需要续期
- ⚠️ freep.somt.top 转发块未加入本地 conf (原运行版在 deploy/nginx-default.conf.live-103, 44行差异仅此), 等内网穿透阶段接
- 测试: faker.ren/sqw.somtfly.com/www.somtfly.com/somt.top 全 200

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

## 2026-10-16: 前端源码与部署产物分离（重要）
- **人只改 `src/web/`。`build/nginx/` 是生成物，不要直接编辑** ——
  下次同步会把它覆盖回去。改完跑 `./deploy/sync.sh`（支持 `--dry-run`）。
- compose 仍挂 `build/nginx:/usr/share/nginx/html:ro`（挂载路径刻意没动，避免线上中断）。
- `build/nginx` 已存在时 rsync 只改内容、不换目录 inode，容器立刻生效、无需重启。
- 空目录重建走同一条路：`rm -rf build/nginx && ./deploy/sync.sh`
  （脚本新建目录后 `--force-recreate` nginx 以重新绑定挂载 —— 已实测通过）。
- 这条边界解决的问题：以前 `build/nginx/` 同时是 git 真相来源、挂载产物目录、
  手工编辑工作区、备份堆放处四个身份，导致源码与产物互相覆盖、`.bak` 代替 git 干回滚。

## 2026-10-16: 清理掉的死内容（都已提交，可用 git 找回）
- `build/nginx/music/` + `build/music-api/` + `ai3000-music-api` 容器 + `ai3000_music_data` 卷
  —— 9/7 从 103 整体 tar 过来的成品，**源码不在本机**，前端零页面引用
- `build/nginx/faker/` —— 被 Halo 博客取代的旧 React 静态站
  （faker.ren 现解析到 47.83.172.187，由 faker-nginx + halo 容器服务，不经过 ai3000-nginx）
- `build/nginx/personal/` —— 零链接的旧 SOMTFLY 个人首页
- nginx 配置里 `faker.ren` / `somtfly.com` / `www.somtfly.com` / `www.somt.top`
  等已不解析的 server 块与别名（原先 5 个死域名，现为 0）
- webroot 内 15 个 `.bak-*`、2 份历史 nginx 配置、5 个零引用文件、1 组重复文件
- `build/rag/__pycache__/` 14 个 `.pyc`
- 顺带修掉的真 bug：`--adm-*` 令牌断层（后台搜索框无边框）、17 页被 Google Fonts
  阻塞首屏、sqw 的 SPA fallback 把每个 404 伪装成 200（死链因此永远发现不了）
