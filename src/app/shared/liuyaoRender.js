// 阶段 4 cut-over：由 `src/web/js/liuyao_render.js` 逐字搬来，只给顶层声明加了 `export `。
import { escHtml } from './uiCommon.js';
// §5.2c：卦象解析卡与梅花用**同一份**渲染函数（`renderHexDetail`）。复制一份改两处
// 就必然慢慢分叉 —— 用户看到的是「同一种卡长两个样」。环依赖说明：mhysRender 也
// import 本模块，但双方都只在**函数体内**用对方的绑定（不在模块顶层读值），
// 函数声明提升后不会踩 TDZ。
import { renderHexDetail } from './mhysRender.js';
import { getHexagramByTrigrams } from './hexagramsData.js';
// 六爻结果渲染层 —— 盘面**一律来自后端** `/api/liuyao/paipan` 的返回值。
//
// 本文件不含任何装卦逻辑（纳甲、六亲、六神、世应、旺衰、用神都在后端
// `src/server/paipan/liuyao.js`）。这里只做两件事：把 `chart` 摆成盘面、
// 把 `display` 摆进信息表。**别在这加表、别在这算**：前端一旦自己算一份，
// 就会和 AI 读到的那份慢慢分叉，而用户分辨不出来（两边都是「一个卦」）。
//
// 布局照用户 2026-09-25 给的参考图，样式取梅花结果页那一套
// （`css/mhys_result.css` 的令牌与卡片 + 本页自己的 `css/liuyao_result.css`）。
//
// 入口：renderLiuyaoResult(chart, display, meta) → HTML 字符串，插进 DOM 即可。
//   meta = { topic, gender, method, divinationTime, createdAt, recordId }
//   顺手设好这些全局（AI 面板与追问都从这里取）：
//     currentChart / currentDisplay / currentTopic / currentGender
//     currentResultMeta / currentRecordId / savedAnalysis
//   本函数**没有**「插进 DOM 之后还得再调一次」的第二步 —— 盘面与要点都是
//   现成字符串，不像梅花那边要等 `#analysisArea` 落进 DOM。

export var LY_METHOD_NAMES = { coin: '铜钱摇卦', manual: '手动指定', auto: '自动起卦' };
export var LY_YAO_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

// 本页的当前状态 —— `js/liuyao_ai_panel.js` 的配置钩子读的就是这几个名字
export var currentChart = null;
export var currentDisplay = {};
export var currentTopic = '';
export var currentGender = 'male';
export var currentRecordId = null;
export var savedAnalysis = '';
export var currentResultMeta = { divinationTime: '', createdAt: '', method: '' };
// 四柱（cardData 里要带一份，后端拿它与起卦时刻互证；老记录的 lunarInfo 原样带上）
export var currentLunarInfo = {};

// 盘面用的单字简称 —— 参考图上六亲与六神都是单字，盘面才排得下
export var LY_LIUQIN_ABBR = { 父母: '父', 兄弟: '兄', 子孙: '孙', 妻财: '财', 官鬼: '官' };
export var LY_LIUSHEN_ABBR = { 青龙: '龙', 朱雀: '雀', 勾陈: '勾', 腾蛇: '蛇', 螣蛇: '蛇', 白虎: '虎', 玄武: '玄' };

export function lyAbbr(map, v) { return map[v] || v || ''; }

/**
 * 爻符：复用梅花页那套 `.yao-yang` / `.yao-yin`（同一份 CSS，两页画法必然一致）。
 *
 * ⚠ 原来写的是 `class="yao-yang ly-bar"` —— **阳爻整条不显示**（用户报的
 * 「阳爻根本不显示」）。原因：高度那一条在 `.yao-line` 上
 * （`mhys_result.css`：`.yao-line{height:4px;border-radius:2px}`），
 * 而 `.yao-yang` 只有 `width:34px; background` —— 于是阳爻是个
 * 「有底色、高 0」的盒子，什么也看不见；阴爻却照常显示，因为
 * `.yao-yin span` 自己带 `height:4px`。所以肉眼看到的正是
 * 「阳爻不见、阴爻好端端的」这种不对称。
 *
 * 而 `ly-bar` 这份 CSS 里**从来没有过**（全站只有 `ai-chat/index.html` 里一个
 * 不相干的 `.card-ly-row .ly-bar`，且它用的是 `.b-yang/.b-yin`）：写过但没生效的
 * 类名，反倒把梅花那套真正给高度的 `yao-line` 挤掉了。
 * 注释说「复用梅花页那套」是对的，只是**漏了那个真正起作用的类名**。
 */
export function lyBar(yang) {
  return yang
    ? '<div class="yao-line yao-yang"></div>'
    : '<div class="yao-line yao-yin"><span></span><span></span></div>';
}

