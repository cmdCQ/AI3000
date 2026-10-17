// 六爻结果页（`/liuyao/result.html?id=<记录id>`）的命令式逻辑 —— 阶段 3 第 6 页。
// 逐字搬运自 `src/web/js/page-liuyao-result.js`（115 行）。
// ==========================================================================
//
// 老文件那 115 行里没有一个 DOM 事件、没有一个全局名要挂：它是**一条直线** ——
// 取 id → 拉记录 → 折成端点要的 cardData → 装卦 → 渲染 → 把 AI 块摆出来。
// 所以本文件与老文件是**函数体逐字节相同**的（差分脚本
// `duipan/diff_liuyao_result_history.mjs` 逐字比，`export ` 之外一个字符没动）。
//
// 本文件**不许 import 任何东西**（与 `../liuyao/logic.js` 同一条规矩）：它是差分脚本
// 的对拍对象，import 进来的东西在老沙箱里没有对应物，对拍就没有意义。
// 依赖的全局（浏览器里由传统 script 提供，node 差分里由桩提供）：
//   · `AUTH`               `/js/auth.js`        —— `getToken()`
//   · `escHtml`            `/js/ui_common.js`   —— 装卦失败时把后端 error 转义进 HTML
//   · `renderLiuyaoResult` `/js/liuyao_render.js` —— 结果区渲染层（与排盘页同一份）
//   · `refreshAIPanel`     `/js/liuyao_ai_panel.js` —— 盘就在 DOM 里之后把 AI 块摆出来
/* global AUTH, escHtml, renderLiuyaoResult, refreshAIPanel */

// 记录里的 result_data → 端点要的 cardData。
//
// 只送**起卦结果**（上下卦号）与四柱：卦名、宫、纳甲、六亲、六神、世应、卦身、
// 旺衰、用神由后端装。老记录的字段形状与现在不同，这里一并折过来 —— 老记录也
// 走同一条装卦出口，盘面因此不会与 AI 读到的那份分叉。
export function cardFromResult(result) {
  var hx = result.hexagrams;
  if (!hx) {
    // 老形状：卦在 `gua.benGua` / `gua.bianGua`（前端算的），`upper`/`lower` 是
    // 卦号（1乾 … 8坤），正是端点要的那两个数。其余字段（name/络甲/六亲）后端
    // 一概重算，不取。
    var b = (result.gua && result.gua.benGua) || {};
    var n = (result.gua && result.gua.bianGua) || {};
    if (!b.upper || !b.lower) return null;
    hx = {
      gender: result.gender || 'male',
      isProxy: !!(result.gua && result.gua.isProxy),
      benGua: { upper: b.upper, lower: b.lower },
      // 无动爻时老记录里变卦可能缺号 —— 缺就按本卦，端点是拿「两者不同的爻」
      // 定动爻的，取本卦即「无动爻」，正是当时那一卦的样子
      bianGua: { upper: n.upper || b.upper, lower: n.lower || b.lower }
    };
  }
  return {
    topic: result.topic || '',
    gender: result.gender || hx.gender || 'male',
    method: result.method || '',
    divinationTime: result.divinationTime || '',
    createdAt: result.createdAt || '',
    recordTime: result.recordTime || '',
    lunarInfo: result.lunarInfo || {},
    hexagrams: hx
  };
}

export async function load() {
  var area = document.getElementById('contentArea');
  var urlParams = new URLSearchParams(window.location.search);
  var id = urlParams.get('id');
  var isAdmin = urlParams.get('admin') === '1';

  if (!id) {
    area.innerHTML = '<div class="load-state"><p>没有排盘记录</p>'
      + '<a href="/liuyao/" style="color:var(--accent);font-size:0.85rem;text-decoration:none;margin-top:0.5rem;display:inline-block">返回排盘</a></div>';
    return;
  }

  var data, result;
  try {
    // 管理员查看（后台点进来的）：用 admin token
    var token = isAdmin ? localStorage.getItem('sqw_admin_token') : AUTH.getToken();
    var headers = token ? { 'Authorization':'Bearer '+token } : {};
    var resp = await fetch('/api/liuyao-records/'+id, { headers:headers });
    if (!resp.ok) {
      area.innerHTML = '<div class="load-state"><p>排盘记录不存在或已删除</p></div>';
      return;
    }
    data = await resp.json();
    result = typeof data.result_data === 'string' ? JSON.parse(data.result_data) : data.result_data;
  } catch(e) {
    area.innerHTML = '<div class="load-state"><p>加载失败，请重试</p></div>';
    return;
  }
  if (!result) { area.innerHTML = '<div class="load-state"><p>这条记录里没有排盘数据</p></div>'; return; }

  result.topic = data.topic || result.topic || '';
  var createdAt = data.created_at
    ? (data.created_at instanceof Date ? data.created_at.toISOString() : String(data.created_at))
    : (result.createdAt || '');

  var card = cardFromResult(result);
  if (!card) { area.innerHTML = '<div class="load-state"><p>这条记录里没有卦（老记录缺卦号）</p></div>'; return; }

  // 装卦：与排盘页、与 AI 走同一个端点同一条出口
  var pay;
  try {
    var presp = await fetch('/api/liuyao/paipan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card)
    });
    pay = await presp.json();
    if (!presp.ok || !pay.chart) {
      area.innerHTML = '<div class="load-state"><p>装卦失败：' + escHtml((pay && pay.error) || ('HTTP ' + presp.status)) + '</p></div>';
      return;
    }
  } catch(e) {
    area.innerHTML = '<div class="load-state"><p>装卦请求失败，请检查网络后重试</p></div>';
    return;
  }

  area.innerHTML = renderLiuyaoResult(pay.chart, pay.display, {
    topic: card.topic,
    gender: card.gender,
    method: card.method,
    divinationTime: card.divinationTime,
    createdAt: createdAt,
    recordId: id,
    lunarInfo: card.lunarInfo,
    savedAnalysis: data.ai_analysis || ''
  });
  // 盘已经在了 → 把 AI 块摆出来（存过解读就直接展示，没有就是「开始解卦」）。
  // `savedAnalysis` 是 renderLiuyaoResult() 从 meta 里设好的，故这一句放它后面。
  if (typeof refreshAIPanel === 'function') refreshAIPanel();
}

// 老文件最后一行是裸调 `load();`。ESM 里没有「模块一求值就干活」的余地可控顺序，
// 所以这句挪到 `./result.jsx` 的装载段末尾（那里 flushSync 已经把 `#contentArea`
// 提交进 DOM，`load()` 第一句就 getElementById 它）。时序等价，见 result.jsx 注释。
