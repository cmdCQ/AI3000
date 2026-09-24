# ai3000 本地移植说明 (2026-09-07 柒柒)

来源: 103.24.217.153 → cq-server 本地 docker
- compose: /var/www/sqw.somtfly.com/docker/docker-compose.yml (build 已改 image: docker-*:latest, 原版在 docker-compose.yml.bak-103orig)
- 数据卷: ai3000_{mysql_data,rag_vector_db,nginx_certs,music_data,upload_data,huggingface_cache} (本地 172.18.0.1 网关 ai3000_net)
- 证书: /etc/letsencrypt (faker.ren/somt.top/freep.somt.top/somtfly.com 全搬)
- ⚠️ somtfly.com 证书 2026-09-04 已过期 (容器卷内那份也是), 需要续期
- ⚠️ freep.somt.top 转发块未加入本地 conf (原运行版在 build/nginx/nginx-default.conf.live-103, 44行差异仅此), 等内网穿透阶段接
- 测试: faker.ren/sqw.somtfly.com/www.somtfly.com/somt.top 全 200
- 重建镜像用: build/nginx/nginx-default.conf (287行, 无 freep 块)
