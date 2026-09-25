#!/bin/sh
# 古籍正文导出：把整本书的 content 原样落到本地文件。
#
#   SSHPASS=$(cat /tmp/ai3000_pass) sh tools/ssdump.sh <book_id> <out.txt>
#
# 与 ssq.sh 的区别：多一个 `-r`（--raw）。不加它时 mysql 批处理模式会把正文里的
# 换行转义成**字面量** `\n`（这正是之前 dump 出来满屏 `\n` 的原因），古文读起来全是噪声。
: "${SSHPASS:?export SSHPASS first}"
ID="$1"; OUT="$2"
[ -n "$ID" ] && [ -n "$OUT" ] || { echo "用法: ssdump.sh <book_id> <out.txt>" >&2; exit 2; }

REMOTE='cd /var/www/sqw.somtfly.com/docker \
  && MPW=$(grep -m1 ^MYSQL_ROOT_PASSWORD= .env | cut -d= -f2-) \
  && exec docker exec -i -e MYSQL_PWD="$MPW" ai3000-mysql \
       mysql -uroot --default-character-set=utf8mb4 -N -B -r ai3000'

printf 'SELECT content FROM reference_books WHERE id=%s;\n' "$ID" \
  | exec "$(dirname "$0")/ss.sh" "$REMOTE" > "$OUT"
wc -c "$OUT"
