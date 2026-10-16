#!/usr/bin/env python3
r"""给 build/nginx 里的静态资源引用打上内容哈希版本号：`?v=<sha256 前 8 位>`。

## 为什么需要这一步

没有版本号就没法给静态资源设长缓存：内容变了 URL 不变，用户就一直拿到旧的。
反过来，靠人（或 AI）手写 `?v=` 完全靠不住 —— 2026-10-16 清理前，仓库里有 58 处
手工版本号、12 种互不相干的值、三种互不兼容的风格：

    ?v=1787305221  ?v=4  ?v=1  ?v=20  ?v=1749664000  ?v=（auth.js 里是 Date.now()）

`?v=4` 这一处模型在各个页面里重复了 11 次；charts-store.js 一变，11 个地方都得
手动改。这就是「约束不写进文件就等于不存在」的典型：规则只在人脑子里。

改成自动算之后，URL 永远跟着内容走，人也就不需要记得任何事。

## 做什么

1. 扫 `build/nginx` 下所有非 HTML 文件，算 sha256 前 8 位，建「路径 → 哈希」表。
2. 把 HTML/JS/CSS 里**整条引号字符串就是一个资源路径**的地方替换成带哈希的版本。
   例：`href="/css/tokens.css"` → `href="/css/tokens.css?v=9f3a1c07"`
   例：`link.href = '/css/auth-modal.css'` → `... '/css/auth-modal.css?v=9f3a1c07'`
3. 因为第 2 步会改 JS/CSS 的内容（它们自己也可能嵌了别的资源哈希），
   所以整件事要**迭代到不动点**：哈希 → 改写 → 再哈希 → 再改写，直到没有变化。
   现实里 2~3 轮就收敛（本站依赖链只有 HTML → auth.js → auth-modal.css 一层）。
4. 最后做一次**独立校验**：重新算一遍哈希，确认每个 `?v=` 用的都是目标文件当前的
   哈希。对不上就退出码非 0（sync.sh 会停住），绝不放过。

## 故意不做的事

- 不改 `.html` 自己的引用之外的 HTML 内容（HTML 不参与版本化，它是 no-cache）。
- 不版本化 `/.well-known/`（ACME 校验文件必须固定路径）。
- 不碰 `/api/` 之类的动态路径 —— 它们不在文件表里，自然跳过。

## 只报错不致命的情况

引用了 `/[^"]+\.(css|js|...)` 形状、但 `build/nginx` 里根本没有这个文件：
- 要么是路径写错了（chouxiang 就是：它引 `/styles.css`，文件却在 `/chouxiang/styles.css`）
- 要么是 JS 里拼出来的 URL，本脚本覆盖不到
两种都必须让人看见，所以打印警告并列出，但不中断同步（已知的 chouxiang 是既存问题）。
"""

from __future__ import annotations

import hashlib
import re
import sys
from pathlib import Path

# 参与版本化的文件扩展名（都是「内容变了就该换 URL」的静态资产）
ASSET_EXTS = {
    "css", "js", "mjs",
    "svg", "png", "jpg", "jpeg", "webp", "gif", "ico", "avif",
    "woff", "woff2", "ttf", "otf", "eot",
    "mp3", "mp4", "webm", "lrc",
    "json", "webmanifest",
}
# 需要被改写的文本文件
TEXT_EXTS = {".html", ".js", ".mjs", ".css"}
# 永不版本化（路径必须稳定）
NEVER = ("/.well-known/",)

# 整条引号字符串 = 一个本地资源路径（可带已有 query）。三种引号都认。
REF_RE = re.compile(
    r"""(?P<q>["'`])"""          # 开引号
    r"""(?P<path>/[^"'`\s?#]*)"""  # 绝对路径（不含引号/空白/?#）
    r"""\.(?P<ext>[A-Za-z0-9]+)"""  # 扩展名
    r"""(?:\?[^"'`\s]*)?"""      # 吃掉已有的 query（?v=xxx 之类）
    r"""(?P=q)"""                # 同一个引号收尾
)


