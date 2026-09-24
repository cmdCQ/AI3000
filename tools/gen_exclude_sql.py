# -*- coding: utf-8 -*-
"""从 curate_vector_db.py 的删除名单生成 MySQL 排除 SQL。

目的：向量库里已删的书，必须把 reference_books.status 改成 'excluded'，
否则 /api/admin/books/ingest-all（只捞 status='pending'）会把它们重新入回来。

不 import curate_vector_db（它顶层 import chromadb，本地没有），只做文本解析。
"""
import re
import sys

SRC = "/tmp/ai3000/curate_vector_db.py"
OUT = "/tmp/ai3000/exclude.sql"

text = open(SRC, encoding="utf-8").read()


def grab_list(name):
    m = re.search(rf"^{name}\s*=\s*\[(.*?)^\]", text, re.S | re.M)
    if not m:
        sys.exit(f"找不到列表 {name}")
    return re.findall(r'"([^"]+)"', m.group(1))


deleted = grab_list("DELETE_YIJING") + grab_list("DELETE_ZAZHAN")

ts = "(UNIX_TIMESTAMP()*1000)"

lines = [
    "-- 由 gen_exclude_sql.py 生成：封住向量库瘦身的回流",
    "-- 恢复方式：把 status 改回 'pending' 再跑 ingest-all",
    "",
    "-- 1) 本站无该体系 / 现存内容全是杂占，整类排除",
    "UPDATE reference_books SET status='excluded', updated_at=%s" % ts,
    "  WHERE category IN ('general','xiangshu','ziwei');",
    "",
    "-- 2) 已从 mingli_liuyao 删除的 %d 部（易类注疏 + 杂占）" % len(deleted),
    "UPDATE reference_books SET status='excluded', updated_at=%s" % ts,
    "  WHERE title IN (",
    ",\n".join("    '%s'" % t.replace("'", "''") for t in deleted),
    "  );",
    "",
    "-- 3) yijing 待入库的 119 部义理注疏（2325 万字）：若入库会重建 mingli_yijing，",
    "--    而 retrieve() 对每条六爻/梅花查询都强制追加 yijing → 每次检索被义理注疏稀释。",
    "--    只留《周易筮述》（筮法书）。",
    "UPDATE reference_books SET status='excluded', updated_at=%s" % ts,
    "  WHERE category='yijing' AND status='pending' AND title <> '周易筮述';",
    "",
    "SELECT category, status, COUNT(*) n FROM reference_books GROUP BY category, status ORDER BY category, status;",
    "",
]

open(OUT, "w", encoding="utf-8").write("\n".join(lines))
print(f"写出 {OUT}：排除名单 {len(deleted)} 部")
print("、".join(deleted))
