// ===== 加载数据 =====
async function load() {
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
      //   状态清空（savedAnalysis / currentRecordId，理由写在它里面）。
      //   顺序反过来 = 从记录点进来时既看不到已存的解读、解析也没法回写这条记录。
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

load();
