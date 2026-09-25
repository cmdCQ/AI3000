#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""对拍 · 比对：八字解读 prompt（3.5.4c 变量表 + 默认模板）。

两侧输入逐字相同（金标准的 `cases[i].in` 就是双方共用的输入，JS 侧照读），
故**没有申报表、没有分桶**：有差异就是实现不同。

  ⓪ 闸门 —— 家族契约、每家族每输出的**形状集**、条数。
     `pm` 里基准会抛，那时 `prompt` 是 `None` —— 形状集里因此有 `["<null>"]`
     这一档，而「抛没抛/抛的哪一类」由 ② 的标志位逐个点名。
  ① 逐例摘要 —— 每家族每输出一份 sha256（`prompt` 与 `src` **都判**）。
  ② 逐例标志位 —— 分支指纹。**比对器从被验方产物现算**，不照抄生成器的实现。
  ③ 逐例计数 —— 同上，独立重算。
  ④ 分支谱 —— **防「空绿」**：谱一致才证明金标准本身非空、每档都真出现过。
  ⑤ 抽样深层逐字段 —— `full` 里的原例用 `diff.py::walk` 递归比到叶子。

本层**零归一**（金标准 `meta.norm` 写着理由）：没有依赖进程哈希顺序的遍历，
逐例的可用性/分支全由用例输入决定。

── 差异怎么定位（本层与层 15 最大的不同）──
产物是**一整条长字符串**，逐字段 walk 定不到「哪一段不同」。故 `show_case` 分三步：
  1. 先比 **输入快照 `src`**：若它也不同，差异在**上游**（层 8–15），本层立刻退出定位
     （避免跑到 `bazi_prompt.js` 里查一个不属于它的 bug —— 那是**假红**的根源）。
  2. `src` 相同 → 比 **JSON 块**（表头之后到第一个空行），报首个不同的位置与两侧上下文。
  3. 再比**尾部**（`\\n\\n请按步骤深度分析：` 之后），并用**被验方自报**的变量表
     `aux.vars` 里的五段文本逐个问「金标准里到底有没有这一段」——
     ⚠ 自报材料**只用于显示**，不进任何判据（让被验方定义契约是本项目反复警告的坑）。

用法：
    /home/cqsomt/Projects/shushu/.venv/bin/python diff_bazi_prompt.py [golden.json] [js.json]
退出码：0 = 全同，2 = 有差异。
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "shushu"))   # 差异明细要就地重算 shushu 侧
sys.path.insert(0, str(HERE))

from diff import walk                                                    # noqa: E402
from norm_bazi_patterns import norm_deep                                 # noqa: E402

# ⚠⚠ 雜氣月令归一：**与金标准生成器共用同一份实现**（`duipan/norm_bazi_patterns.py`）。
#   这不是「独立重算」的对象，而是两侧**共享的定义**（同 `FAMILIES`/段名的地位）：
#   基准 shushu 那边 `list(set([...]))` 的顺序随进程哈希种子变（实测 6 进程 3:3），
#   所以「原样比」比的是一个随机变量。两侧同过一份归一，剩下的差异才是真差异。
#   第二份实现只会多一个「错得一样才看不出来」的漂移点。
NORM = "雜氣月令十神串两侧同归一（duipan/norm_bazi_patterns.py，gen 与 diff 共用一份）"

GOLDEN = HERE / "golden_bazi_prompt.json"
JS = HERE / "js_bazi_prompt.json"
MAX_SHOW = 5
TAIL_MARK = "\n\n请按步骤深度分析："

# ⚠ 比对器**自己**写死一份契约，不从金标准读：读金标准就等于让被验方定义契约。
FAMILIES = {"pv": ["prompt", "src"], "pm": ["prompt", "src", "err"]}

SRC_KEYS = [
    "year_pillar", "month_pillar", "day_pillar", "hour_pillar", "day_master",
    "_gender", "day_master_wuxing", "strength", "strength_info", "day_master_profile",
    "yong_shen", "shensha", "pattern", "pattern_desc", "dayun", "analysis", "advice",
    "taiyuan", "minggong", "shengong", "shishen_summary", "current_fortune",
    "overview", "mingju_synthesis", "master_synthesis", "life_aspects",
    "relations", "special_patterns", "combos",
]

