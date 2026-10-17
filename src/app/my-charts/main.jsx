import '../shared/authModalStyles.js';
import { BaziAI } from '../shared/baziAiPanel.js';
import { BaziRender } from '../shared/baziRender.js';
// 「我的命盘」页 —— 阶段 3 第 1 页。逐字搬运自
// `src/web/js/page-my-charts.js`（快照见 `duipan/legacy_ref/page-my-charts.js`）。
// ==========================================================================
//
// ─────────────────────────────────────────────────────────────
// 架构：外壳是 React，内容区是**命令式**的（与 ai-chat 同一形态）
// ─────────────────────────────────────────────────────────────
// React 只负责静态外壳（`.mc-page > #mc-content` 与底部导航）；列表 / 详情 / 空态
// 仍然是老代码那套 `document.getElementById('mc-content').innerHTML = h`。
//
// 为什么内容区不改成 React 列表渲染：这一页的 HTML 里有**内联 onclick**
// （`toggleMenu` / `doDelete` / `location.href`），而 `BaziRender.render()` 与
// `BaziAI.mount()` 是两个还没搬的 classic script，它们**自己往容器里写 DOM**。
// 让 React 也去管那几块，就是两个写入者抢同一片 DOM —— 那是回归，不是重构。
// 判定标准很简单：**等 bazi_render.js / bazi_ai_panel.js 搬完，再一起改成声明式。**
//
// 渲染字符串本身全在 `src/app/lib/myChartsView.js`（纯函数、与老实现逐字节对拍），
// 本文件只做「取数 → 决定走哪条路 → 写进去」。
// ─────────────────────────────────────────────────────────────

import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

import { isLoggedIn } from '../lib/auth.js'
import {
  GAN, ZODIAC_EMOJI, ZODIAC_NAMES,
  renderEmptyHTML, renderListHTML, renderDetailHTML, renderDetailFallbackHTML,
  detailMetaOf,
} from '../lib/myChartsView.js'
import './style.css'
import { ChartsStore } from '../shared/chartsStore.js'

// ===== 入口分派（老 :8-10）=====
var params = new URLSearchParams(window.location.search);
var chartId = params.get('id');
var isAdminView = params.get('admin') === '1';

function setContent(html) {
  document.getElementById('mc-content').innerHTML = html;
}

function renderEmpty(icon, title, desc, link, btnText) {
  setContent(renderEmptyHTML({ icon, title, desc, link, btnText }));
}

// ============================================================
// 列表（老 :28-71）
// ============================================================
async function loadList() {
  var charts;
  try { charts = await ChartsStore.getAll(); }
  catch(e) {
    renderEmpty(e&&e.status===401?'🔒':'⚠️', e&&e.status===401?'登录已过期':'加载失败', e&&e.status===401?'请重新登录后再查看':'请稍后重试或返回首页', e&&e.status===401?'/login/':'/', e&&e.status===401?'重新登录':'返回首页');
    return;
  }

  if (!charts||!charts.length) { renderEmpty('📜','还没有命盘','添加一份命盘，开始记录你的出生信息','/charts/?action=create','新建命盘'); return; }

  setContent(renderListHTML(charts));
}

// ============================================================
// 详情（老 :77-97）
// ============================================================
async function loadDetail(id) {
  var chart;
  if (isAdminView) {
    // 管理员查看：调用 admin API
    try {
      var adminToken = localStorage.getItem('sqw_admin_token');
      var resp = await fetch('/api/admin/chart-detail/' + id, {
        headers: { 'Authorization': 'Bearer ' + adminToken }
      });
      if (resp.ok) chart = await resp.json();
    } catch(e) {}
  } else {
    try { chart = await ChartsStore.get(id); } catch(e) {}
  }
  if (!chart) {
    setContent('<div class="mc-loading">命盘不存在或已删除</div><div style="text-align:center;margin-top:-4rem"><a href="/my-charts/" class="mc-empty empty-btn" style="display:inline-block;background:transparent;color:var(--accent);border:1px solid var(--accent)">← 返回列表</a></div>');
    return;
  }
  renderDetail(chart);
}

