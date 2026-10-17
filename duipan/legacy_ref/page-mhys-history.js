var allRecords = [];
var manageMode = false;
var selectedIds = {};

// 新记录的起卦法代码是后端起卦法名（number/split/character），
// `num1`/`num2` 是旧记录里的代码，留作别名，老记录才不会只显示代码。
var EMOJI_MAP = {
  time: '🕐', manual: '✋', number: '🔢', split: '🔢', character: '✍️',
  num1: '🔢', num2: '🔢', auto: '🎲'
};

var METHOD_NAMES = { time:'时间起卦', manual:'手动指定', auto:'自动起卦',
  number:'报数起卦（三个数）', split:'报数起卦（拆半求和）', character:'字占（按笔画）',
  num1:'数字起卦1', num2:'数字起卦2' };

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
  manageMode = !manageMode;
  selectedIds = {};
  var btn = document.getElementById('manageBtn');
  var actions = document.getElementById('fmActions');
  var clearBtn = document.getElementById('searchClear');
  var wrapper = document.querySelector('.mh-wrapper');
  
  if (manageMode) {
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
  renderCards(allRecords);
}

function toggleSelectAll() {
  var filtered = getFilteredRecords();
  var allSelected = filtered.every(function(r){ return selectedIds[r.id]; });
  if (allSelected) {
    filtered.forEach(function(r){ delete selectedIds[r.id]; });
  } else {
    filtered.forEach(function(r){ selectedIds[r.id] = true; });
  }
  updateSelectedCount();
  renderCards(allRecords);
}

function updateSelectedCount() {
  var count = Object.keys(selectedIds).length;
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
  renderCards(allRecords);
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('searchClear').classList.remove('visible');
  renderCards(allRecords);
}

function getFilteredRecords() {
  var val = document.getElementById('searchInput').value.trim().toLowerCase();
  if (!val) return allRecords;
  return allRecords.filter(function(r){
    return (r.topic||'').toLowerCase().indexOf(val) >= 0;
  });
}

// ===== 渲染卡片 =====
function renderCards(records) {
  var area = document.getElementById('contentArea');
  var filtered = getFilteredRecords();
  
  if (!filtered.length) {
    var msg = document.getElementById('searchInput').value.trim() ? '没有匹配的卦例' : '暂无排盘记录';
    area.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><p>'+msg+'</p><a href="/mhys/" style="color:var(--accent);font-size:0.85rem;text-decoration:none;margin-top:0.5rem;display:inline-block">去排盘</a></div>';
    return;
  }
  
  var h = '<div class="record-list">';
  filtered.forEach(function(r) {
    var emoji = EMOJI_MAP[r.method] || '☯';
    var isSelected = !!selectedIds[r.id];
    var cls = 'record-card' + (manageMode && isSelected ? ' selected' : '');
    var methodName = METHOD_NAMES[r.method] || r.method;
    
    h += '<div class="'+cls+'" ';
    if (manageMode) {
      h += 'onclick="toggleCard(\''+r.id+'\')"';
    } else {
      h += 'onclick="viewRecord(\''+r.id+'\')"';
    }
    h += '>';
    if (manageMode) {
      h += '<div class="rc-checkbox"></div>';
    }
    h += '<div class="rc-emoji">'+emoji+'</div>';
    h += '<div class="rc-info">';
    h += '<div class="rc-topic">'+escHtml(r.topic||'(无事项)')+'</div>';
    // 卡片显示 recordTime（实际排盘时间），旧版回退
    var timeStr = r.recordTime ? formatTime(r.recordTime) : (r.divinationTime || (r.created_at ? formatTime(r.created_at) : ''));
    h += '<div class="rc-meta"><span>'+methodName+'</span><span>'+timeStr+'</span></div>';
    h += '</div>';
    if (!manageMode) {
      h += '<span class="rc-arrow">›</span>';
    }
    h += '</div>';
  });
  h += '</div>';
  area.innerHTML = h;
}

function toggleCard(id) {
  if (selectedIds[id]) {
    delete selectedIds[id];
  } else {
    selectedIds[id] = true;
  }
  updateSelectedCount();
  renderCards(allRecords);
}

// ===== 删除 =====
async function deleteSelected() {
  var ids = Object.keys(selectedIds);
  if (!ids.length) return;
  if (!confirm('确定要删除选中的 '+ids.length+' 条排盘记录吗？')) return;
  
  var token = AUTH.getToken();
  var headers = token ? { 'Content-Type':'application/json', 'Authorization':'Bearer '+token } : { 'Content-Type':'application/json' };
  
  var errors = [];
  for (var i=0; i<ids.length; i++) {
    try {
      var resp = await fetch('/api/mhys-records/'+ids[i], { method:'DELETE', headers:headers });
      if (!resp.ok) errors.push(ids[i]);
    } catch(e) {
      errors.push(ids[i]);
    }
  }
  
  selectedIds = {};
  updateSelectedCount();
  await loadRecords();
  
  if (errors.length) {
    alert('部分记录删除失败');
  }
}

function viewRecord(id) {
  if (manageMode) return;
  window.location.href = '/mhys/result.html?id=' + id;
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
    var resp = await fetch('/api/mhys-records', { headers:headers });
    if (!resp.ok) {
      allRecords = [];
      renderCards([]);
      return;
    }
    allRecords = await resp.json();
    if (!allRecords.length) {
      renderCards([]);
      return;
    }
    // 按实际排盘时间倒序（recordTime），旧记录回退到 created_at
    allRecords.sort(function(a,b) {
      var ta = a.recordTime ? new Date(a.recordTime).getTime() : (a.created_at || 0);
      var tb = b.recordTime ? new Date(b.recordTime).getTime() : (b.created_at || 0);
      return tb - ta; // 倒序
    });
    renderCards(allRecords);
  } catch(e) {
    allRecords = [];
    renderCards([]);
  }
}

loadRecords();
