/**
 * paipan/pycompat.js —— Python 语义垫片（供「逐字移植」的各模块共用）
 * ================================================================================
 *
 * 移植里反复踩的几类「看着等价、其实不等价」，全部集中在这里一份实现。
 * 各模块**必须**从这里取，不许各自再写一份 —— 每多一份就多一处
 * 「两边错得一样才看不出来」的漂移点。
 *
 * ⚠ 本文件里的每个函数都是**行为契约**，不是便利工具。改动前先想清楚
 * 基准 Python 的对应语义，并重跑用它的那一层对拍。
 *
 * ── 与早期垫片的关系（`bazi_yongshen.dget` / `bazi_combos.tget`）──
 * 那两个是同语义的早期实现（当时只有它们各自需要）。本文件是**唯一真源**；
 * `dget` 多一个 `o != null` 的前置保护（Python 里 `None.get` 会抛 AttributeError，
 * 严格说那是**偏离**，只是它那条路径没踩到）。合并它们要重跑层 12/13 对拍，
 * 属于独立的小清理，**不在本次改动里顺手做** —— 顺手改已经全绿的模块，
 * 会让「这一层为什么又红了」变得难以定位。
 */
'use strict';

/**
 * Python `dict.get(key, default)`：**只在键不存在时**给默认值。
 *
 * 键存在而值为 `""` / `null` / `{}` / `0` 时**原样返回** —— 这正是它与 JS
 * 的两个常见写法的区别：
 *   `obj[k] ?? d`  → `null` 会被兜掉（Python 不兜）
 *   `obj[k] || d`  → `""`/`0`/`false` 会被兜掉（Python 不兜）
 * 此处用 `hasOwnProperty` 判「在不在」，故三种形态都能原样穿过。
 *
 * 层 14 的对拍就是靠这条逼出 `strength: ""` 那一支的（`||` 会把它换成「中和」，
 * 于是输出字段当场就漂了）。
 *
 * ⚠⚠ **`obj` 不是 dict 时当场抛**（Python：`dict.get` 只长在 dict 上，
 *   `'x'.get(...)` / `[].get(...)` / `None.get(...)` 都是
 *   `AttributeError: 'str' object has no attribute 'get'`）。
 *
 *   这一条是层 16 的对拍逼出来的，**不是**预防性加的：`pm` 家族把
 *   `day_master_profile='x'`、`strength_info='x'`、`strength_info=[]`、
 *   `yong_shen=[]` 四种形态喂进去，基准**四次都是 AttributeError 整体失败**，
 *   而宽容版静默取默认值 —— 产物于是「多一段 / 少一段」。
 *   「炸」与「静默给默认值」在这条链上是**看得见的行为差别**：
 *   `api/agent.py` 那段把异常吞掉后，段是整段消失；不吞就是整个请求 500。
 *   把该炸的地方演成正常返回，对拍就永远发现不了（本文件 `pyDictGet`
 *   的注释里已有同一条论断）。
 */
function pyGet(obj, key, dflt) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error(
      `AttributeError: '${pyTypeName(obj)}' object has no attribute 'get'`);
  }
  return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : dflt;
}

/** Python `str(v)`：字符串原样（**不加引号**），其余走 repr。 */
function pyStr(v) {
  return typeof v === 'string' ? v : pyRepr(v);
}

/**
 * Python `repr(v)` —— 只覆盖移植中真会出现的形态；**遇到没见过的类型就抛**。
 *
 * 为什么需要它：基准把值插进 f-string 时走的是 `str()`，在非字符串上与 JS 不同 ——
 *   `None` → `"None"`（JS 给 `"null"`）
 *   `{"label":"身强"}` → `"{'label': '身强'}"`（JS 给 `"[object Object]"`）
 *   `True` → `"True"`（JS 给 `"true"`）
 * 层 14 曾因此报 7920 例差异，且**只在被拼进白话的那一处**显形（结构字段两侧相同）。
 *
 * 「抛」是**故意**的：猜出来的 repr 属于「看着对、其实错」，比直接炸掉糟得多。
 */
