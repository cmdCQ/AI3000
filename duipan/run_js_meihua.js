/**
 * 对拍 · JS 侧：梅花层（起卦 + 断卦），跑 `build/backend/paipan/meihua.js`。
 *
 * 按 `meihua_cases.json`（金标准生成器写的调用说明）逐例调用，**不由 id 反推参数**。
 * 三种 kind：
 *   api   —— 金标准走的是 `POST /api/v1/meihua/divine`，故这里要**照 API 的
 *            `_kwargs_for` 把请求体翻成起卦参数**（时间法的 datetime 组装、
 *            hour/minute 缺省取 0）。顺手把这段映射验了 —— 将来 auth-server.js
 *            的新端点就用同一套映射。
 *   core  —— 直调 `divine()`，用于注入 API 不暴露的 `dt`。
 *   error —— 必须**抛出**，把 message 作为 `{__error__}` 交出，与金标准逐字比。
 *
 * 用法：node run_js_meihua.js [cases.json] [out.json] [--no-huanri]
 *
 * `--no-huanri`：把「晚子时换日」这一处**已拍板偏离关掉**，产出与 shushu 同口径的
 * 对照组。它不是调试开关，而是让那条偏离**可证伪**的手段：`coverage_meihua.py`
 * 断言「关掉换日后与金标准 0 差异」—— 于是 23 点那 38 例的差异被证明**只**来自
 * 换日这一个开关，没有第二个 bug 躲在「已申报」后面。
 *
 * 实现方式是替换依赖里的函数而**不是**给生产代码加测试开关：
 * `meihua.js` 调的是 `ganzhi.lunarOfNextDay`，把它指回 `lunarOf` 即可。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const PAIPAN = path.join(__dirname, '..', 'build', 'backend', 'paipan');
const G = require(path.join(PAIPAN, 'ganzhi.js'));
if (process.argv.includes('--no-huanri')) {
  G.lunarOfNextDay = G.lunarOf;
  console.log('[--no-huanri] 已把 lunarOfNextDay 指回 lunarOf（对照组：与 shushu 同口径）');
}
const M = require(path.join(PAIPAN, 'meihua.js'));

// 位置参数要先把 `--` 开头的开关滤掉：`node run_js_meihua.js --no-huanri` 时
// 若直接取 argv[2]，开关本身就成了 casesPath。
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const casesPath = args[0] || path.join(__dirname, 'meihua_cases.json');
const outPath = args[1] || path.join(__dirname, 'js_meihua.json');
const cases = JSON.parse(fs.readFileSync(casesPath, 'utf8'));

const pad2 = (n) => String(n).padStart(2, '0');

/** 照 shushu `api/meihua.py::_kwargs_for` 把请求体翻成 divine() 的参数。 */
function optsFromApiBody(body) {
  const opts = {
    question: body.question || '',
    monthDizhi: body.month_dizhi || '',
  };
  if (body.method === 'time') {
    const h = body.hour === null || body.hour === undefined ? 0 : body.hour;
    const mi = body.minute || 0;
    opts.dt = `${body.year}-${pad2(body.month)}-${pad2(body.day)}T${pad2(h)}:${pad2(mi)}:00`;
  } else if (body.method === 'number') {
    opts.num1 = body.num1;
    opts.num2 = body.num2;
    opts.num3 = body.num3 === undefined ? null : body.num3;
  } else if (body.method === 'character') {
    opts.text = body.text;
    opts.strokes = body.strokes === undefined ? null : body.strokes;
  }
  return opts;
}

function runOne(spec) {
  if (spec.kind === 'api') return M.divine(spec.body.method, optsFromApiBody(spec.body));
  // core 的 `call.dt` 是 **ISO 字符串**（金标准侧要 `datetime.fromisoformat`
  // 还原成 datetime 才能喂 shushu），本侧由 `ganzhi.normalize` 解析字符串。
  if (spec.kind === 'core') return M.divine(spec.call.method, spec.call);
  if (spec.kind === 'error') {
    try {
      M.divine(spec.call.method, spec.call);
    } catch (e) {
      return { __error__: String(e.message) };
    }
    return { __error__: '<没有抛错>' };
  }
  throw new Error(`未知 kind：${spec.kind}`);
}

const out = {};
for (const cid of Object.keys(cases)) out[cid] = runOne(cases[cid]);

fs.writeFileSync(outPath, JSON.stringify(out, null, 1), 'utf8');
const kinds = {};
for (const cid of Object.keys(cases)) {
  kinds[cases[cid].kind] = (kinds[cases[cid].kind] || 0) + 1;
}
console.log(`已写 ${outPath}（${Object.keys(out).length} 例：`
  + Object.entries(kinds).map(([k, v]) => `${k} ${v}`).join('、') + '）');