SEG_NAMES = ["overviewText", "classicalText", "relationsText",
             "specialPatternsText", "combosText"]


def canon(obj):
    """与金标准生成器**同一个**规范化实现（算法写在金标准 meta.canon 里）。"""
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


# ── ② 的实现：与生成器**各写一份**（独立重算，互为对照）──
#
# ⚠⚠ 「独立重算」= 独立**写实现**，不是独立**定义契约**。段名、段序、段内编码是
#   两侧**共享的约定** —— 它们不是被验对象，而是比对能成立的前提。层 15 第一版把
#   `sy` 的 `score` 段放错位置，于是 **180 例「差异」** 全是段序不同造成的假红
#   （值一个不差）。这种假红比漏检更费时间：它会让人去查算法，而问题在字符串拼接顺序。
#   改段名/段序必须**同时**改 `gen_golden_bazi_prompt.py::MARKS`。
#
# 每个段名对应基准里一句可验证的拼接（括号里是它出自哪一行）：
#   ov  【命局总论…】:1492      cls 【古籍参考】:1502（RAG 注入的表头）
#   chk 【《穷通宝鉴》调候】:1513   dt  【《滴天髓》X干】:1515
#   zy  【任铁樵注】:1528        ge  【X成格】/【X破格】:1531/1533
#   yun 【X行运】:1535           rel 【地支刑冲合害】relations.py:552/554
#   sp  【特殊格局深度识别】special_patterns.py:527
#   cb  【格局成破评断】:1572     cb2 【神煞组合】:1574
#   asp 「{方面}专项分析」:1485   ty  胎元/命宫/身宫:1446
#   ss  「十神分布」:1453        cf  「当前运程」:1462   ms 「命局总断」:1472
#   trunc JSON 块被 2000 字截断（`j(ctx)` 的 `[:2000] + "…"`）
MARKS = [
    ("ov", "【命局总论（已综合，请在此基础上深化）】"),
    ("cls", "【古籍参考】"),
    ("chk", "【《穷通宝鉴》调候】"),
    ("dt", "【《滴天髓》"),
    ("zy", "【任铁樵注】"),
    ("yun", "行运】"),
    ("rel", "【地支刑冲合害】"),
    ("sp", "【特殊格局深度识别】"),
    ("cb", "【格局成破评断】"),
    ("cb2", "【神煞组合】"),
    ("asp", "专项分析"),
    ("ty", "胎元"),
    ("ss", "十神分布"),
    ("cf", "当前运程"),
    ("ms", "命局总断"),
]
GE_MARKS = ("成格】", "破格】")


def ctx_block(prompt):
    """JSON 块 = 表头行之后到**第一个空行**之前（与生成器同规则的**另一份实现**）。

    ⚠ 不看表头文字：`tab` 在基准里是 `extra_context or "综合"`（`""` 退成「综合」）。
    """
    head, _, rest = prompt.partition("\n")
    if not head.startswith("八字命盘（"):
        raise AssertionError(f"表头不是「八字命盘（」：{head[:20]!r}")
    if not rest:
        raise AssertionError("prompt 没有表头行")
    return rest.split("\n\n", 1)[0]


def flag_of(kind, out):
    if out.get("err"):
        return "err=" + out["err"]
    p = out.get("prompt")
    if p is None:
        # `pv` 的契约里没有 `err`：被验方抛了就只能落在这里 —— 独立的一档，
        # 谱里会与金标准的 `nm…` 档对不上，当场报红。
        return "prompt=null"
    seg = [f"{n}=" + ("1" if mk in p else "0") for n, mk in MARKS]
    seg.append("ge=" + ("1" if (GE_MARKS[0] in p or GE_MARKS[1] in p) else "0"))
    seg.append("trunc=" + ("1" if ctx_block(p).endswith("…") else "0"))
    seg.append("nmiss=" + str(sum(1 for k in SRC_KEYS if out["src"][k][0] == 0)))
    return "|".join(seg)


