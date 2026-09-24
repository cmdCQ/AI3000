# -*- coding: utf-8 -*-
"""清库后的检索抽检：用生产同形的查询打 /api/retrieve，看返回的书目是否对口。

生产调用形（auth-server.js）：
  六爻 chat : categories=['liuyao','yijing'], top_k=10, similarity_threshold=0.3
  梅花 chat : categories=['meihua','yijing'], top_k=10, similarity_threshold=0.3
  searchQuery = cardData.topic || 本卦名+'卦'
"""
import json
import urllib.request

CASES = [
    ("求财",  ["liuyao", "yijing"]),
    ("婚姻",  ["liuyao", "yijing"]),
    ("疾病",  ["liuyao", "yijing"]),
    ("求财",  ["meihua", "yijing"]),
    ("婚姻",  ["meihua", "yijing"]),
    # 生产的兜底查询：cardData.topic 缺失时 = 本卦名+'卦'
    ("乾卦",  ["liuyao", "yijing"]),
    ("坤卦",  ["liuyao", "yijing"]),
    ("屯卦",  ["liuyao", "yijing"]),
    ("水火既济", ["liuyao", "yijing"]),
    ("山地剥", ["liuyao", "yijing"]),
    ("乾卦",  ["meihua", "yijing"]),
]


def q(query, cats, tk=10):
    body = json.dumps({
        "query": query, "top_k": tk, "categories": cats, "similarity_threshold": 0.3,
    }).encode()
    req = urllib.request.Request(
        "http://localhost:8800/api/retrieve", data=body,
        headers={"Content-Type": "application/json"})
    j = json.loads(urllib.request.urlopen(req, timeout=60).read())
    res = j.get("results", [])
    print(f"### {query!r} {cats}  -> {len(res)} 条")
    for x in res[:8]:
        txt = (x.get("text") or "").replace("\n", " ")[:64]
        print(f"   {x.get('score', 0):.3f}  [{x.get('book_name')}] {txt}")
    print()


for query, cats in CASES:
    try:
        q(query, cats)
    except Exception as e:
        print(f"### {query!r} {cats} 失败: {e}\n")