function pyRepr(v) {
  if (v === null || v === undefined) return 'None';
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') {
    // Python repr 对含单引号的字符串改用双引号，且转义规则不止这一条 —— 不猜。
    if (v.includes("'") || v.includes('\n')) {
      throw new Error(`pyRepr 未覆盖的字符串形态（含单引号或换行）：${JSON.stringify(v)}`);
    }
    return `'${v}'`;
  }
  if (Array.isArray(v)) return `[${v.map(pyRepr).join(', ')}]`;
  if (typeof v === 'object') {
    return `{${Object.entries(v).map(([k, x]) => `${pyRepr(k)}: ${pyRepr(x)}`).join(', ')}}`;
  }
  throw new Error(`pyRepr 未覆盖的类型：${typeof v}`);
}

/**
 * Python 的真值判断 —— 用于基准里**裸写**的 `if x:` / `x or y` / `a if x else b`。
 *
 * 差异只在容器与 `0` 上，且方向是**相反的**，所以两边都会错：
 *   `[]` / `{}`  Python **假**，JS **真**
 *   `0`          Python 假，JS 假（同）
 *   `""`         Python 假，JS 假（同）
 *   `null`       Python 假，JS 假（同，Python 的 None）
 * 即：JS 唯一多认的「真」是**空容器**。`synthesis`/`overview`/`master_synthesis`
 * 里到处是 `if chart.get("advice")` 这种裸判断，而 `advice` 既可能是 `""` 也可能是
 * `[]`（`applications.py` 各函数的返回值就是这两种）—— 写成 JS 真值，`[]` 会被当成
 * 「有建议」，于是多拼出一段空白的 `；…`。反过来说，**只有空容器会让两侧分叉**，
 * 所以这一条同时是「造负例」的指路牌：合成族里必须出现 `[]` 与 `{}`。
 *
 * ⚠ 与 `pyGet` 的分工：`pyGet` 管「键在不在」，`pyTruthy` 管「值算不算真」。
 *   `if x:`     → `pyTruthy(x)`
 *   `if x is not None:` → `x !== null && x !== undefined`（**不是** pyTruthy）
 */
function pyTruthy(v) {
  if (v === undefined || v === null || v === false || v === 0 || v === '') return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return true;
}

/**
 * Python 的 `a or b` —— 与 JS `a || b` **在容器上不等**。
 *
 * `or` 用的是真值判断，于是 `{} or x` / `[] or x` 在 Python 取 `x`，
 * 而 JS 的 `{} || x` / `[] || x` 取 `{}` / `[]`（空容器在 JS 为真）。
 * 基准里 `synth.get("yong_shen_wx","") or overview.get("yong_shen_wx","")`
 * 这种「前一处没有就退到后一处」的写法到处都是，写成 `||` 会在左侧是空容器时
 * **不退**，把 `{}` 一路带进 `"、".join(...)` 或 f-string。
 *
 * 何时可以不用它：左操作数**保证是字符串/数字/None** 时，`||` 与 `or` 等价
 * （`""`/`0`/`None` 两边都假）。拿不准就一律 `pyOr`。
 */
function pyOr(a, b) {
  return pyTruthy(a) ? a : b;
}

/**
 * Python 的 `==` —— 与 JS 的 `===` **在容器与数字/布尔上不等**：
 *   `[1] == [1]`     Python **真**（逐元素比），JS `[1] === [1]` **假**（比引用）
 *   `{"a":1} == {"a":1}` 同理
 *   `True == 1`      Python **真**（bool 是 int 的子类），JS `true === 1` 假
 * 基准里 `xi_shen_wx != yong_shen_wx` 这种「两个五行值是不是同一个」的比较，
 * 一旦五行值可能是列表（`synthesis`/`master_synthesis` 都明写了「可能是 list」），
 * 写 `!==` 就变成「永远不等」——于是多拼一段「…为喜」。
 *
 * 只覆盖移植中会出现的形态（None/布尔/数字/字符串/列表/字典）；**遇到没见过的类型就抛**，
 * 与 `pyRepr` 同一条理由：猜出来的相等性属于「看着对、其实错」。
 */
