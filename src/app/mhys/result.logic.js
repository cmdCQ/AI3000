// 梅花易数结果页（`/mhys/result.html?id=<记录id>`）的命令式逻辑 —— 阶段 3 第 11 页。
// 逐字搬运自 `src/web/js/page-mhys-result.js`（85 行）。
// ==========================================================================
//
// 与六爻那一页（`src/app/liuyao/result.logic.js`）同一形态：老脚本是一条直线 ——
// 取 id → 拉记录 → 填几个全局 → 渲染 → 摆 AI 块。所以本文件与老文件的函数体
// **逐字节相同**（除 `export ` 与文件末尾那句被挪走的裸调 `load();`）。
//
// 本文件**不许 import 任何东西**（同 `liuyao/result.logic.js` 的规矩）：它要对拍老脚本，
// import 进来的东西在老沙箱里没有对应物。依赖的全局（浏览器里由传统 script 提供）：
//   · `AUTH`              `/js/auth.js`          —— `getToken()`
//   · `renderResult`      `/js/mhys_render.js`   —— 结果区渲染层（与排盘页同一份）
//   · `renderAnalysis`    `/js/mhys_render.js`   —— 解卦区
//   · `refreshAIPanel`    `/js/ai_panel.js`      —— 盘已在 DOM 里之后把 AI 块摆出来
//   · `currentResultMeta` / `currentAiPayload` / `currentRecordId` / `savedAnalysis`
//                         `/js/mhys_render.js:54-57` 的 `var` 全局。
//     ⚠ 这四个是**赋值**不是声明：ESM 是严格模式，只有「老脚本用 `var` 建过的全局」
//       才能这样裸赋值；名字不存在会抛 ReferenceError（会被下面的 try 吞成
//       「加载失败，请重试」—— 那种绿是假的，判据里专门有一条盯它）。
/* global AUTH, renderResult, renderAnalysis, refreshAIPanel,
          currentResultMeta, currentAiPayload, currentRecordId, savedAnalysis */

export async function load() {
  var area = document.getElementById('contentArea');
  var urlParams = new URLSearchParams(window.location.search);
  var id = urlParams.get('id');
  var isAdmin = urlParams.get('admin') === '1';

  if (id) {
    try {
      var token;
      if (isAdmin) {
        // 管理员查看：使用 admin token
        token = localStorage.getItem('sqw_admin_token');
      } else {
        token = AUTH.getToken();
      }
      var headers = token ? { 'Authorization':'Bearer '+token } : {};
      var resp = await fetch('/api/mhys-records/'+id, { headers:headers });
      if (!resp.ok) {
        area.innerHTML = '<div class="load-state"><p>排盘记录不存在或已删除</p></div>';
        return;
      }
      var data = await resp.json();
      var result = typeof data.result_data === 'string' ? JSON.parse(data.result_data) : data.result_data;
      result.topic = data.topic;
      result.createdAt = data.created_at ? new Date(data.created_at) : null;
      currentResultMeta = {
        divinationTime: result.divinationTime || '',
        createdAt: result.createdAt ? (result.createdAt instanceof Date ? result.createdAt.toISOString() : result.createdAt) : (data.created_at || ''),
        method: result.method || ''
      };
      currentAiPayload = {
        numbers: result.numbers || '',
        lunarInfo: result.lunarInfo || {}
      };
      area.innerHTML = renderResult(result);
      renderAnalysis();
      // ⚠ 这两项**必须在 renderResult() 之后**挂：那个函数会把与「上一卦」绑定的
      //   状态清空（savedAnalysis / currentRecordId）。顺序反过来 = 从记录点进来时
      //   既看不到已存的解读、解析也没法回写这条记录。
      currentRecordId = id;
      savedAnalysis = data.ai_analysis || '';
      // 盘已经在了 → 把 AI 块摆出来（有存过的解读就直接展示，没有就是「开始解卦」）。
      // 必须在上面两行**之后**：早了 panel 认不到这份解析，画的还是「开始解卦」。
      if (typeof refreshAIPanel === 'function') refreshAIPanel();
    } catch(e) {
      area.innerHTML = '<div class="load-state"><p>加载失败，请重试</p></div>';
    }
  } else {
    var stored = localStorage.getItem('mhys_result') || sessionStorage.getItem('mhys_result');
    if (!stored) {
      area.innerHTML = '<div class="load-state"><p>没有排盘结果</p><a href="/mhys/" style="color:var(--accent);font-size:0.85rem;text-decoration:none;margin-top:0.5rem;display:inline-block">返回排盘</a></div>';
      return;
    }
    localStorage.removeItem('mhys_result');
    sessionStorage.removeItem('mhys_result');
    var result = JSON.parse(stored);
    currentResultMeta = {
      divinationTime: result.divinationTime || '',
      createdAt: result.createdAt || '',
      method: result.method || ''
    };
    currentAiPayload = {
      numbers: result.numbers || '',
      lunarInfo: result.lunarInfo || {}
    };
    area.innerHTML = renderResult(result);
    renderAnalysis();
    // ⚠ 这个分支**没有 await**（数据直接从 localStorage 读），所以跑到这儿时页面还在
    //    解析中，末尾的 `/js/ai_panel.js` 很可能还没执行 —— 直接调会静默什么都不发生。
    //    等 DOMContentLoaded：解析阻塞型脚本全都执行完之后才触发，那时引擎一定在了。
    //    （上面 id 分支有 fetch 的 await，那时 DOM 早已就绪，直接调即可。）
    //    —— 顺带一提：现在没有页面往 localStorage 写 `mhys_result` 了（排盘改成原地出
    //    结果），这条路是旧版留下的，留着是为了别让老链接白屏。
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        if (typeof refreshAIPanel === 'function') refreshAIPanel();
      });
    } else if (typeof refreshAIPanel === 'function') {
      refreshAIPanel();
    }
  }
}

// 老文件最后一行是裸调 `load();`。ESM 里没有「模块一求值就干活」的余地可控顺序，
// 所以这句挪到 `./result.jsx` 的装载段末尾（那里 flushSync 已经把 `#contentArea`
// 提交进 DOM，`load()` 第一句就 getElementById 它）。时序等价，见 result.jsx 注释。
