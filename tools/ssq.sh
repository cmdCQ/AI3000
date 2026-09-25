#!/bin/sh
# 古籍语料查询：把 SQL 送到线上 MySQL（reference_books 全文库）。
# 密码在**服务端**从 .env 读，不经本地命令行，也不落盘。
#
#   SSHPASS=$(cat /tmp/ai3000_pass) sh tools/ssq.sh "SELECT ... "
#   echo "SELECT ..." | SSHPASS=$(cat /tmp/ai3000_pass) sh tools/ssq.sh
#
# SQL 走 **stdin**（不经命令行），故中文/引号/顿号都不必转义。
# 输出为制表符分隔的裸行（-N -B），便于再管道处理。
# 必须 --default-character-set=utf8mb4，否则古文变问号（见记忆 verify-tables-against-classical-corpus）。
: "${SSHPASS:?export SSHPASS first}"

REMOTE='cd /var/www/sqw.somtfly.com/docker \
  && MPW=$(grep -m1 ^MYSQL_ROOT_PASSWORD= .env | cut -d= -f2-) \
  && exec docker exec -i -e MYSQL_PWD="$MPW" ai3000-mysql \
       mysql -uroot --default-character-set=utf8mb4 -N -B ai3000'

if [ $# -gt 0 ]; then
  printf '%s\n' "$1" | exec "$(dirname "$0")/ss.sh" "$REMOTE"
else
  exec "$(dirname "$0")/ss.sh" "$REMOTE"
fi