function pyEq(a, b) {
  const x = a === undefined ? null : a;      // Python 里没有 undefined 这一态
  const y = b === undefined ? null : b;
  if (x === null || y === null) return x === null && y === null;
  const numLike = (v) => typeof v === 'number' || typeof v === 'boolean';
  if (numLike(x) || numLike(y)) {
    if (!numLike(x) || !numLike(y)) return false;
    return Number(x) === Number(y);
  }
  if (typeof x === 'string' || typeof y === 'string') return x === y;
  if (Array.isArray(x) || Array.isArray(y)) {
    if (!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length) return false;
    return x.every((v, i) => pyEq(v, y[i]));
  }
  if (typeof x === 'object' && typeof y === 'object') {
    const kx = Object.keys(x); const ky = Object.keys(y);
    if (kx.length !== ky.length) return false;
    return kx.every((k) => Object.prototype.hasOwnProperty.call(y, k) && pyEq(x[k], y[k]));
  }
  throw new Error(`pyEq 未覆盖的类型：${typeof a} / ${typeof b}`);
}

/** Python 的 `!=`（`not a == b`）。 */
function pyNe(a, b) {
  return !pyEq(a, b);
}

/**
 * Python `len(s)` —— 数**码位**，不是 UTF-16 单元。
 *
 * 两者在 BMP 内相同，故中文文本上「看起来没问题」；一旦出现非 BMP 字符
 * （emoji、CJK 扩展 B 区及以上，例如「𠮷」）就会差 1。移植里 `len(s) > 60`
 * 这类**判据本身**参与算法（决定要不要加省略号），所以必须逐位相同。
 */
function pyLen(s) {
  return [...s].length;
}

/**
 * Python `s[a:b]` —— 按**码位**切片，理由同 `pyLen`。
 * 只实现本仓库用到的形态（无负步长、无省略端点时用 0/len 显式写）。
 */
function pySlice(s, start, end) {
  const cp = [...s];
  const a = start;
  const b = (end === undefined || end === null) ? cp.length : end;
  return cp.slice(a, b).join('');
}

/**
 * Python `v[a:b]` —— 按**值本身的类型**决定切出什么，不是「取个字符串片段」。
 *
 * 与 `pySlice` 的分工：`pySlice` 只吃字符串（契约明确），本函数复刻裸切片在
 * **非字符串**上的三种行为 —— 基准里 `(ys.get("analysis","") or "")[:56]`、
 * `cf["suiyun_brief"][:40]` 这类写法，值可能是 list（`synthesis`/`master_synthesis`
 * 都明写「可能是 list」），Python 切 list 得 **list**（不是把元素拼起来）：
 *   `["木"] [:56]` → `['木']`   ← 原样进 JSON
 * 而 JS 的 `String(x).slice()` 或 `[...x].join('')` 会得到 `"木"`，那是**另一个类型**，
 * 差异能一路串到下游的 `_grade_to_q`/`pyStrJoin` 上（层 15 的 synthesis 崩在这里）。
 *
 *   str   → 码位切片（同 pySlice）
 *   list  → Python 列表切片（`v.slice(a,b)`，负索引未用到故不实现）
 *   dict  → `KeyError: slice(a, b, None)`（基准在字典上切片就是当场抛）
 *   其它  → `TypeError: 'x' object is not subscriptable`
 *
 * ⚠ 调用方**必须先自己做完 `or ""`**（`pyOr(x, '')`）：本函数只复刻 `v[a:b]` 本身，
 *   拿到 `None`/`0`/`""` 会按 Python 那样抛 —— 那说明调用方漏了 `pyOr`，不是这里的锅。
 */
function pyIndexSlice(v, a, b) {
  if (typeof v === 'string') return pySlice(v, a, b);
  if (Array.isArray(v)) return v.slice(a, b === undefined || b === null ? undefined : b);
  if (typeof v === 'object' && v !== null) {
    throw new Error(`KeyError: slice(${a}, ${b}, None)`);
  }
  throw new TypeError(`'${pyTypeName(v)}' object is not subscriptable`);
}

/**
 * Python 数字格式 `{n:+d}` —— **总是带符号**：`0` → `"+0"`，
 * `-3` → `"-3"`，`4` → `"+4"`。`synthesis.py` 的「先天综合力」用它。
 */
