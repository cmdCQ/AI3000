# -*- coding: utf-8 -*-
"""
ai3000 向量库瘦身：按「只留与主要占法有关的书籍」剔除。

在容器内运行：
    docker exec ai3000-rag python3 /tmp/curate_vector_db.py --dry-run
    docker exec ai3000-rag python3 /tmp/curate_vector_db.py

三件事：
  1. 删掉整个 mingli_xiangshu（相术，本站无相术体系）和 mingli_general（现存内容全是杂占）
  2. 删掉 mingli_test（测试残留）
  3. 从 mingli_liuyao 里按 book_name 删掉「误入的易学注疏」+「杂占」

保留：六爻 / 梅花 / 八字 / 奇门 / 六壬 / 风水。

—— 判定依据（用户 2026-09-25 决定）——
「杂占书根本没必要入库，只需要主要占法有关的书籍」
「只清相术，留六壬和风水」

原文全部在 MySQL reference_books.content 里，status 改成 pending 即可重新入库，
所以本操作可逆，不是数据销毁。
"""
import sys

import chromadb

DRY = "--dry-run" in sys.argv
DB = "/app/vector_db"

# ── 整集合删除 ────────────────────────────────────────────────
DROP_COLLECTIONS = {
    "xiangshu": "相术：本站无相术体系（12 部，用户决定清出）",
    "general": "通用库现存内容全是杂占（解梦/预言/签占/符咒/拟易），无一属占法",
    "yijing": (
        "易经库定位是「六爻/梅花的共享底座」，调用方确实都传了 yijing，"
        "但库里只有 1 条测试垃圾（《test》测试内容。）——它看着像 bug 的强制追加其实是有意设计，"
        "坏的是底座是空的。象数/筮法类易学（京氏易传、周易古占法、易筮通变等 11 部）"
        "保留在 mingli_liuyao 里，六爻检索经 ['liuyao','yijing'] 仍可达"
    ),
    "test": "测试残留 1 条",
}

# ── 按书名从 mingli_liuyao 删除 ───────────────────────────────
# (A) 易类注疏：经学/小学/纬书，不涉占法。故意放宽保留，只删这些。
DELETE_YIJING = [
    "三易备遗", "丙子学易编", "乾坤凿度", "了斋易说", "南轩易说", "卦变考略", "古周易",
    "启蒙意见", "吴园周易解", "吴园易解", "周易举正", "周易卦爻经传训解", "周易图说",
    "周易干凿度", "周易易简说", "周易札记（明逯中立）", "周易札记（清杨名时）",
    "周易略例", "周易稗疏", "周易章句外编", "周易通论", "周易郑康成注", "周易音义",
    "增补郑氏周易", "复斋易说", "学易初津", "推易始末", "新本郑氏周易", "易传灯",
    "易例", "易图说", "易图通变", "易学变通", "易学启蒙小传", "易学滥觞", "易学辨惑",
    "易小帖", "易汉学", "易璇玑", "易童子问", "易纂言外翼洛书说",
    "易纬乾元序制记", "易纬坤灵图", "易纬是类谋", "易纬略义", "易纬稽览图",
    "易纬辨终备", "易纬通卦验", "易经衷论", "易裨传", "温公易说", "读易举要",
    "读易余言", "读易私言", "读易考原", "赵氏易说", "陆氏易解",
]

# (B) 杂占：与任何主要占法体系无关的民间占术
#     慎删原则：只删「一看内容就确定非占法」的。原文都在 MySQL，事后删容易，
#     误删占法书才是真损失——本名单已因此退回 3 本（见下方 RESCUED）。
DELETE_ZAZHAN = [
    "灵棋经",       # 掷十二子成卦，独立民间占术，非六爻/梅花体系
    "秘本诸葛神数", # 384 签的签占
    "正易心法",     # 麻衣道者撰陈抟注，义理/出世心法，不涉占法
]

# 曾被误判为杂占、经查内容后**保留**的六爻/占法书（记在这里防止以后再误删）
RESCUED = [
    "大易断例卜筮元龟目",  # 元·萧吉文《大易断例卜筮元龟》1307：揲蓍法/以钱代蓍法/
                          # 六爻支变断例/八卦纳甲/飞伏神决/推卦内世应所在法/推八节旺废例
                          # ——正经六爻断卦书，且「飞伏神/旺废」正是 ai3000 缺的那层
    "文王金钱课",          # 内容即「诸爻持事诀」：世爻旺相/用神生合/空破刑冲，六爻持世诀
    "断易鬼灵经",          # 纳甲八卦爻断（宅/鬼祟应用），属六爻技术，非杂占
]