/** 动爻记号：老阳 ○、老阴 ×（图上是用 X→ 引到变爻那一列） */
export function lyMoveMark(yang) { return (yang ? '○' : '×') + '→'; }

/** 'YYYY-MM-DD HH:MM:SS' → 'YYYY年MM月DD日 HH:MM'（参考图上日期那一行的写法） */
export function lyFormatDate(raw) {
  if (!raw) return '';
  var m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!m) return String(raw);
  return m[1] + '年' + m[2] + '月' + m[3] + '日 ' + m[4] + ':' + m[5];
}

/** 四柱：月建日辰是断卦的提纲，图上用红色标出来 —— 这一处颜色是**有意义的**，别当成装饰删掉 */
export function lyGzCells(chart) {
  var cells = [['年', chart.yearGZ, ''], ['月', chart.monthGZ, ' ly-gz-key'], ['日', chart.dayGZ, ' ly-gz-key'], ['时', chart.hourGZ, '']];
  var h = '';
  for (var i = 0; i < cells.length; i++) {
    h += '<td class="ly-td-sub'+cells[i][2]+'">'+escHtml(cells[i][1] || '—')+'</td>';
  }
  return h;
}

/** 空亡：四柱各按自己的干支起旬（后端 display.kong 给的就是这个） */
export function lyKongCells(display) {
  var k = (display && display.kong) || {};
  var order = [k.year, k.month, k.day, k.hour];
  var h = '';
  for (var i = 0; i < 4; i++) {
    h += '<td class="ly-td-sub ly-td-muted">'+escHtml(order[i] || '—')+'</td>';
  }
  return h;
}

/** 排盘信息表：事项 / 日期 / 卦式 / 节气 / 干支 / 空亡 / 神煞（参考图自上而下就是这几行） */
export function lyInfoCard(chart, display, meta) {
  var d = display || {};
  var h = '<div class="card ly-info-card">';
  h += '<table class="ly-info-table">';

  if (meta.topic) {
    h += '<tr><td class="ly-td-label">事项</td><td class="ly-td-value" colspan="4">'+escHtml(meta.topic)+'</td></tr>';
  }

  var dateText = lyFormatDate(meta.divinationTime || meta.createdAt);
  if (d.lunar) dateText += ' (' + d.lunar + ')';
  if (dateText) {
    h += '<tr><td class="ly-td-label">日期</td><td class="ly-td-value" colspan="4">'+escHtml(dateText)+'</td></tr>';
  }

  if (meta.method) {
    h += '<tr><td class="ly-td-label">卦式</td><td class="ly-td-value" colspan="4">【'+escHtml(LY_METHOD_NAMES[meta.method] || meta.method)+'】</td></tr>';
  }

  var jq = d.jieQi;
  if (jq && jq.name) {
    var jqText = jq.name + (jq.at ? jq.at.replace(/-/g, '.') : '')
      + ' ~ ' + jq.nextName + (jq.nextAt ? ' ' + jq.nextAt.replace(/-/g, '.') : '');
    h += '<tr><td class="ly-td-label">节气</td><td class="ly-td-value ly-td-small" colspan="4">'+escHtml(jqText)+'</td></tr>';
  }

  // 四柱表头：`干支` / `空亡` 两行各有 4 个值却**没有表头**，用户看不出哪一格是年、
  // 哪一格是时 —— 而顺序在代码里本来就是 `[年, 月, 日, 时]`（见 `lyKongCells`），
  // 只是没印出来。北极星是「服务于不懂的人」，这一行不能省。
  // 复用既有的 `.ly-td-sub/.ly-td-muted`（与空亡那行的字重一致），不新增样式。
  h += '<tr class="ly-td-head"><td class="ly-td-label"></td>'
     + '<td class="ly-td-sub ly-td-muted">年柱</td><td class="ly-td-sub ly-td-muted">月柱</td>'
     + '<td class="ly-td-sub ly-td-muted">日柱</td><td class="ly-td-sub ly-td-muted">时柱</td></tr>';
  h += '<tr><td class="ly-td-label">干支</td>'+lyGzCells(chart)+'</tr>';
  h += '<tr><td class="ly-td-label">空亡</td>'+lyKongCells(d)+'</tr>';

  var ss = d.shensha;
  if (ss && (ss.guaShen || ss.yiMa || ss.taoHua || ss.riLu)) {
    var items = [];
    if (ss.guaShen) items.push('卦身--' + ss.guaShen);
    if (ss.yiMa) items.push('驿马--' + ss.yiMa);
    if (ss.taoHua) items.push('桃花--' + ss.taoHua);
    if (ss.riLu) items.push('日禄--' + ss.riLu);
    h += '<tr><td class="ly-td-label">神煞</td><td class="ly-td-value ly-td-ss" colspan="4">'
       + items.map(function(t){ return '<span class="ly-ss-item">'+escHtml(t)+'</span>'; }).join('')
       + '</td></tr>';
  }

  h += '</table></div>';
  return h;
}