# ⚠ 与生成器的 `count_of` 是**同一个契约**：字符串长度一律**码位**。
#   Python `len` 就是码位；JS 侧必须 `[...s].length` 才是码位（`.length` 是 UTF-16 单元数）。
#   `trunc-nonbmp`（𠮷 × 900）那条用例专门盯这条线：按 UTF-16 数会**多 900**。
def count_of(kind, out):
    nmiss = sum(1 for k in SRC_KEYS if out["src"][k][0] == 0)
    if out.get("err") or out.get("prompt") is None:
        return [-1, -1, -1, nmiss]
    cb = ctx_block(out["prompt"])
    return [len(out["prompt"]), len(cb), 1 if cb.endswith("…") else 0, nmiss]


def _brief(v, n=60):
    """给差异明细用的短回显（长字符串截断，保留类型感）。"""
    s = canon(v)
    return s if len(s) <= n else s[:n] + f"…(+{len(s) - n})"


def show_case(c, js, aux):
    """就地对**这一例**重算基准，再按三步定位（见文件头）。"""
    from gen_golden_bazi_prompt import run_case as py_run                  # noqa: E402

    py = norm_deep(py_run(c))          # 与金标准同过一份归一（否则定位会被抖动串带偏）
    js = norm_deep(js)
    aux = norm_deep(aux)
    i = c["in"]
    print(f"   [{c['kind']}/{c['id']}] tab={i['tab']!r}"
          + (f"  note={i.get('note')}" if i.get("note") else ""))

    if py.get("err") or js.get("err") or py.get("prompt") is None or js.get("prompt") is None:
        print(f"      抛没抛：金标准={py.get('err') or ('ok' if py.get('prompt') else 'null')!r}"
              f"  被验={js.get('err') or ('ok' if js.get('prompt') else 'null')!r}")
        return

    # ① 输入快照：不同 → 差异在上游，本层不背这个锅
    bad = [k for k in SRC_KEYS if canon(py["src"][k]) != canon(js["src"][k])]
    if bad:
        print(f"      ⚠ 输入快照就差 {len(bad)} 键 → 差异在**上游**（层 8–15），不在本层：")
        for k in bad[:6]:
            print(f"         {k}: 金标准={_brief(py['src'][k])}  被验={_brief(js['src'][k])}")
        return

    # ② JSON 块
    pa, pb = py["prompt"], js["prompt"]
    ca, cb = ctx_block(pa), ctx_block(pb)
    same = "同" if ca == cb else "✗ 不同"
    print(f"      JSON 块：金标准 {len(ca)} 码位 / 被验 {len(cb)} 码位  {same}")
    if ca != cb:
        i0 = next((k for k, (x, y) in enumerate(zip(ca, cb)) if x != y),
                  min(len(ca), len(cb)))
        print(f"         首个不同在第 {i0} 位：")
        print(f"           金标准 …{ca[max(0, i0 - 25):i0 + 25]!r}…")
        print(f"           被验   …{cb[max(0, i0 - 25):i0 + 25]!r}…")

    # ③ 尾部
    if TAIL_MARK in pa and TAIL_MARK in pb:
        ta = pa.split(TAIL_MARK, 1)[1]
        tb = pb.split(TAIL_MARK, 1)[1]
        print(f"      尾部：{'同' if ta == tb else '✗ 不同'}"
              + ("" if ta == tb else f"\n         金标准={_brief(ta)}\n         被验  ={_brief(tb)}"))
    else:
        print(f"      尾部：金标准{'有' if TAIL_MARK in pa else '**没有**'}「请按步骤深度分析」"
              f"  被验{'有' if TAIL_MARK in pb else '**没有**'}")

    # ④ 五段正文：用**被验方自报**的变量表逐个问「金标准里有没有」（只显示，不判）
    #
    # ⚠ 前三步都报「同」而整串仍不同 ⇒ 差异只能在**五段正文里**。
    #   而「某段在不在」是个**只判在场**的粗检查 —— 段在、段的内容不同，它照样说「有」。
    #   实测就是如此：JSON 块与尾部全同、五段都在，差异却全在正文内（渲染时的占位符展开）。
    #   故这里补上**段内定位**：报整串首个不同的码位 + 落在哪一段（段名来自 `aux`，只显示）。
    if pa != pb:
        i0 = next((k2 for k2, (x, y) in enumerate(zip(pa, pb)) if x != y),
                  min(len(pa), len(pb)))
        who = ""
        if aux:
            for name in SEG_NAMES:                     # 段名从 aux 取，仅用于命名
                seg = aux.get(name) or ""
                p0 = pa.find(seg) if seg else -1
                if p0 >= 0 and p0 <= i0 < p0 + len(seg):
                    who = f"（落在 {name} 段内，段首在第 {p0} 码位）"
                    break
        print(f"      段内首个不同在第 {i0} 码位{who}：")
        print(f"         金标准 …{pa[max(0, i0 - 40):i0 + 60]!r}…")
        print(f"         被验   …{pb[max(0, i0 - 40):i0 + 60]!r}…")

    if not aux:
        print("      （本案没有 aux.vars 自报材料）")
        return
    for name in SEG_NAMES:
        seg = aux.get(name) or ""
        if not seg:
            print(f"      {name:<20} 自报为空")
        else:
            print(f"      {name:<20} 金标准里{'有' if seg in pa else '**没有**'}"
                  f"（自报 {len(seg)} 码位）")


