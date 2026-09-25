# -*- coding: utf-8 -*-
"""对拍 · **覆盖度断言**（层 7：梅花）。

对拍全绿只说明「跑到的那些没差」。某分支一次都没跑到，它绿不绿都没有信息量。
故每条断言都要求**某个取值真的出现过**，不满足即失败。

三类检查：

  ① 覆盖（防空绿）—— 每个分支都有实例被跑到。
  ② 不可达 —— 结构上取不到的分支必须**从未出现**，且「取不到」本身要有**实跑**
     证据（`probe_meihua.js` 直调把防御分支走一遍），不能只写一句「显然不可达」。
  ③ 独立核对 —— 拿**另一条来源**验被验方自己的表。这些表若只在「本层对拍」里
     出现，就是自己验自己：
       · `HEX64_MAP` / `getHexName` ↔ 前端语料 `hexagrams_data.js`（源 cast64.com）
       · `strokes.js` ↔ shushu `core/meihua/strokes.py`（本表是机械转写自它，故须逐字相等）

关于卦名：金标准侧把 `gua.*.name` 排除在外（shushu 用文王卦序单名「恒」、本项目用
通行全名「雷风恒」，两套命名约定必然逐例不同，而铁律 2 说身份看上下卦号不看卦名）。
排除的代价是 64 个全名不再被本层对拍覆盖 —— 由上面的 ③ 补上。

**须用 shushu 的 venv python 跑**（只为 ③ 里读 `core.meihua.strokes` 的表）：
    /home/cqsomt/Projects/shushu/.venv/bin/python coverage_meihua.py

前置：gen_golden_meihua.py → run_js_meihua.js → probe_meihua.js（见 README「用法」）。
退出码：0 = 全部满足；1 = 有断言不满足（对拍结果不可信）。
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).parent
SHUSHU = "/home/cqsomt/Projects/shushu"

GUA_ROLES = ("main", "mutual", "changed", "opposite", "reversed")
RELATIONS = {"用生体", "体用比和", "体克用", "体生用", "用克体"}
LEVELS5 = {"大吉", "吉", "平", "凶", "大凶"}
STRENGTH_LABELS = {"旺", "相", "休", "囚", "死"}
YINGQI = {"寅卯", "巳午", "辰戌丑未", "申酉", "亥子"}


def load(name):
    p = HERE / name
    if not p.exists():
        print(f"缺 {name} —— 先跑对应的 gen/run/probe（见 README「用法」）。")
        sys.exit(2)
    return json.loads(p.read_text("utf-8"))


def main() -> int:
    g, j = load("golden_meihua.json"), load("js_meihua.json")
    p = load("probe_meihua.json")
    fails: list = []

    def check(label, ok, detail):
        print(f"  {'✅' if ok else '❌'} {label}：{detail}")
        if not ok:
            fails.append(label)

    ok = {k: v for k, v in j.items() if "__error__" not in v}
    gok = {k: v for k, v in g.items() if "__error__" not in v}
    print(f"层 7（梅花）：金标准 {len(g)} 例、被验方 {len(j)} 例，其中非错误 "
          f"{len(ok)} 例 / 错误 {len(j) - len(ok)} 例")

    # ══ ① 覆盖 ══════════════════════════════════════════════════
    print("① 覆盖：每个分支都有实例被跑到")

    check("两侧样例 id 完全一致", set(g) == set(j),
          f"仅金标准有 {len(set(g) - set(j))} 例，仅被验方有 {len(set(j) - set(g))} 例")

    mth = Counter(v["method"] for v in ok.values())
    check("三种起卦法齐全", set(mth) == {"time", "number", "character"},
          " ".join(f"{k}×{v}" for k, v in sorted(mth.items())))

    main_nums = {v["gua"]["main"]["number"] for v in ok.values()}
    check("主卦卦序 64 卦全出现", len(main_nums) == 64,
          f"{len(main_nums)}/64，缺 {sorted(set(range(1, 65)) - main_nums)}")

    combos = {(v["gua"]["main"]["upper"]["number"], v["gua"]["main"]["lower"]["number"])
              for v in ok.values()}
    check("主卦上下卦组合 8×8 全出现", len(combos) == 64, f"{len(combos)}/64")

    mov = sorted({v["moving_lines"][0] for v in ok.values()})
    check("动爻 1..6 全出现", mov == [1, 2, 3, 4, 5, 6], str(mov))
    check("三种起卦法都恒为**单**动爻（古法一卦一动）",
          all(len(v["moving_lines"]) == 1 for v in ok.values()),
          f"最多 {max(len(v['moving_lines']) for v in ok.values())} 个")

    for role in GUA_ROLES:
        n = len({v["gua"][role]["number"] for v in ok.values()})
        check(f"「{role}」卦位有实例且卦序多样", n >= 16, f"{n} 种卦序")

    # 变卦必须真的变了 —— 动爻翻错（比如翻了静爻、或没翻）会露在这里
    same = [k for k, v in ok.items() if v["gua"]["changed"]["number"] == v["gua"]["main"]["number"]]
    check("变卦恒与本卦不同（动爻真的翻了）", not same, f"{len(same)} 例相同")

    for label, key in (("体用", "ti_yong"), ("互卦", "mutual"), ("变卦", "changed")):
        r = Counter(v["relations"][key]["relation"] for v in ok.values())
        check(f"{label}五关系齐全", set(r) == RELATIONS,
              " ".join(f"{k}×{v}" for k, v in sorted(r.items())))

    for fld, want in (("main_level", LEVELS5), ("verdict", LEVELS5)):
        c = Counter(v[fld] for v in ok.values())
        check(f"{fld} 五档齐全", set(c) == want,
              " ".join(f"{k}×{v}" for k, v in sorted(c.items())))
    sc = sorted({v["score"] for v in ok.values()})
    check("score 取遍 -2..2", sc == [-2, -1, 0, 1, 2], str(sc))

    lb = Counter(v["strength"].get("label") for v in ok.values())
    check("体卦旺衰「旺相休囚死」五档齐全", set(lb) == STRENGTH_LABELS,
          " ".join(f"{k}×{v}" for k, v in sorted(lb.items())))
    lv = Counter(v["strength"].get("level") for v in ok.values())
    check("强/弱两档齐全", set(lv) == {"强", "弱"},
          " ".join(f"{k}×{v}" for k, v in sorted(lv.items())))
    yq = Counter(v["yingqi"]["zhi"] for v in ok.values())
    check("应期五组地支齐全", set(yq) == YINGQI,
          " ".join(f"{k}×{v}" for k, v in sorted(yq.items())))

    # ── 数字法 ──
    num = [v for v in ok.values() if v["method"] == "number"]
    n3 = Counter(v["qigua"]["inputs"].get("num3") is None for v in num)
    check("数字法「第三数缺省/给出」两态都跑到",
          set(n3) == {True, False}, f"缺省 {n3[True]} 例 / 给出 {n3[False]} 例")
    check("数字法上卦余数 1..8 全覆盖",
          sorted({v["qigua"]["upper_num"] for v in num}) == list(range(1, 9)),
          str(sorted({v["qigua"]["upper_num"] for v in num})))
    check("数字法动爻余数 1..6 全覆盖",
          sorted({v["qigua"]["moving"] for v in num}) == list(range(1, 7)),
          str(sorted({v["qigua"]["moving"] for v in num})))

    # ── 时间法 ──
    tim = [v for v in ok.values() if v["method"] == "time"]
    hn = sorted({v["derivation"]["hour_num"] for v in tim})
    check("时间法十二时辰序 1..12 全覆盖", hn == list(range(1, 13)), str(hn))
    hb = {v["derivation"]["hour_branch"] for v in tim}
    check("时间法十二地支全覆盖", len(hb) == 12, f"{len(hb)}/12：{''.join(sorted(hb))}")
    check("时间法「子时」两段（0 点与 23 点）都跑到",
          {"00", "23"} <= {v["inputs"]["datetime"][11:13] for v in tim},
          f"出现的小时 {sorted({v['inputs']['datetime'][11:13] for v in tim})}")

    # ── 字数法 ──
    ch = [v for v in ok.values() if v["method"] == "character"]
    si = [v["qigua"]["derivation"]["split_index"] for v in ch]
    check("字数法「一字占」特例分支跑到", None in si, f"{si.count(None)} 例")
    check("字数法「平分」分支跑到", any(isinstance(x, int) for x in si),
          f"{sum(1 for x in si if isinstance(x, int))} 例")
    big = [v["qigua"]["inputs"]["char_count"] for v in ch
           if v["qigua"]["inputs"]["char_count"] >= 11]
    check("字数法「十一字以上」分支跑到", bool(big), f"字数为 {sorted(big)}")
    ss = Counter(v["qigua"]["derivation"].get("stroke_source") for v in ch)
    check("笔画来源两态（内置表/调用方给）都跑到", set(ss) == {"内置笔画表（简体字形）", "调用方提供"},
          " ".join(f"{k}×{v}" for k, v in sorted(ss.items())))
    ws = [v for v in ch if re.search(r"\s", v["qigua"]["inputs"]["text"])]
    check("含空白的字串跑到（空白不计入字数）", len(ws) >= 2,
          f"{len(ws)} 例：" + "、".join(repr(v["qigua"]["inputs"]["text"]) for v in ws))
    check("字数法的 `char_count` 恒等于实际取用字数（空白已剔除）",
          all(v["qigua"]["inputs"]["char_count"] == len(v["qigua"]["derivation"]["chars"])
              for v in ch),
          f"{len(ch)} 例")

    # ── 出处/说明：三法各一套 ──
    for fld, path in (("formula", lambda v: v["derivation"]["formula"]),
                      ("qigua.note", lambda v: v["qigua"]["note"]),
                      ("经文出处", lambda v: v["qigua"]["source"]),
                      ("method_name", lambda v: v["method_name"])):
        c = Counter(path(v) for v in ok.values())
        check(f"{fld} 三法各异（每法有自己的说明）", len(c) == 3,
              f"{len(c)} 种：" + " | ".join(sorted(c)))

    # ── 错误路径 ──
    errs = {k: v["__error__"] for k, v in j.items() if "__error__" in v}
    ger = {k: v["__error__"] for k, v in g.items() if "__error__" in v}
    check("错误路径 10 例且文案两两不同", len(errs) == 10 and len(set(errs.values())) == 10,
          f"{len(errs)} 例 / {len(set(errs.values()))} 种文案")
    check("错误例两侧一致（无「本该报错却成功」）", errs == ger,
          f"仅一侧有 {len(set(errs) ^ set(ger))} 例")
    covered = set()
    for t in errs.values():
        if "必须是正整数" in t:
            covered.add("数字非法")
        elif "字数起卦需要至少一个字" in t:
            covered.add("空文本")
        elif "不在笔画表里" in t:
            covered.add("字不在笔画表")
        elif "对不上" in t:
            covered.add("笔画数与字数不符")
        elif "不支持的起卦法" in t:
            covered.add("起卦法名非法")
    check("错误类型五类齐全", len(covered) == 5, " / ".join(sorted(covered)))

    # ══ ② 不可达 / 防御分支 ═════════════════════════════════════
    print("② 不可达：结构上取不到的分支必须从未出现")

    check("体卦旺衰**恒为**「判了」（available=True）",
          all(v["strength"]["available"] is True for v in ok.values()),
          "唯一 False 的路径是月支取不到，即历法失败；正常输入走不到")
    notes = [v["ti_yong"]["note"] for v in ok.values()] \
        + [v["ti_yong"]["position"]["note"] for v in ok.values()]
    check("「多爻同动分居两卦」的兜底分支从未使用（恒为单动爻）",
          all(n == "" for n in notes), f"非空 {sum(1 for n in notes if n)}/{len(notes)}")

    vac = p["vacuous"]
    check("防御分支冒烟：月支为空时 strength 退化为 {available:false}",
          vac["off_strength"] == {"available": False}
          and vac["off_evidence_len"] == 6
          and not vac["off_has_strength_text"],
          f"off={vac['off_strength']}、evidence {vac['off_evidence_len']} 条；"
          f"同例带月支为 {vac['on_evidence_len']} 条")
    check("防御分支冒烟：月支为空即**不**降档",
          vac["off_main_level"] == vac["on_main_level"],
          f"off/on 主判同为「{vac['off_main_level']}」")

    # ══ ③ 独立核对 ══════════════════════════════════════════════
    print("③ 独立核对：与**另一条来源**对照")

    # ③-1 卦序表：本模块 HEX64_MAP ↔ 前端 hexagrams_data.js::HEXAGRAM_MAP
    tname = {int(k): v for k, v in p["trigram_name"].items()}
    grid = [[0] * 8 for _ in range(8)]
    for h in p["hex64"]:
        grid[h["upper"] - 1][h["lower"] - 1] = h["number"]
    check("HEX64_MAP ≡ 前端 HEXAGRAM_MAP（64/64）", grid == p["front_map"],
          f"不一致 {sum(1 for u in range(8) for l in range(8) if grid[u][l] != p['front_map'][u][l])} 处")

    # ③-2 前端 `combo`（「上乾下乾」）与 `i`（卦序）**各自独立**推出上下卦 → 卦序，
    #      与 ③-1 的表、以及本模块的 64 个卦名对上。前端那条链不经过 HEX64_MAP。
    by_combo, bad_combo = {}, []
    for e in p["front"]:
        m = re.fullmatch(r"上(\S)下(\S)", e["combo"])
        if not m:
            bad_combo.append(e["combo"])
            continue
        by_combo[(m.group(1), m.group(2))] = e
    check("前端 combo 全部可解析为「上X下Y」", not bad_combo and len(by_combo) == 64,
          f"{len(by_combo)}/64，解析失败 {bad_combo[:3]}")

    num_bad = []
    for h in p["hex64"]:
        e = by_combo.get((tname[h["upper"]], tname[h["lower"]]))
        if e is None or e["i"] != h["number"]:
            num_bad.append((h["upper"], h["lower"], h["number"], e and e["i"]))
    check("卦序 ≡ 前端「上X下Y」+ 卦序字段（不经 HEX64_MAP 的第二条路）",
          not num_bad, f"不一致 {len(num_bad)} 条 {num_bad[:3]}")

    # 卦名：**不能**拿前端的 `g` 直接比 —— 它不是通行全名，而是「卦名+为+上卦+下卦」
    # （履 → 「履为天泽」），与通行写法「天泽履」是两套约定。（真跑才发现：
    # 第一次这条断言红了 58 条，红的是**我的断言**而不是表。）
    # 故改用**三条独立信息拼**：前端每条给 卦名(`key`) 与 上下卦(`combo`)，
    # 先天象（乾→天…）从前端 8 个纯卦的 `g` 里取（`full.split('为')[-1]`），
    # 再按《周易》通行命名法合成：
    #     上下卦不同 → 上象 + 下象 + 卦名（天泽履）
    #     上下卦相同 → 卦名 + 为 + 象  （乾为天）
    # 合成结果与本模块 `getHexName` 64 条逐字比。这条链一次都没经过 constants.js。
    nature, pure_anomaly = {}, []
    for h in p["hex64"]:
        if h["upper"] != h["lower"]:
            continue
        e = by_combo[(tname[h["upper"]], tname[h["lower"]])]
        nature[tname[h["upper"]]] = e["full"].split("为")[-1]
        if e["full"] != e["key"] + "为" + nature[tname[h["upper"]]]:
            pure_anomaly.append((e["i"], e["key"], e["full"]))
    check("八卦先天象（乾→天…）可从纯卦名里取全 8 个", len(nature) == 8,
          " ".join(f"{k}→{v}" for k, v in sorted(nature.items())))
    if pure_anomaly:
        # 不判失败：那是**前端语料**的字段问题（`g` 写成「震为震为雷」这种），
        # 与本层被验方无关，且前端此刻冻结。记在 README「已知异常」里。
        print(f"  ⚠ 前端语料 `g` 字段自身异常 {len(pure_anomaly)} 条（不影响本层结论）："
              + "、".join(f"第{i}卦 {k!r}→{g!r}" for i, k, g in pure_anomaly))

    name_bad = []
    for h in p["hex64"]:
        e = by_combo[(tname[h["upper"]], tname[h["lower"]])]
        up, lo = tname[h["upper"]], tname[h["lower"]]
        want = e["key"] + "为" + nature[up] if up == lo else nature[up] + nature[lo] + e["key"]
        if want != h["name"]:
            name_bad.append((h["number"], h["name"], want))
    check("getHexName 64 个通行全名 ≡ 前端(卦名+上下卦+先天象)按通行命名法合成",
          not name_bad, f"不一致 {len(name_bad)} 条 {name_bad[:3]}")

    # ③-4 晚子时换日：**已拍板偏离**的申报必须可证伪 ══════════════════════
    # 层 7 里唯一一处申报（38 例，整例）。整例申报会把那 38 例的**全部**字段从
    # 比对里摘掉，所以必须有两条替代判据，否则等于「有 38 例什么都没验」：
    #
    #   ① 申报集**恰好**等于「time 法且 h>=23」—— 不多（没顺手把别的也申报掉，
    #      那是撒胡椒面）、不少（真有差异却漏申报，diff 会红，但这里再钉一次）。
    #   ② 把换日这一个开关**关掉**后，被验方与金标准必须 **0 差异**。
    #      这条才是关键：它证明那 38 例的差异**只**来自换日，没有第二个 bug
    #      躲在「已申报」后面 —— 整例申报最大的风险就是藏 bug，② 正面堵死它。
    #      对照组由 `run_js_meihua.js meihua_cases.json js_meihua_nohuanri.json
    #      --no-huanri` 产出（把 `ganzhi.lunarOfNextDay` 指回 `lunarOf`）。
    allow = load("allow_meihua.json")
    late = {cid for cid, v in g.items()
            if v.get("method") == "time"
            and (m := re.search(r"[T ](\d{1,2}):", (v.get("inputs") or {}).get("datetime") or ""))
            and int(m.group(1)) >= 23}
    check("申报集 ≡「time 法且 h>=23」的样例集（不撒胡椒面、也不漏）",
          set(allow) == late,
          f"申报 {len(allow)} 例 / 应申报 {len(late)} 例；"
          f"多报 {sorted(set(allow) - late)[:3]}、漏报 {sorted(late - set(allow))[:3]}")
    check("申报的每一例都写明理由（含拍板日期与「不跟 shushu」）",
          all("2026-09-24" in r and "shushu" in r for r in allow.values()),
          "有申报条目缺理由" if not all("2026-09-24" in r and "shushu" in r for r in allow.values())
          else "理由齐全")
    nh = load("js_meihua_nohuanri.json")
    diff_nh = sum(1 for cid in g
                  if json.dumps(g[cid], sort_keys=True, ensure_ascii=False)
                  != json.dumps(nh.get(cid), sort_keys=True, ensure_ascii=False))
    check("关掉换日后与金标准 **0 差异**（差异只来自换日这一个开关，没藏第二个 bug）",
          diff_nh == 0,
          f"仍有 {diff_nh} 例不同 —— 整例申报的风险正在于此" if diff_nh else "0 例不同")
    # 换日的**方向**也要钉死：不能只验「变了」，要验「怎么变」。
    # 两种合法形状，除此之外都是乱变：
    #   ① 平进：农历日 +1、农历月不变
    #   ② 月末进位：农历日 29/30 → 1，**且**农历月 +1
    # （② 是实跑里真出现的那一例：29 日 → 次月初一，日差 -28。第一版断言只写了
    #  ①，当场把这一例判成「乱变」—— 断言写窄了会把正确行为报成 bug，故两种都列。）
    # 两侧的取数中间量都在顶层 `derivation`。
    step, rollover_bad = Counter(), []
    for cid in late:
        d = g[cid].get("derivation") or {}
        e = j[cid].get("derivation") or {}
        ad, bd = d.get("lunar_day"), e.get("lunar_day")
        am, bm = d.get("lunar_month"), e.get("lunar_month")
        if not (isinstance(ad, int) and isinstance(bd, int)):
            continue
        step[bd - ad] += 1
        if bd - ad == 1 and bm != am:
            rollover_bad.append(f"{cid}：日 +1 却月也变了")
        elif bd - ad != 1 and not (bd == 1 and isinstance(bm, int) and bm - am == 1):
            rollover_bad.append(f"{cid}：日 {ad}→{bd} 月 {am}→{bm}")
    check("换日恒为「农历日 +1」或「月末进位到次月初一（日→1 且月+1）」",
          not rollover_bad and set(step) <= {1, -28, -29},
          f"步长分布 {dict(step)}；越界样例 {rollover_bad[:3]}")

    # ③-3 笔画表：本模块 strokes.js ↔ shushu core/meihua/strokes.py（机械转写，须逐字相等）
    sys.path.insert(0, SHUSHU)
    try:
        from core.meihua.strokes import _BY_STROKE, STROKE_COUNT
    except ImportError as e:                                  # pragma: no cover
        check("能读到 shushu 笔画表", False, f"{e}（须用 shushu 的 venv python 跑）")
        _BY_STROKE = STROKE_COUNT = None
    if STROKE_COUNT is not None:
        js_by = {int(k): v for k, v in p["strokes"]["by_stroke"].items()}
        js_cnt = p["strokes"]["stroke_count"]
        check("笔画档表 ≡ shushu（档数 + 每档字串逐字）",
              _BY_STROKE == js_by,
              f"档数 py {len(_BY_STROKE)} / js {len(js_by)}")
        check("逐字笔画数 ≡ shushu（6944 字逐字）", STROKE_COUNT == js_cnt,
              f"字数 py {len(STROKE_COUNT)} / js {len(js_cnt)}，"
              f"不一致 {sum(1 for c in set(STROKE_COUNT) | set(js_cnt) if STROKE_COUNT.get(c) != js_cnt.get(c))} 字")

    # ══ 结论 ═══════════════════════════════════════════════════
    print()
    if fails:
        print(f"⚠ {len(fails)} 项断言不满足：{'；'.join(fails)}")
        print("  对拍全绿也不可信 —— 有分支没被跑到，或独立核对对不上。")
        return 1
    print("✅ 覆盖断言全部满足：全绿不是空绿")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
