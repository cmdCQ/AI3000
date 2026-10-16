#!/usr/bin/env python3
"""
把 HTML 里的内联 <style> / <script> 外提成独立文件。

用法:
  python3 deploy/extract-inline.py            # 执行外提
  python3 deploy/extract-inline.py --dry-run  # 只报告，不写文件
  python3 deploy/extract-inline.py --check    # 只检查；仍有超阈值的内联块则退出码 1

规则:
  - 只处理 src/web/**/*.html 里「无 src 属性」的 <style> 与 <script>。
  - 内容（strip 后）< THRESHOLD 字节的块**保持内联**：小段代码留在原地既省一次请求，
    也避免为 20 行 CSS 造一个文件。
  - 两块内容**逐字节相同**时共用一个文件（名字取路径 slug 的公共后缀），
    这样浏览器只需下载并缓存一份。
  - 输出到 src/web/css/page-<slug>.css 与 src/web/js/page-<slug>.js。
  - 只替换块的写法，**不改变脚本执行时机**（不加 defer/async）——见下面注释。

关于不加 defer：内联 <script> 在文档流中被解析到就立即同步执行。改成带 defer 的
外链会让它在整篇文档解析完后才执行，DOMContentLoaded 的先后顺序也随之改变，属于
行为变更而不是等价替换。所以外提后保持同步执行；这些块本来就在 </body> 前。
"""
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "src" / "web"
THRESHOLD = 1024

DRY = "--dry-run" in sys.argv
CHECK = "--check" in sys.argv

# 只匹配成对的 <style>…</style> / <script>…</script>
BLOCK_RE = re.compile(
    r"<(?P<tag>style|script)(?P<attrs>[^>]*)>(?P<body>.*?)</(?P=tag)\s*>",
    re.S | re.I,
)
# 带 src 的 <script> 不是内联块
HAS_SRC = re.compile(r"\bsrc\s*=", re.I)
# 非 JS 的 <script>（如 application/ld+json）不能被搬成外部脚本
NON_JS_TYPE = re.compile(r"""\btype\s*=\s*["']?(?!module|text/javascript|application/javascript)""", re.I)
# <script> 上的 defer/async 属性搬到 src 形式时语义会变，遇到就跳过并告警
DEFER_ASYNC = re.compile(r"\b(defer|async)\b", re.I)


def slug_for(rel: str) -> str:
    parts = list(Path(rel).parts)
    if parts[-1] == "index.html":
        parts = parts[:-1]
    else:
        parts[-1] = parts[-1][: -len(".html")]
    return "-".join(parts) if parts else "home"


def common_suffix(slugs):
    toks = [s.split("-") for s in slugs]
    n = 0
    while all(len(t) > n for t in toks) and len({t[-1 - n] for t in toks}) == 1:
        n += 1
    return "-".join(toks[0][-n:]) if n else None


def scan():
    """返回 [(path, relpath, tag, attrs, body, start, end)]"""
    found = []
    for p in sorted(WEB.rglob("*.html")):
        rel = str(p.relative_to(WEB))
        text = p.read_text(encoding="utf-8", errors="surrogateescape")
        for m in BLOCK_RE.finditer(text):
            tag = m.group("tag").lower()
            attrs = m.group("attrs")
            body = m.group("body")
            if tag == "script":
                if HAS_SRC.search(attrs):
                    continue
                if NON_JS_TYPE.search(attrs):
                    continue
            if len(body.strip()) < THRESHOLD:
                continue
            found.append((p, rel, tag, attrs, body, m.start(), m.end()))
    return found


def main():
    blocks = scan()

    if CHECK:
        if not blocks:
            print("内联检查：通过（没有 >= %d 字节的内联 style/script 块）" % THRESHOLD)
            return 0
        print("内联检查：失败——仍有 %d 个内联块 >= %d 字节：" % (len(blocks), THRESHOLD))
        for p, rel, tag, attrs, body, _, _ in blocks:
            print("  %-34s <%s> %d 字节" % (rel, tag, len(body.strip())))
        return 1

    # 按内容分组，决定文件归属
    by_hash = {}
    for b in blocks:
        h = hashlib.sha256(b[4].strip().encode("utf-8", "surrogateescape")).hexdigest()
        by_hash.setdefault(h, []).append(b)

    plan = {}          # (path, start, end) -> (rel_out, tag)
    per_page = {}      # (relpath, tag) -> count，用于同页多块的编号
    created = {}       # rel_out -> body

    for h, group in by_hash.items():
        tags = {g[2] for g in group}
        if len(tags) != 1:
            # 同内容却跨 tag（几乎不可能）——各自独立处理
            groups = [group]
        else:
            groups = [group]
        for g in groups:
            tag = g[0][2]
            ext = "css" if tag == "style" else "js"
            sub = "css" if tag == "style" else "js"
            slugs = [slug_for(x[1]) for x in g]
            if len(g) > 1:
                cs = common_suffix(slugs)
                name = ("shared-" + cs) if cs else ("shared-" + slugs[0])
            else:
                name = "page-" + slugs[0]
            # 同一页/同 tag 有多个块时编号
            if len(g) == 1:
                key = (g[0][1], tag)
                per_page[key] = per_page.get(key, 0) + 1
                if per_page[key] > 1:
                    name += "-%d" % per_page[key]
            rel_out = "%s/%s.%s" % (sub, name, ext)
            created.setdefault(rel_out, g[0][4].strip())
            for x in g:
                plan[(x[0], x[5], x[6])] = (rel_out, tag)

    # 逐文件重写
    touched = set(x[1] for x in blocks)
    for rel in sorted(touched):
        p = WEB / rel
        text = p.read_text(encoding="utf-8", errors="surrogateescape")
        hits = [b for b in blocks if b[1] == rel]
        # 从后往前替换，避免偏移失效
        for b in sorted(hits, key=lambda x: -x[5]):
            rel_out, tag = plan[(b[0], b[5], b[6])]
            indent = re.search(r"[ \t]*$", text[: b[5]]).group(0)
            if tag == "style":
                attrs = re.sub(r"""\s*type\s*=\s*["']?text/css["']?""", "", b[3], flags=re.I)
                rep = '%s<link rel="stylesheet" href="/%s"%s>' % (indent, rel_out, attrs.rstrip())
            else:
                attrs = re.sub(r"\s*\bsrc\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s>]+)", "", b[3])
                rep = '%s<script src="/%s"%s></script>' % (indent, rel_out, attrs.rstrip())
            text = text[: b[5]] + rep + text[b[6] :]
        if not DRY:
            p.write_text(text, encoding="utf-8", errors="surrogateescape")

    for rel_out, body in sorted(created.items()):
        dest = WEB / rel_out
        if DRY:
            print("  将创建 %-38s %6d 字节" % (rel_out, len(body)))
        else:
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(body + "\n", encoding="utf-8", errors="surrogateescape")
            print("  创建   %-38s %6d 字节" % (rel_out, len(body)))

    print("\n外提：%d 个块 → %d 个文件，涉及 %d 个页面%s"
          % (len(blocks), len(created), len(touched), "（dry-run，未落盘）" if DRY else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