/** 卦名 + 宫 + 卦型（图上「艮为山(艮)」那一行） */
export function lyGuaTitle(hexMeta, fallbackName, isBen) {
  if (!hexMeta) return escHtml(fallbackName || '');
  var h = escHtml(hexMeta.name || fallbackName || '');
  if (hexMeta.palaceName) h += '<span class="ly-palace">(' + escHtml(hexMeta.palaceName) + ')</span>';
  return h;
}

/** 卦型标注（「本卦：六冲卦」那一行） */
export function lyGuaTags(hexMeta, label) {
  if (!hexMeta) return '';
  var tags = [];
  if (hexMeta.isChongGua) tags.push('六冲卦');
  if (hexMeta.isHeGua) tags.push('六合卦');
  var h = '<span class="ly-tag-label">' + escHtml(label) + (tags.length ? '：' : '') + '</span>';
  h += tags.map(function(t){ return '<span class="ly-tag">' + t + '</span>'; }).join('');
  return h;
}

/**
 * 卦盘 —— 参考图的主体：左本卦、右变卦，自**上爻到初爻**逐行。
 *
 * 每行九格：六神 · 六亲地支五行 · 纳甲干 · 爻符 · 世应 · 动 · 变爻符 · 变六亲地支五行 · 变纳甲干。
 * 动爻那一格的箭头把两侧连起来 —— 图上就是这么画的。
 * 本卦无变（无动爻）时后端给 `chart.bian === null`，此时整列不出现（`.ly-pan-solo`）。
 */
export function lyPanCard(chart, display) {
  var d = display || {};
  var bian = chart.bian;
  var bianLines = d.bianLines || [];
  var hasBian = !!bian && bianLines.length === 6;

  var h = '<div class="card ly-pan-card">';
  h += '<div class="ly-pan-head' + (hasBian ? '' : ' ly-pan-head-solo') + '">';
  h += '<div class="ly-pan-head-cell">' + lyGuaTitle(d.ben, chart.ben.name, true) + '</div>';
  if (hasBian) h += '<div class="ly-pan-head-cell">' + lyGuaTitle(d.bian, bian.name, false) + '</div>';
  h += '</div>';

  h += '<div class="ly-pan' + (hasBian ? '' : ' ly-pan-solo') + '">';
  // 上爻在前：盘面自上而下读
  for (var i = 5; i >= 0; i--) {
    var y = chart.yaos[i];
    if (!y) continue;
    var bl = hasBian ? bianLines[i] : null;
    h += '<div class="ly-row">';
    h += '<span class="ly-c-shen">' + escHtml(lyAbbr(LY_LIUSHEN_ABBR, y.liushen)) + '</span>';
    h += '<span class="ly-c-qin">' + escHtml(lyAbbr(LY_LIUQIN_ABBR, y.liuqin))
       + '<span class="ly-c-gz">' + escHtml(y.dizhi + y.wuxing) + '</span></span>';
    h += '<span class="ly-c-gan">' + escHtml(y.tiangan || '') + '</span>';
    h += '<span class="ly-c-bar' + (y.isMoving ? ' ly-moving' : '') + '">' + lyBar(y.yang) + '</span>';
    h += '<span class="ly-c-shiying">' + (y.isShi ? '世' : (y.isYing ? '应' : '')) + '</span>';
    if (hasBian) {
      h += '<span class="ly-c-move">' + (y.isMoving ? lyMoveMark(y.yang) : '') + '</span>';
      h += '<span class="ly-c-bar">' + lyBar(!!(bl.yinYang)) + '</span>';
      h += '<span class="ly-c-qin ly-c-qin-bian">' + escHtml(lyAbbr(LY_LIUQIN_ABBR, bl.liuqin))
         + '<span class="ly-c-gz">' + escHtml(bl.dizhi + bl.wuxing) + '</span></span>';
      h += '<span class="ly-c-gan">' + escHtml(bl.tiangan || '') + '</span>';
    }
    h += '</div>';
  }
  h += '</div>';

  h += '<div class="ly-pan-foot' + (hasBian ? '' : ' ly-pan-head-solo') + '">';
  h += '<div class="ly-pan-foot-cell">' + lyGuaTags(d.ben, '本卦') + '</div>';
  if (hasBian) h += '<div class="ly-pan-foot-cell ly-pan-foot-bian">' + lyGuaTags(d.bian, '变卦') + '</div>';
  h += '</div>';
  h += '</div>';
  return h;
}

