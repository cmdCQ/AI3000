# ai3000 本地移植说明 (2026-09-07 柒柒)

来源: 103.24.217.153 → cq-server 本地 docker
- compose: /var/www/sqw.somtfly.com/docker/docker-compose.yml (build 已改 image: docker-*:latest, 原版在 docker-compose.yml.bak-103orig)
- 数据卷: ai3000_{mysql_data,rag_vector_db,nginx_certs,music_data,upload_data,huggingface_cache} (本地 172.18.0.1 网关 ai3000_net)
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
  （公网可下载 `.conf` 已在 2026-10-16 修掉，见 `deploy/nginx-conf/default.conf:172-180`）。
