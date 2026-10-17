// 六爻 / 梅花两张「排盘记录」页共用的一份控制器：列表、搜索、多选、删除、跳详情。
// ==========================================================================
//
// 为什么共用（不是「顺手抽一层」）：两份老脚本是**逐字节相同**的，只差两张常量表。
//
//   sed 's/mhys/PAGE/g; s/梅花/PAGE/g'   src/web/js/page-mhys-history.js   > a
//   sed 's/liuyao/PAGE/g; s/六爻/PAGE/g' src/web/js/page-liuyao-history.js > b
//   diff a b   →  9 行，全是 EMOJI_MAP / METHOD_NAMES
//
// 其余 13 个函数（formatTime / escHtml / toggleManage / toggleSelectAll /
// updateSelectedCount / onSearch / clearSearch / getFilteredRecords / renderCards /
// toggleCard / deleteSelected / viewRecord / loadRecords）逐字节一样。所以这里**只留一份**，
// 两页之间的差别收成三个 URL 参数。写第二份就等于把「两页各算一次」的老毛病带进新树。
//
// 谁在用（此刻）：`src/app/liuyao/history.jsx` → `./history.logic.js` 里的 `CONFIG`。
// 下一户：梅花记录页，切过去时传 `{ listUrl:'/api/mhys-records',
//   detailsUrl:'/mhys/result.html?id=', homeUrl:'/mhys/' }` —— **不要再抄一份**。
//   （过渡期里 `src/web/js/page-mhys-history.js` 仍是线上那份；与 `lib/auth.js`
//   对 `src/web/js/auth.js` 的关系同形：老树清空时本文件成为唯一一份。）
//
// 常量表取**两份的并集**：梅花那份多三个后端起卦法名（number / split / character），
// 六爻只用到 time / manual / num1 / num2 / auto。查不到的键本来就会 fallback 成原始代码
// （`METHOD_NAMES[r.method] || r.method`、`EMOJI_MAP[r.method] || '☯'`），所以六爻多三个
// 用不上的键**行为不变**，而以后新起卦法只改这一处。
//
// 函数体与老脚本逐字节一致（判据：`duipan/diff_liuyao_result_history.mjs` 逐字比对，
// 老六爻那份与老梅花那份各比一遍）。只有三处为参数化改了写法，全在下面标了 `★ 参数`：
//   `/api/liuyao-records` → `listUrl`、`/liuyao/result.html?id=` → `detailsUrl`、
//   `/liuyao/` → `homeUrl`。除此之外一个字符都没动。

// 新记录的起卦法代码是后端起卦法名（number/split/character），
// `num1`/`num2` 是旧记录里的代码，留作别名，老记录才不会只显示代码。
export const EMOJI_MAP = {
  time: '🕐', manual: '✋', number: '🔢', split: '🔢', character: '✍️',
  num1: '🔢', num2: '🔢', auto: '🎲'
};

export const METHOD_NAMES = { time:'时间起卦', manual:'手动指定', auto:'自动起卦',
  number:'报数起卦（三个数）', split:'报数起卦（拆半求和）', character:'字占（按笔画）',
  num1:'数字起卦1', num2:'数字起卦2' };

/**
 * 造一份记录页控制器。
 *
 * @param {{listUrl:string, detailsUrl:string, homeUrl:string}} cfg
 *   - `listUrl`      记录列表 / 单条记录的 REST 前缀（`/api/<页>-records`）
 *   - `detailsUrl`   详情页地址前缀，后面接记录 id（`/<页>/result.html?id=`）
 *   - `homeUrl`      空态里「去排盘」的落点（`/<页>/`）
 * @returns 一个页面实例。`state` 是它的可变量（列表 / 管理模式 / 勾选表），
 *          其余是挂到 window 上的那些函数 —— 老页里它们是顶层 `function`/`var`，
 *          这里收进闭包，一页一个实例（差分脚本因此能同时装六爻与梅花两份）。
 */