export function renderLiuyaoResult(chart, display, meta) {
  meta = meta || {};
  currentChart = chart;
  currentDisplay = display || {};
  currentTopic = meta.topic || '';
  currentGender = meta.gender || 'male';
  currentRecordId = meta.recordId || null;
  savedAnalysis = meta.savedAnalysis || '';
  currentLunarInfo = meta.lunarInfo || {};
  currentResultMeta = {
    divinationTime: meta.divinationTime || '',
    createdAt: meta.createdAt || '',
    method: meta.method || '',
  };

  if (!chart) {
    return '<div class="load-state"><p>装卦失败，这盘数据不完整</p></div>';
  }

  var h = '';
  h += lyInfoCard(chart, display, meta);
  h += lyPanCard(chart, display);
  return h;
}

/**
 * 卦象解析卡（§5.2c）—— 与梅花页那张**同构**：`renderHexDetail()` 摆核心要义、
 * 卦辞、象传、爻辞详解、现代应用、相关卦象，外面套一张本页的 `.card`。
 *
 * 「本卦不显示变卦」是用户 2026-10-17 的原话：这张卡只讲**本卦**。变卦的卦象
 * 解析在梅花页是另点一下「变卦」才看的；六爻这一屏上盘面已经把变卦那一列画出来了
 * （`.ly-pan` 右侧），再叠一张变卦解析卡，等于同一件事说两遍、还把页面拉长。
 *
 * 卦号取自后端返回的 `chart.ben.upper/lower`（页面自己**不**从爻符反推 —— 那会
 * 在动爻/错卦一类地方与后端分叉），与梅花页同一套查表函数。
 */
export function lyHexCard(chart) {
  var ben = chart && chart.ben;
  if (!ben || ben.upper == null || ben.lower == null) return '';
  var hex = getHexagramByTrigrams(ben.upper, ben.lower);
  if (!hex) return '';
  return '<div class="card ly-hex-card">'
    + '<div class="card-title">☯ 卦象解析 · 本卦</div>'
    + '<div class="hex-detail-card">' + renderHexDetail(hex) + '</div>'
    + '</div>';
}

/**
 * 发给 `/api/chat/send` 的 cardData —— 与后端 `prompt.liuyaoVars` 认的字段对齐。
 *
 * **只送起卦结果与四柱**，不送六亲六神世应：那些由后端自己装（它只认上下卦号）。
 * 从前这里塞了一整份前端装的卦（`gong`/`shiYao`/`liuqin[]`/`liushen[]`），
 * 后端签收后丢掉 —— 既让「前端算错」有可能悄悄传进去，又让人误以为后端在用它们。
 */
export function buildLiuyaoAiPayload() {
  var chart = currentChart;
  if (!chart) return null;
  var ben = chart.ben || {}, bian = chart.bian || {};
  return {
    topic: currentTopic || '',
    divinationTime: currentResultMeta.divinationTime || currentResultMeta.createdAt || '',
    gender: currentGender,
    method: currentResultMeta.method || '',
    lunarInfo: currentLunarInfo || {},
    hexagrams: {
      gender: currentGender,
      benGua: {
        name: ben.name || '',
        upper: ben.upper, lower: ben.lower,
        upperTri: { name: ben.upperName || '' }, lowerTri: { name: ben.lowerName || '' },
      },
      bianGua: {
        name: bian.name || '',
        upper: bian.upper, lower: bian.lower,
        upperTri: { name: bian.upperName || '' }, lowerTri: { name: bian.lowerName || '' },
      },
    },
  };
}

// ── 跨模块读取器 / 写入器（§4.41 的 B 案）──────────────────────────────
// 这些是模块内的可变状态，别的模块（两个 `*_ai_panel` 的 conf）只能通过函数读写，
// 不能直接 import 变量 —— 读可以（live binding），写不行。
// ★ 这是全批唯一需要 setter 的地方：`ai_panel` 调 `conf.setSaved(v)`，
//   而那行赋值落在本模块的 `savedAnalysis` 上。
export function getCurrentChart() { return currentChart; }
export function getCurrentTopic() { return currentTopic; }
export function getCurrentRecordId() { return currentRecordId; }
export function getSavedAnalysis() { return savedAnalysis; }
export function setSavedAnalysis(v) { savedAnalysis = v; }

// 阶段 4：模块 A 的 state 由模块 B 写入，ESM 的 import 绑定不可赋值，所以给写方一对 setter。
export function setCurrentTopic(v) { currentTopic = v; }
export function setCurrentGender(v) { currentGender = v; }
export function setCurrentRecordId(v) { currentRecordId = v; }
export function setCurrentResultMeta(v) { currentResultMeta = v; }