// ============================================================
// 详情：**盘由后端现算**，页面只发出生原始参数（老 :100-197）
// ============================================================
//
// 老页那段注释值得留在原地，因为它是这一页最重要的规矩：
//   从前这一页自己算四柱，与 `charts/index.html` 里的另一份、以及写库时的快照，
//   同一件事三处实现 —— 而「两边各算一份、慢慢对不上」正是本项目最痛的病。
//   现在页面**一个字都不算**：`POST /api/bazi/paipan` 走的是对拍过的 `paipan/`，
//   而且**让 AI 读的那段 prompt 与页面上这张盘出自同一个函数**，不可能分叉。
function renderDetail(chart) {
  var model = detailMetaOf(chart);
  var birthReq = model.birthReq;
  var meta = model.meta;

  // ★ 顺序是**被测行为**，不能反：先同步把骨架（#baziChart 里那句「正在排盘…」）
  //   写进去，再发 fetch。差值脚本 `legacy_my_charts.js` 的桩默认让 paipan
  //   **永不 resolve**，所以它比到的正好是这一份骨架 —— 顺序反了当场红。
  setContent(renderDetailHTML(chart, { isAdminView: isAdminView }));

  fetch('/api/bazi/paipan', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(birthReq),
  }).then(function (r) {
    return r.json().then(function (j) { return { ok: r.ok, j: j }; });
  }).then(function (r) {
    // ⚠ 这里 **`r.status` 是 undefined** —— 老实现就是这个毛病，照搬没修：
    //   上一个 then 只回传了 `{ok, j}`，没带 status，所以真出错时用户看到的是
    //   「排盘失败（undefined）」。**要不要修是产品决定，不是搬运能顺手带的**；
    //   差分里的退路用例是直接构造 `new Error('排盘失败（500）')` 喂进去比的，
    //   所以它盖不住这段。父会话已把这个缺陷记进回报，等拍板。
    if (!r.ok) throw new Error((r.j && r.j.error) || ('排盘失败（' + r.status + '）'));
    var resp = r.j;
    // 阳年/阴年、乾造/坤造：从**服务端的年干**取，不从 birthYear 推
    // （公历年推干支在「1月1日–立春」之间是错的）
    var yGan = (resp.chart && resp.chart.year_pillar && resp.chart.year_pillar.tiangan) || '';
    var gi = GAN.indexOf(yGan);
    if (gi >= 0) {
      meta.yinYang = (gi % 2 === 0) ? '阳' : '阴';
      meta.zao = (chart.gender === 'male') ? '乾造' : '坤造';
    }
    var zx = resp.display && resp.display.shengxiao;
    if (zx) {
      var zi = ZODIAC_NAMES.indexOf(zx);
      if (zi >= 0) document.getElementById('baziZodiac').textContent = ZODIAC_EMOJI[zi];
    }
    // bazi_render.js / bazi_ai_panel.js 已搬进 `src/app/shared/`（阶段 4），直接调模块导出。
    BaziRender.render(document.getElementById('baziChart'), resp, meta,
      document.getElementById('baziRest'));
    if (!isAdminView) {
      BaziAI.mount(document.getElementById('baziAi'), { chartId: chart.id, birth: birthReq });
    }
  }).catch(function (e) {
    renderDetailFallback(chart, meta, e);
  });
}

/** 老 :204-229。字符串在纯函数里，这里只负责写 + 清。 */
function renderDetailFallback(chart, meta, err) {
  var el = document.getElementById('baziChart');
  if (!el) return;
  el.innerHTML = renderDetailFallbackHTML(chart, meta, err);
  var ai = document.getElementById('baziAi');
  if (ai) ai.innerHTML = '';
  // 其余那块也要清空：退路是「这一次排盘没取到」，若留着上一次的细盘/大运，
  // 用户会把上一份盘的大运当成这一张的（切换命盘时最容易撞上）。
  var rest = document.getElementById('baziRest');
  if (rest) rest.innerHTML = '';
}