DELETE_FROM_LIUYAO = DELETE_YIJING + DELETE_ZAZHAN

# ── 从 mingli_meihua 剔除「挂邵雍之名、无一条断卦规则」的宇宙论著作 ──
# 判定依据：直接在 content 里数关键词（2026-09-25 实测）——
#   梅花易数          体用 95 / 互卦 28 / 动爻 10 / 起卦 27
#   皇极经世          体用  0 / 互卦  0 / 动爻  0 / 起卦  0   ← 元会运世历数
#   皇极经世书        体用  8 / 互卦  0 / 动爻  0 / 起卦  0   ← 观物内篇，哲学
#   观物外篇衍义      体用  1 / 互卦  0 / 动爻  0 / 起卦  0   ← 数理哲学
#   皇极经世心易发微  体用  9 / 互卦  2 / 动爻  4 / 起卦  4   ← 确有心易断法，保留
# 删掉这三部后 mingli_meihua 从 514 → 164 chunks，且全部与断卦相关：
# 梅花池子小、每类只取 max(1,min(top_k,3)) 个名额，被 350 条宇宙论占位是实打实的稀释。
DELETE_MEIHUA = ["皇极经世", "皇极经世书", "皇极经世观物外篇衍义"]

# 集合名 → 要按 book_name 删掉的书
PURGE = {
    "mingli_liuyao": DELETE_FROM_LIUYAO,
    "mingli_meihua": DELETE_MEIHUA,
}

# 保留（列出来是为了让这份脚本可审计，不会被静默改动）
KEEP_YIJING = [
    "京氏易传",        # 京房，纳甲源头——本就是占法书，只是被错分到 yijing
    "周易古占法",      # 筮法
    "易筮通变",        # 筮法
    "春秋占筮书",      # 占筮
    "易数钩隐图", "易数钩深图", "大易象数钩深图", "易象钩解", "易象意言", "易象大意存解",
    "连山易",          # 三易之一，筮书
]


def main() -> int:
    client = chromadb.PersistentClient(path=DB)

    print("=== 1) 整集合删除 ===")
    for cat, why in DROP_COLLECTIONS.items():
        name = f"mingli_{cat}"
        try:
            n = client.get_collection(name).count()
        except Exception:
            print(f"  {name}: 不存在，跳过")
            continue
        if DRY:
            print(f"  [dry] {name}: 将删除 {n} chunks —— {why}")
        else:
            client.delete_collection(name)
            print(f"  {name}: 已删除 {n} chunks —— {why}")

    from collections import Counter

    print("\n=== 2) 按 book_name 从各集合删除 ===")
    for cname, titles in PURGE.items():
        try:
            col = client.get_collection(cname)
        except Exception:
            print(f"  {cname}: 不存在，跳过")
            continue
        before = col.count()
        # 先只统计，不删（dry-run 与实际删除共用这一步）
        got = col.get(include=["metadatas"])
        names = [m.get("book_name", "") for m in got["metadatas"]]
        hit = [n for n in names if n in set(titles)]
        print(f"\n  {cname}: 当前 {before} chunks；命中待删 {len(hit)} chunks，涉及 {len(set(hit))} 本书")

        if DRY:
            for book, n in Counter(hit).most_common():
                print(f"    [dry] {book}: {n}")
            continue

        # $in 过滤；个别 ChromaDB 版本不支持则逐本删
        try:
            col.delete(where={"book_name": {"$in": titles}})
        except Exception as e:
            print(f"  $in 过滤失败({e})，改为逐本删除")
            for book in titles:
                try:
                    col.delete(where={"book_name": book})
                except Exception as e2:
                    print(f"    {book}: {e2}")

        after = col.count()
        print(f"  {cname}: {before} → {after}（删掉 {before - after}）")

    if DRY:
        print("\n(dry-run，未改动任何数据)")
        return 0

    print("\n=== 3) 收尾：各集合现状 ===")
    total = 0
    for c in sorted(client.list_collections(), key=lambda x: x.name):
        try:
            n = c.count()
        except Exception:
            n = -1
        total += max(n, 0)
        print(f"  {c.name:22s} {n}")
    print(f"  {'合计':22s} {total}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