def main() -> int:
    gp = Path(sys.argv[1]) if len(sys.argv) > 1 else GOLDEN
    jp = Path(sys.argv[2]) if len(sys.argv) > 2 else JS
    g = json.loads(gp.read_text(encoding="utf-8"))
    j = json.loads(jp.read_text(encoding="utf-8"))

    cases, n = g["cases"], len(g["cases"])
    assert n == g["meta"]["n_cases"], "金标准自身长度不一致"
    problems = []

    # ── ⓪ 闸门 ──
    if j.get("schema", {}).get("families") != g["meta"]["families"]:
        print(f"✗ 闸门 家族契约不一致：\n   金标准 {g['meta']['families']}\n"
              f"   被验   {j.get('schema', {}).get('families')}")
        return 2
    for k, m in g["meta"]["shapes"].items():
        jm = j.get("shapes", {}).get(k)
        if jm != m:
            print(f"✗ 闸门 家族 {k} 的形状集不一致：\n   金标准 {m}\n   被验   {jm}")
            return 2
    for k, want in g["meta"]["kinds"].items():
        got = len(j.get("outs", {}).get(k, []))
        if got != want:
            problems.append(f"家族 {k}：JS 出 {got} 例，金标准 {want} 例")
    if problems:
        for p in problems:
            print(f"✗ 闸门未过：{p}")
        return 2
    print(f"── 闸门：{len(FAMILIES)} 家族契约一致；形状集一致（"
          + " · ".join(f"{k} " + ",".join(f"{o}×{len(v)}" for o, v in m.items())
                       for k, m in g["meta"]["shapes"].items()) + "）")

    # 逐例：金标准按 kind 顺序排列，JS 侧按 kind 分桶 —— 对齐两边的下标
    pos, slot = [], {}
    for idx, c in enumerate(cases):
        k = c["kind"]
        m = slot.get(k, 0)
        slot[k] = m + 1
        pos.append((k, m))

    # ── ① 摘要 ② 标志位 ③ 计数 ──
    bad_dig, bad_flag, bad_cnt, bad_src = [], [], [], []
    hist = {}
    for idx, c in enumerate(cases):
        k, m = pos[idx]
        js = norm_deep(j["outs"][k][m])          # 见 `NORM`：与金标准同过一份归一
        if [sha(canon(js[o])) for o in FAMILIES[k]] != g["digest"][str(idx)]:
            bad_dig.append(idx)
            # 差异是「输入就不同（上游）」还是「提示词层不同（本层）」？
            # `src` 的摘要就在金标准 `digest` 里（`FAMILIES` 的顺序即摘要顺序），
            # 故**不必重跑基准**就能分类：比一次 sha 即可。
            j_src = sha(canon(js["src"]))
            if j_src != g["digest"][str(idx)][FAMILIES[k].index("src")]:
                bad_src.append(idx)
        f = flag_of(k, js)
        if f != g["flags"][idx]:
            bad_flag.append(idx)
        if count_of(k, js) != g["counts"][idx]:
            bad_cnt.append(idx)
        hist.setdefault(k, {})
        hist[k][f] = hist[k].get(f, 0) + 1

    print(f"── ① 逐例摘要（{n} 例 · "
          f"{sum(len(v) for v in FAMILIES.values())} 个输出对象 · `prompt` 与 `src` 都判）："
          f"差异 {len(bad_dig)} 例")
    print(f"── ② 逐例标志位（比对器独立重算）：差异 {len(bad_flag)} 例")
    print(f"── ③ 逐例计数（比对器独立重算）：差异 {len(bad_cnt)} 例")
    print(f"   · 其中**输入快照就不同**（→ 差异在上游，不在本层）的：{len(bad_src)} 例")

    # ── ④ 分支谱（防空绿）──
    print("── ④ 分支谱（防空绿：谱同才证明每档都真出现过）")
    for k in sorted(hist):
        if hist[k] != g["hist"][k]:
            problems.append(f"谱「{k}」不一致：\n     金标准 {sorted(g['hist'][k].items())}\n"
                            f"     被验   {sorted(hist[k].items())}")
        else:
            print(f"   {k:<5} 全同 {len(hist[k])} 种分支码")

    # ── ⑤ 抽样深层逐字段 ──
    stride = g["meta"]["full_stride"]
    print(f"── ⑤ 抽样深层逐字段（{len(g['full'])} 例，步长 {stride}）")
    bad_full = []
    for row in g["full"]:
        idx = row["idx"]
        k, m = pos[idx]
        js = norm_deep(j["outs"][k][m])          # 见 `NORM`：与金标准同过一份归一
        out = []
        for name in FAMILIES[k]:
            # 金标准 `full` 里存的是**已归一**的产物，故这里也过一遍（幂等）
            walk(norm_deep(row["out"][name]), js[name], name, out, {})
        if out:
            bad_full.append((idx, out))
    print(f"   差异 {len(bad_full)} 例")

    for name, bad in (("①摘要", bad_dig), ("②标志位", bad_flag), ("③计数", bad_cnt)):
        if bad:
            problems.append(f"{name} 有 {len(bad)} 例不同：索引 {bad[:8]}"
                            f"{' …' if len(bad) > 8 else ''}")

    if bad_dig or bad_flag or bad_cnt:
        print()
        print(f"── 差异明细（前 {MAX_SHOW} 例，就地对同一例重算基准并定位）")
        # 就地重算需要那 52 张盘（`run_case` 按生辰缓存）。只有真出现差异时才付这笔钱。
        import gen_golden_bazi_prompt as G                                   # noqa: E402
        if not G._CHART_CACHE:
            G.build_cases()
        seen = []
        for i in (bad_dig + bad_flag + bad_cnt):
            if i not in seen:
                seen.append(i)
        for idx in seen[:MAX_SHOW]:
            k, m = pos[idx]
            show_case(cases[idx], j["outs"][k][m], (j.get("aux") or {}).get(k, [None] * (m + 1))[m])

    if bad_full:
        print()
        print("── 抽样深层差异明细（本层产物是长字符串，定位请看上面的三步法）")
        for idx, out in bad_full[:MAX_SHOW]:
            print(f"   [{idx}] {cases[idx]['kind']}/{cases[idx]['id']}")
            for p, x, y, _ in out[:8]:
                print(f"     {p or '<根>'}：金标准={_brief(x)}  被验={_brief(y)}")

    if problems:
        print()
        for p in problems:
            print(f"✗ {p}")
        return 2

    print()
    print(f"✓ {n} 例逐例比对：①摘要（prompt + src）②标志位 ③计数 全同")
    print(f"✓ {len(FAMILIES)} 组分支谱全同（防空绿）"
          f" + 抽样 {len(g['full'])} 例**深层逐字段**比对")
    print("✓ 零申报（本层输入两侧逐字相同）")
    print(f"✓ {NORM}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