def sha8(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()[:8]


def build_map(root: Path) -> dict[str, str]:
    """路径（以 / 开头，对应 URL）→ 内容哈希前 8 位。"""
    out: dict[str, str] = {}
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        if p.suffix.lstrip(".").lower() not in ASSET_EXTS:
            continue
        url = "/" + p.relative_to(root).as_posix()
        if any(url.startswith(n) for n in NEVER):
            continue
        out[url] = sha8(p.read_bytes())
    return out


def rewrite_round(root: Path, vmap: dict[str, str]) -> tuple[int, set[str]]:
    """把所有文本文件里的资源引用改写成带哈希的形状。返回（改了几处，改了哪些文件）。"""
    changed = 0
    touched: set[str] = set()
    for p in sorted(root.rglob("*")):
        if not p.is_file() or p.suffix.lower() not in TEXT_EXTS:
            continue
        try:
            txt = p.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue  # 二进制/非 UTF-8 不动

        def sub(m: re.Match[str]) -> str:
            nonlocal changed
            path = m.group("path") + "." + m.group("ext")
            if path not in vmap:
                return m.group(0)  # 文件不存在 / 不是资源 → 原样留下
            new = f"{m.group('q')}{path}?v={vmap[path]}{m.group('q')}"
            if new != m.group(0):
                changed += 1
                touched.add(str(p.relative_to(root)))
            return new

        new_txt = REF_RE.sub(sub, txt)
        if new_txt != txt:
            p.write_text(new_txt, encoding="utf-8")
    return changed, touched


def verify(root: Path) -> list[str]:
    """独立复核：每个 ?v= 是否等于目标文件当前的哈希。"""
    vmap = build_map(root)
    bad: list[str] = []
    ver_re = re.compile(r"(?P<q>[\"'\`])(?P<path>/[^\"'\`\s?#]*\.(?P<ext>[A-Za-z0-9]+))\?v=(?P<h>[0-9a-f]{8})(?P=q)")
    for p in sorted(root.rglob("*")):
        if not p.is_file() or p.suffix.lower() not in TEXT_EXTS:
            continue
        try:
            txt = p.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        rel = p.relative_to(root)
        for m in ver_re.finditer(txt):
            path, h = m.group("path"), m.group("h")
            if path not in vmap:
                bad.append(f"{rel}: {path} 引用了不存在的文件（?v={h}）")
            elif vmap[path] != h:
                bad.append(f"{rel}: {path} 的 ?v={h} 与实际内容 {vmap[path]} 不符")
    return bad


def dangling(root: Path) -> list[str]:
    """形如资源引用、但 build/nginx 里没有对应文件的路径（去重）。"""
    vmap = build_map(root)
    miss: dict[str, set[str]] = {}
    for p in sorted(root.rglob("*")):
        if not p.is_file() or p.suffix.lower() not in TEXT_EXTS:
            continue
        try:
            txt = p.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for m in REF_RE.finditer(txt):
            path = m.group("path") + "." + m.group("ext")
            if path in vmap or any(path.startswith(n) for n in NEVER):
                continue
            # 只报像静态资产的（排除 /api/xxx.json 这种接口路径）
            if m.group("ext").lower() not in ASSET_EXTS:
                continue
            if path.startswith("/api/"):
                continue
            miss.setdefault(path, set()).add(str(p.relative_to(root)))
    return [f"{k}  ← 被 {', '.join(sorted(v))} 引用" for k, v in sorted(miss.items())]


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "build/nginx")
    if not root.is_dir():
        print(f"version-assets: 目录不存在：{root}", file=sys.stderr)
        return 2

    rounds = 0
    total = 0
    last_touched: set[str] = set()
    for _ in range(6):
        rounds += 1
        vmap = build_map(root)
        changed, touched = rewrite_round(root, vmap)
        total += changed
        if changed:
            last_touched = touched
        if changed == 0:
            break
    else:
        print("version-assets: ✗ 6 轮仍未收敛（依赖成环？）", file=sys.stderr)
        return 3

    n_assets = len(build_map(root))
    print(f"  版本化：{n_assets} 个静态资产，{rounds} 轮收敛，共改写 {total} 处引用"
          + (f"（涉及 {len(last_touched)} 个文件）" if last_touched else ""))

    bad = verify(root)
    if bad:
        print("version-assets: ✗ 复核失败：", file=sys.stderr)
        for b in bad:
            print("    " + b, file=sys.stderr)
        return 1

    miss = dangling(root)
    if miss:
        print(f"  ⚠ 警告：{len(miss)} 个静态资源引用在产物里找不到对应文件（未加版本号，会 404）：")
        for m in miss:
            print("      " + m)
    return 0


if __name__ == "__main__":
    sys.exit(main())