export function createRecordsHistory(cfg) {
  // ★ 参数：三个 URL。老脚本里它们是以字面量散在 5 个地方的。
  var listUrl = cfg.listUrl;
  var detailsUrl = cfg.detailsUrl;
  var homeUrl = cfg.homeUrl;

  // 老页的三个模块级 `var`。`state.` 前缀是唯一的结构性改写 ——
  // 差分脚本按 `state.` 剥掉再比，两边函数体因此仍逐字节可比。
  var state = { allRecords: [], manageMode: false, selectedIds: {} };

  function formatTime(ts) {
    var d = new Date(ts);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+' '+
           String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  }

  function escHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // ===== 管理模式 =====
  function toggleManage() {
    state.manageMode = !state.manageMode;
    state.selectedIds = {};
    var btn = document.getElementById('manageBtn');
    var actions = document.getElementById('fmActions');
    var clearBtn = document.getElementById('searchClear');
    var wrapper = document.querySelector('.mh-wrapper');

    if (state.manageMode) {
      btn.textContent = '完成';
      btn.classList.add('active');
      actions.classList.add('show');
      wrapper.classList.add('manage-mode');
    } else {
      btn.textContent = '管理';
      btn.classList.remove('active');
      actions.classList.remove('show');
      wrapper.classList.remove('manage-mode');
      clearBtn.classList.remove('visible');
      document.getElementById('searchInput').value = '';
    }
    updateSelectedCount();
    renderCards(state.allRecords);
  }

  function toggleSelectAll() {
    var filtered = getFilteredRecords();
    var allSelected = filtered.every(function(r){ return state.selectedIds[r.id]; });
    if (allSelected) {
      filtered.forEach(function(r){ delete state.selectedIds[r.id]; });
    } else {
      filtered.forEach(function(r){ state.selectedIds[r.id] = true; });
    }
    updateSelectedCount();
    renderCards(state.allRecords);
  }

  function updateSelectedCount() {
    var count = Object.keys(state.selectedIds).length;
    document.getElementById('selectedCount').textContent = '已选 '+count;
    document.getElementById('deleteSelectedBtn').disabled = (count === 0);
  }

  // ===== 搜索 =====
  function onSearch() {
    var val = document.getElementById('searchInput').value.trim();
    var clearBtn = document.getElementById('searchClear');
    if (val) {
      clearBtn.classList.add('visible');
    } else {
      clearBtn.classList.remove('visible');
    }
    renderCards(state.allRecords);
  }

  function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchClear').classList.remove('visible');
    renderCards(state.allRecords);
  }

  function getFilteredRecords() {
    var val = document.getElementById('searchInput').value.trim().toLowerCase();
    if (!val) return state.allRecords;
    return state.allRecords.filter(function(r){
      return (r.topic||'').toLowerCase().indexOf(val) >= 0;
    });
  }

  // ===== 渲染卡片 =====
  function renderCards(records) {
    var area = document.getElementById('contentArea');
    var filtered = getFilteredRecords();

    if (!filtered.length) {
      var msg = document.getElementById('searchInput').value.trim() ? '没有匹配的卦例' : '暂无排盘记录';
      // ★ 参数：`href="/liuyao/"` → `homeUrl`
      area.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><p>'+msg+'</p><a href="'+homeUrl+'" style="color:var(--accent);font-size:0.85rem;text-decoration:none;margin-top:0.5rem;display:inline-block">去排盘</a></div>';
      return;
    }

    var h = '<div class="record-list">';
    filtered.forEach(function(r) {
      var emoji = EMOJI_MAP[r.method] || '☯';
      var isSelected = !!state.selectedIds[r.id];
      var cls = 'record-card' + (state.manageMode && isSelected ? ' selected' : '');
      var methodName = METHOD_NAMES[r.method] || r.method;

      h += '<div class="'+cls+'" ';
      if (state.manageMode) {
        h += 'onclick="toggleCard(\''+r.id+'\')"';
      } else {
        h += 'onclick="viewRecord(\''+r.id+'\')"';
      }
      h += '>';
      if (state.manageMode) {
        h += '<div class="rc-checkbox"></div>';
      }
      h += '<div class="rc-emoji">'+emoji+'</div>';
      h += '<div class="rc-info">';
      h += '<div class="rc-topic">'+escHtml(r.topic||'(无事项)')+'</div>';
      // 卡片显示 recordTime（实际排盘时间），旧版回退
      var timeStr = r.recordTime ? formatTime(r.recordTime) : (r.divinationTime || (r.created_at ? formatTime(r.created_at) : ''));
      h += '<div class="rc-meta"><span>'+methodName+'</span><span>'+timeStr+'</span></div>';
      h += '</div>';
      if (!state.manageMode) {
        h += '<span class="rc-arrow">›</span>';
      }
      h += '</div>';
    });
    h += '</div>';
    area.innerHTML = h;
  }

  function toggleCard(id) {
    if (state.selectedIds[id]) {
      delete state.selectedIds[id];
    } else {
      state.selectedIds[id] = true;
    }
    updateSelectedCount();
    renderCards(state.allRecords);
  }

  // ===== 删除 =====
  async function deleteSelected() {
    var ids = Object.keys(state.selectedIds);
    if (!ids.length) return;
    if (!confirm('确定要删除选中的 '+ids.length+' 条排盘记录吗？')) return;

    var token = AUTH.getToken();
    var headers = token ? { 'Content-Type':'application/json', 'Authorization':'Bearer '+token } : { 'Content-Type':'application/json' };

    var errors = [];
    for (var i=0; i<ids.length; i++) {
      try {
        // ★ 参数：`'/api/liuyao-records/'` → `listUrl+'/'`
        var resp = await fetch(listUrl+'/'+ids[i], { method:'DELETE', headers:headers });
        if (!resp.ok) errors.push(ids[i]);
      } catch(e) {
        errors.push(ids[i]);
      }
    }

    state.selectedIds = {};
    updateSelectedCount();
    await loadRecords();

    if (errors.length) {
      alert('部分记录删除失败');
    }
  }

  function viewRecord(id) {
    if (state.manageMode) return;
    // ★ 参数：`'/liuyao/result.html?id='` → `detailsUrl`
    window.location.href = detailsUrl + id;
  }

  // ===== 加载 =====
  async function loadRecords() {
    var area = document.getElementById('contentArea');
    // 未登录用户 → 引导登录
    if (!AUTH.isLoggedIn()) {
      area.innerHTML = '<div class="empty-state"><div class="empty-icon">👤</div><p style="margin-bottom:0.5rem;color:var(--text)">登录后查看排盘记录</p><p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:1rem">登录后可查看历史排盘和AI解读记录</p><a href="javascript:void(0)" onclick="openAuthModal(\'login\')" class="guest-btn primary" style="display:inline-block;padding:0.5rem 1.5rem;font-size:0.82rem;font-family:inherit;border-radius:14px;cursor:pointer;text-decoration:none;letter-spacing:0.04em;font-weight:500;color:#fff;background:var(--accent);border:none;box-shadow:0 2px 8px rgba(var(--gold-rgb),0.25)">去登录</a></div>';
      return;
    }
    try {
      var token = AUTH.getToken();
      var headers = token ? { 'Authorization':'Bearer '+token } : {};
      // ★ 参数：`'/api/liuyao-records'` → `listUrl`
      var resp = await fetch(listUrl, { headers:headers });
      if (!resp.ok) {
        state.allRecords = [];
        renderCards([]);
        return;
      }
      state.allRecords = await resp.json();
      if (!state.allRecords.length) {
        renderCards([]);
        return;
      }
      // 按实际排盘时间倒序（recordTime），旧记录回退到 created_at
      state.allRecords.sort(function(a,b) {
        var ta = a.recordTime ? new Date(a.recordTime).getTime() : (a.created_at || 0);
        var tb = b.recordTime ? new Date(b.recordTime).getTime() : (b.created_at || 0);
        return tb - ta; // 倒序
      });
      renderCards(state.allRecords);
    } catch(e) {
      state.allRecords = [];
      renderCards([]);
    }
  }

  return {
    state: state,
    formatTime: formatTime,
    escHtml: escHtml,
    toggleManage: toggleManage,
    toggleSelectAll: toggleSelectAll,
    updateSelectedCount: updateSelectedCount,
    onSearch: onSearch,
    clearSearch: clearSearch,
    getFilteredRecords: getFilteredRecords,
    renderCards: renderCards,
    toggleCard: toggleCard,
    deleteSelected: deleteSelected,
    viewRecord: viewRecord,
    loadRecords: loadRecords,
  };
}