// ============================================================
// ⋯ 弹出菜单（老 :264-295）
// ============================================================
// 这三个名字**必须挂在 window 上**：列表 / 详情 / 菜单的 HTML 字符串里写死了
// 内联 `onclick="toggleMenu(…)"` / `"doDelete(…)"`。老页是 classic script，
// 顶层函数天然是全局；ESM 里不是 —— 不挂就是「点⋯毫无反应 / 点删除毫无反应」。
// 阶段 4 收口时把内联 onclick 一起换成 React 事件，这三个挂载跟着消掉。
window.toggleMenu = function(chartId, chartName) {
  // ⚠ 老实现这行写的是裸 `event.stopPropagation()`。classic script 里裸 `event` 解析到
  //   `window.event`（内联 onclick 派发时浏览器会设它）；ESM 里没有裸名 `event`，
  //   必须显式取。守卫是为了「手动调用时 window.event 为 undefined」不炸 ——
  //   真实点击路径上它一定有值，所以线上行为不变。
  var ev = window.event;
  if (ev && ev.stopPropagation) ev.stopPropagation();
  var menu = document.getElementById('card-menu');
  if (menu && menu.dataset.chartId === chartId) { closeMenu(); return; }
  closeMenu();

  var btn = document.querySelector('#card-'+chartId+' .card-arrow');
  var rect = btn.getBoundingClientRect();

  var overlay = document.createElement('div');
  overlay.className = 'card-menu-overlay';
  overlay.onclick = closeMenu;

  var popup = document.createElement('div');
  popup.className = 'card-menu-popup';
  popup.id = 'card-menu';
  popup.dataset.chartId = chartId;
  popup.style.top = (rect.bottom + 4) + 'px';
  popup.style.right = (window.innerWidth - rect.right) + 'px';

  popup.innerHTML =
    '<button class="menu-item" onclick="closeMenu();location.href=\'/charts/?action=edit&id='+chartId+'\'">编辑命盘</button>' +
    // §5.4（用户 2026-10-17）：菜单项前的 🗑 去掉 —— 同一份菜单里的「编辑命盘」没有
    // 图标，只有这一项带 emoji，视觉上像两个来源拼起来的；`.menu-item.danger` 的
    // 红色文字已经把「这是删操作」说清楚了，不需要再挂一个图标。
    '<button class="menu-item danger" onclick="closeMenu();doDelete(\''+chartId+'\')">删除命盘</button>';

  overlay.appendChild(popup);
  document.body.appendChild(overlay);
};

window.closeMenu = function() {
  var m = document.getElementById('card-menu');
  if (m) { var p = m.parentElement; if (p) p.remove(); }
};

// ============================================================
// 删除（老 :301-305）
// ============================================================
window.doDelete = async function(id) {
  if (!confirm('确定删除这个命盘吗？删除后不可恢复 (｡•́︿•̀｡)')) return;
  try { await ChartsStore.remove(id); window.location.href='/my-charts/'; }
  catch(e) { alert('删除失败: '+(e.message||'请稍后重试')); }
};

// ============================================================
// React 外壳
// ============================================================
// 只有静态结构；#mc-content 的初值必须与老页一模一样（`加载中…`），因为
// 「先渲染骨架再 fetch」这条顺序是从这里开始的。
function MyChartsPage() {
  return (
    <>
      <div className="mc-page">
        <div id="mc-content">
          <div className="mc-loading">加载中…</div>
        </div>
      </div>

      <nav className="mc-bottom-nav">
        <button className="mc-nav-item" onClick={function () { location.href='/'; }}>命理与术数</button>
        <button className="mc-nav-item active">我的命盘</button>
        <button className="mc-nav-item" onClick={function () { location.href='/my/'; }}>我的</button>
      </nav>
    </>
  );
}

// ===== 挂载 =====
// `flushSync` 在这里是**正确性**需要，不是性能：`initPage()` 会同步往
// `#mc-content` 写第一屏（空态 / 列表 / 骨架）。React 18+ 的 `root.render()` 默认是
// 并发渲染，不保证在这一行之前把外壳提交进 DOM —— 那样 `getElementById('mc-content')`
// 就是 null，`setContent` 当场炸。同步提交才排得掉这个竞态。
// （老页没这问题：它是 classic script，写 innerHTML 时那个容器早已在 HTML 里。）
const root = createRoot(document.getElementById('root'));
flushSync(function () {
  root.render(<MyChartsPage />);
});

// ===== 入口分派（老 :20-22）=====
// 老代码是 IIFE 顶层直接跑；这里改成「mount 之后立刻跑」，时序等价
// （都在页面可交互之前），而且此时 #mc-content 一定在了（见上面的 flushSync）。
function initPage() {
  if (!isLoggedIn() && !isAdminView) { renderEmpty('🔒','登录后查看命盘','保存多份出生信息，随时管理','/login/','去登录'); return; }
  if (chartId) { loadDetail(chartId); } else { loadList(); }
}
initPage();