function pySignFormat(n) {
  return (n >= 0 ? '+' : '') + String(n);
}

/**
 * Python 的字符串 `a + b` —— **两边都必须真是 `str`**，否则
 * `TypeError: can only concatenate str (not "list") to str`。
 *
 * JS 的 `+` 对任何东西都能拼（`"x" + [1]` → `"x1"`、`"x" + {}` → `"x[object Object]"`），
 * 于是在基准会抛的地方安静地拼出一串垃圾。这条与 `pyStrJoin` 是同一类：
 * **基准抛异常的地方，移植侧必须也抛** —— 因为异常本身会改变控制流
 * （`master_synthesis` 的「当下」那段被 swallow、`bazi_full` 的挂载点被 swallow），
 * 「算出个数」与「炸掉」在两侧会走成不同的分支。
 *
 * 何时用它：基准里形如 `x[:60] + ("…" if … else "")` 或 `"：" + notes[0]` 的拼接，
 * 而 `x`/`notes[0]` **不是**由本文件当场 `str()` 出来的。
 */
function pyAddStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    const bad = typeof a !== 'string' ? a : b;
    throw new TypeError(
      `can only concatenate str (not "${pyTypeName(bad)}") to str`);
  }
  return a + b;
}

/** Python 类型名（只覆盖移植里会出现的形态），用于复刻 TypeError 的报错文字。 */
function pyTypeName(v) {
  if (v === null || v === undefined) return 'NoneType';
  if (typeof v === 'boolean') return 'bool';
  if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'float';
  if (typeof v === 'string') return 'str';
  if (Array.isArray(v)) return 'list';
  return 'dict';
}

/**
 * Python `dict.get(k)` —— **带可哈希性检查**。
 *
 * JS 的对象取值会把 `['水']` 悄悄 `toString()` 成 `'水'`、把 `{a:1}` 变成
 * `'[object Object]'` 再去查表；Python 则是当场
 * `TypeError: unhashable type: 'list'`。
 *
 * 何时必须用它：**键来自数据**（而非本文件里写死的字面量）的 `.get()`。
 * 键是字面量时 `pyGet` 就够 —— 前者是「基准在这里有一类会炸的输入」，
 * 后者没有。`current_moment.moment_vs_yongshen` 的 `_SHENG.get(w)` 是前者：
 * `w` 取自 `moment["hour_wuxing"]`，基准里没有 `str()` 过，畸形样本会炸。
 *
 * ⚠ 「炸」与「算出个数」的差别不是风格问题：基准的调用方（`master_synthesis`
 *   的「当下」那一段）**把这类异常吞了**，于是「炸」= 少一域、「算出来」= 多一域。
 *   把该炸的地方演成正常返回，对拍就永远发现不了。
 */
function pyDictGet(d, k, dflt) {
  if (k !== null && typeof k === 'object') {
    throw new TypeError(`unhashable type: '${pyTypeName(k)}'`);
  }
  return pyGet(d, String(k), dflt === undefined ? null : dflt);
}

/**
 * Python `sep.join(xs)` —— **元素必须都是 `str`**，否则
 * `TypeError: sequence item 0: expected str instance, dict found`。
 *
 * JS 的 `Array.prototype.join` 会把任何东西 `toString()`
 * （`{}` → `'[object Object]'`、`null` → `''`），于是在基准会抛的地方
 * 安静地拼出一串垃圾 —— 同样会被「当下」那段 swallow 掉，表现为
 * 「基准少一域、移植侧多一域」。
 */
function pyStrJoin(xs, sep) {
  return xs.map((x, i) => {
    if (typeof x !== 'string') {
      throw new TypeError(
        `sequence item ${i}: expected str instance, ${pyTypeName(x)} found`);
    }
    return x;
  }).join(sep);
}

module.exports = {
  pyGet, pyTruthy, pyOr, pyEq, pyNe, pyStr, pyRepr, pyLen, pySlice, pyIndexSlice, pyAddStr,
  pySignFormat, pyTypeName, pyDictGet, pyStrJoin,
};
