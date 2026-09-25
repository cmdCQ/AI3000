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

from diff import walk        # 同一目录（本脚本在 duipan 下跑）

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

    # ── 字数法：三档（笔画 / 平仄 / 字数）──
    # 档位怎么认：笔画档**故意不带** branch（那 6 例 2–3 字样例要零申报，多一个键就得多申报），
    # 故用「有没有 total_strokes」认它，与 `paipan/meihua.js` 里那段注释同一套说法。
    ch = [v for v in ok.values() if v["method"] == "character"]

    def branch_of(v):
        d = v["qigua"]["derivation"]
        return d.get("branch") or ("stroke" if "total_strokes" in d else "?")

    br = Counter(branch_of(v) for v in ch)
    check("字数法三档（笔画/平仄/字数）都跑到", set(br) == {"stroke", "pingze", "count"},
          " ".join(f"{k}×{v}" for k, v in sorted(br.items())))
    si = [v["qigua"]["derivation"]["split_index"] for v in ch]
    check("字数法「平分」分支跑到，且**一字占的 split_index=None 恒不出现**"
          "（n==1 先被拒收，详下）",
          all(isinstance(x, int) for x in si),
          f"非整数 {sum(1 for x in si if not isinstance(x, int))} 例")
    big = sorted(v["qigua"]["inputs"]["char_count"] for v in ch
                 if v["qigua"]["inputs"]["char_count"] >= 11)
    check("字数法「十一字以上只以字数取数」分支跑到（按档判，不只看字数）",
          bool(big) and all(branch_of(v) == "count" for v in ch
                            if v["qigua"]["inputs"]["char_count"] >= 11),
          f"字数为 {big}")
    check("平仄档恒有 `counts_per_char`（逐字取数）且四值 ∈ 1..4、依据 ∈ {入声,今音}",
          all(1 <= x <= 4 for v in ch if branch_of(v) == "pingze"
              for x in v["qigua"]["derivation"]["counts_per_char"])
          and all(s in ("入声", "今音") for v in ch if branch_of(v) == "pingze"
                  for s in v["qigua"]["derivation"]["count_source_per_char"]),
          f"平仄档 {br['pingze']} 例")
    stray = [v["qigua"]["inputs"]["text"] for v in ch if branch_of(v) != "stroke"
             and "stroke_source" in v["qigua"]["derivation"]]
    check("平仄档与字数档**不许**出现 `stroke_source`（免得明细把读音取数说成笔画）",
          not stray, f"出现 {len(stray)} 例：{stray[:3]}")
    ss = Counter(v["qigua"]["derivation"].get("stroke_source") for v in ch
                 if branch_of(v) == "stroke")
    check("笔画档的笔画来源两态（内置表/调用方给）都跑到",
          set(ss) == {"内置笔画表（简体字形）", "调用方提供"},
          " ".join(f"{k}×{v}" for k, v in sorted(ss.items())))
    ws = [v for v in ch if re.search(r"\s", v["qigua"]["inputs"]["text"])]
    check("含空白的字串跑到（空白不计入字数）", len(ws) >= 2,
          f"{len(ws)} 例：" + "、".join(repr(v["qigua"]["inputs"]["text"]) for v in ws))
    check("字数法的 `char_count` 恒等于实际取用字数（空白已剔除）",
          all(v["qigua"]["inputs"]["char_count"] == len(v["qigua"]["derivation"]["chars"])
              for v in ch),
          f"{len(ch)} 例")

    # ── 出处/说明：每法一套，字数法**每档**一套 ──
    # 笔画档那两句必须与 shushu 逐字相同（≤3 字那 6 例零申报就靠这个），另两档是本版
    # 按原文新写的。故分开断言：笔画档 ≡ shushu `METHOD_META['character']`，三档互不相同。
    sys.path.insert(0, SHUSHU)
    try:
        from core.meihua.qigua import METHOD_META as SHUSHU_META
    except ImportError as e:                                  # pragma: no cover
        check("能读到 shushu 的 METHOD_META", False, f"{e}（须用 shushu 的 venv python 跑）")
        SHUSHU_META = None
    if SHUSHU_META:
        stroke_cids = [cid for cid, v in ok.items()
                       if v["method"] == "character" and branch_of(v) == "stroke"]
        bad_meta = [cid for cid in stroke_cids
                    if ok[cid]["derivation"]["formula"] != gok[cid]["derivation"]["formula"]
                    or ok[cid]["qigua"]["note"] != SHUSHU_META["character"]["note"]]
        check("笔画档的 formula / note 与 shushu 逐字相同（≤3 字那几例零申报的前提）",
              stroke_cids and not bad_meta,
              f"{len(stroke_cids)} 例；不一致 {bad_meta[:3]}" if bad_meta
              else f"{len(stroke_cids)} 例逐字相同")
    for fld, path, want in (("derivation.formula", lambda v: v["derivation"]["formula"], 5),
                            ("qigua.note", lambda v: v["qigua"]["note"], 5),
                            ("经文出处", lambda v: v["qigua"]["source"], 3),
                            ("method_name", lambda v: v["method_name"], 3)):
        c = Counter(path(v) for v in ok.values())
        detail = f"{len(c)} 种：" + " | ".join(sorted(c))
        if want == 5:
            # time 1 + number 1 + character 3（笔画/平仄/字数各一套说明）
            cch = Counter(path(v) for v in ch)
            check(f"{fld} = 每法一套 × 字数法每档一套（{want} 种，其中字数法 3 种）",
                  len(c) == want and len(cch) == 3, detail)
        else:
            check(f"{fld} 三法各异（每法有自己的说明）", len(c) == want, detail)

    # ── 错误路径 ──
    errs = {k: v["__error__"] for k, v in j.items() if "__error__" in v}
    ger = {k: v["__error__"] for k, v in g.items() if "__error__" in v}
    # 16 = 金标准 11 + 本版多报的 5 个 n==1 例；11 种文案里唯一重复的一句是「一字占拒收」
    # （6 例共用：5 个 api 例 + 生僻字 `龘`，它也只有一个字）。
    dup = Counter(errs.values()).most_common(1)[0]
    check("错误路径 16 例 / 11 种文案（唯一重复的是「一字占拒收」那句，6 例共用）",
          len(errs) == 16 and len(set(errs.values())) == 11 and dup[1] == 6
          and "两个字以上" in dup[0],
          f"{len(errs)} 例 / {len(set(errs.values()))} 种文案 / 最多重复 {dup[1]} 次：{dup[0][:20]}…")
    same = {cid for cid in ger if errs.get(cid) == ger[cid]}
    check("金标准侧的错误例在被验方侧**仍然都是错误**（无「本该报错却成功」）",
          set(ger) <= set(errs), f"变成成功的 {sorted(set(ger) - set(errs))}")
    # 11 = 数字非法 5 + 空文本 + 笔画数不符 + 笔画表缺字（龘龘）+ 起卦法名 = 9 逐字相同；
    # 余下 2 条（`求财，问事业` 6 字走平仄档、`龘` 1 字走一字占拒收）文案变了，都在申报表里。
    changed = sorted(c for c in ger if c in errs and errs[c] != ger[c])
    check("金标准侧 11 条错误例：文案逐字相同的 9 条 + 文案变了的 2 条（后者各自申报）",
          len(same) == 9 and len(changed) == 2, f"逐字相同 {len(same)} 条；不同 {changed}")
    extra_err = sorted(set(errs) - set(ger))
    check("n==1 的样例（金标准成功）在本版全部拒收，文案含「两个字以上」",
          len(extra_err) == 5 and all("两个字以上" in errs[c] for c in extra_err),
          f"多报错 {len(extra_err)} 例：{extra_err}")
    covered = set()
    for t in errs.values():
        if "必须是正整数" in t:
            covered.add("数字非法")
        elif "字数起卦需要至少一个字" in t:
            covered.add("空文本")
        elif "不在笔画表里" in t:
            covered.add("字不在笔画表")
        elif "查不到读音调类" in t:
            covered.add("读音表查不到")
        elif "对不上" in t:
            covered.add("笔画数与字数不符")
        elif "不支持的起卦法" in t:
            covered.add("起卦法名非法")
    check("错误类型六类齐全", len(covered) == 6, " / ".join(sorted(covered)))

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

    # ③-4 两处**已拍板偏离**的申报必须可证伪 ═════════════════════════════
    # 层 7 里只有两处申报，都是整例粒度：
    #   ① 晚子时换日（38 例）—— 用户的拍板，不跟 shushu
    #   ② 字占按《梅花易数·字占》原文分层取数（19 例）—— 原文对、shushu 错
    # 整例申报会把那 57 例的**全部**字段从比对里摘掉，所以必须成套地证伪，
    # 否则等于「有 57 例什么都没验」：
    #
    #   ① 申报集**恰好**等于两条规则的作用域（见下）—— 不多（没顺手把别的也申报掉，
    #      那是撒胡椒面）、不少（真有差异却漏申报，diff 会红，但这里再钉一次）。
    #   ② 逐格关开关（R1/R2/R3）：**两个开关各自关掉时，残差集必须恰好是另一处的申报集**
    #      —— 一句话讲得完，又极难作弊。这条才是关键：整例申报最大的风险是藏 bug，
    #      残差集「恰好等于」正面堵死它（差一个例就红）。
    #
    # 对照组产出（`run_js_meihua.js`，都是**替换依赖**而不是给生产代码加测试开关）：
    #   R1 `--no-huanri`  把 `ganzhi.lunarOfNextDay` 指回 `lunarOf` → 复现 shushu 的口径
    #   R2 `--old-zishan` 给 4 字以上的字数法样例补上笔画（产品规则：显式给 strokes 即强制
    #                     笔画档）→ 复现 shushu「字占一律按笔画」的口径
    #   R3 两个都关
    allow = load("allow_meihua.json")
    late = {cid for cid, v in g.items()
            if v.get("method") == "time"
            and (m := re.search(r"[T ](\d{1,2}):", (v.get("inputs") or {}).get("datetime") or ""))
            and int(m.group(1)) >= 23}

    # 字占规则：method==character 且（n==1 或 n>=4），**但显式给了 strokes 的不算**
    # （本版「调用方给笔画即强制笔画档」，此时与 shushu 逐字相同）。错误例没有 inputs，
    # 用调用说明里的 text 去空白数字数 —— 这条规则**只看输入**，不看跑出来差在哪。
    specs = load("meihua_cases.json")
    zishan_chars = {}
    for cid, v in g.items():
        if v.get("method") == "character":
            ins = v.get("inputs") or {}
            zishan_chars[cid] = (ins.get("char_count"), bool(ins.get("strokes")))
    for cid, sp in specs.items():
        body = sp.get("body") or sp.get("call") or {}
        if body.get("method") == "character" and cid not in zishan_chars:
            zishan_chars[cid] = (len("".join(str(body.get("text", "")).split())),
                                 bool(body.get("strokes")))
    zishan = {cid for cid, (n, given) in zishan_chars.items()
              if n == 1 or (n is not None and n >= 4 and not given)}
    check("申报集 ≡「time 法且 h>=23」∪「字占 n==1 或 n>=4 且未显式给 strokes」",
          set(allow) == late | zishan,
          f"申报 {len(allow)} = 换日 {len(late)} + 字占 {len(zishan)}；"
          f"多报 {sorted(set(allow) - late - zishan)[:3]}、"
          f"漏报 {sorted((late | zishan) - set(allow))[:3]}")
    why_bad = [cid for cid, r in allow.items()
               if (cid in late and not ("2026-09-24" in r and "shushu" in r))
               or (cid in zishan and not all(k in r for k in (
                   "2026-09-25", "shushu", "约定", "平仄", "verify_meihua_zishan.js", "字占")))]
    check("申报的每一例都写明理由（换日含 2026-09-24，字占含 2026-09-25 与替代判据脚本）",
          not why_bad, f"缺理由 {why_bad[:3]}" if why_bad else f"{len(allow)} 例理由齐全")

    def diffset(name):
        other = load(name)
        return {cid for cid in g
                if json.dumps(g[cid], sort_keys=True, ensure_ascii=False)
                != json.dumps(other.get(cid), sort_keys=True, ensure_ascii=False)}

    r1 = diffset("js_meihua_nohuanri.json")
    check("R1 只关换日：与金标准的差异集**恰好 = 字占申报集**（字数法这一处偏离的全貌）",
          r1 == zishan, f"差异 {len(r1)} 例 / 应 {len(zishan)} 例；"
                        f"多 {sorted(r1 - zishan)[:3]}、少 {sorted(zishan - r1)[:3]}")

    # R2 / R3 里，补了笔画的那批例「只剩来源标记不同」—— 要按**路径**判，不能只判例名。
    # 这条断言是整层里对「改的只是取数」最硬的一句：卦、动爻、体用、互变、旺衰、应期、
    # 判词**全部逐字相同**，不同的只有 `stroke_source` 那一句「内置笔画表/调用方提供」。
    r2 = diffset("js_meihua_oldzishan.json")
    r3 = diffset("js_meihua_neither.json")
    check("R2 只关字占：差异集 ≡ 换日申报集 ∪ 字占申报集（= 全部 57 条申报）",
          r2 == late | zishan, f"差异 {len(r2)} 例 / 应 {len(late | zishan)} 例；"
                               f"多 {sorted(r2 - late - zishan)[:3]}")
    check("R3 两个都关：差异集**恰好 = 字占申报集**（换日那 38 例已归零，残差没有别的东西）",
          r3 == zishan, f"差异 {len(r3)} 例 / 应 {len(zishan)} 例；"
                        f"多 {sorted(r3 - zishan)[:3]}、少 {sorted(zishan - r3)[:3]}")

    # 「补得上笔画」的例 = 4 字以上、调用方没给 strokes、且每个字都在笔画表里
    # —— 与 `run_js_meihua.js::oldZishan` 同一套条件（这里用它算「应该补上哪些」）。
    injected = set()
    for cid, (n, given) in zishan_chars.items():
        sp = specs.get(cid) or {}
        body = sp.get("body") or sp.get("call") or {}
        chars = [c for c in str(body.get("text", "")) if not c.isspace()]
        if n and n >= 4 and not given and chars \
                and all(c in p["strokes"]["stroke_count"] for c in chars):
            injected.add(cid)
    marker = zishan & injected
    MARK_OK = {"derivation.stroke_source", "qigua.derivation.stroke_source"}
    bad_marker = {}
    neigh = load("js_meihua_neither.json")
    for cid in marker:
        out = []
        walk(g[cid], neigh.get(cid), cid, out, {})
        extra = {p[len(cid) + 1:] for p, *_ in out} - MARK_OK
        if extra:
            bad_marker[cid] = sorted(extra)
    check("R2/R3 里「补了笔画」的那批例**只差 `stroke_source` 这一步标记**"
          "（卦与全部下游字段逐字相同）",
          bool(marker) and not bad_marker,
          (f"{len(marker)} 例被补笔画" if marker else "一例都没补上 = 开关没接上")
          + (f"；另有差异路径的例：{list(bad_marker)[:3]}" if bad_marker else ""))
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
