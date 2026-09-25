// 六爻结果渲染层 —— 盘面**一律来自后端** `/api/liuyao/paipan` 的返回值。
//
// 本文件不含任何装卦逻辑（纳甲、六亲、六神、世应、旺衰、用神都在后端
// `build/backend/paipan/liuyao.js`）。这里只做两件事：把 `chart` 摆成盘面、
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

var LY_METHOD_NAMES = { coin: '铜钱摇卦', manual: '手动指定', auto: '自动起卦' };
var LY_YAO_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

// 本页的当前状态 —— `js/liuyao_ai_panel.js` 的配置钩子读的就是这几个名字
var currentChart = null;
var currentDisplay = {};
var currentTopic = '';
var currentGender = 'male';
var currentRecordId = null;
var savedAnalysis = '';
var currentResultMeta = { divinationTime: '', createdAt: '', method: '' };
// 四柱（cardData 里要带一份，后端拿它与起卦时刻互证；老记录的 lunarInfo 原样带上）
var currentLunarInfo = {};

// 盘面用的单字简称 —— 参考图上六亲与六神都是单字，盘面才排得下
var LY_LIUQIN_ABBR = { 父母: '父', 兄弟: '兄', 子孙: '孙', 妻财: '财', 官鬼: '官' };
var LY_LIUSHEN_ABBR = { 青龙: '龙', 朱雀: '雀', 勾陈: '勾', 腾蛇: '蛇', 螣蛇: '蛇', 白虎: '虎', 玄武: '玄' };

function lyAbbr(map, v) { return map[v] || v || ''; }

/** 爻符：复用梅花页那套 `.yao-yang` / `.yao-yin`（同一份 CSS，两页画法必然一致） */
function lyBar(yang) {
  return yang
    ? '<div class="yao-yang ly-bar"></div>'
    : '<div class="yao-yin ly-bar"><span></span><span></span></div>';
}

/** 动爻记号：老阳 ○、老阴 ×（图上是用 X→ 引到变爻那一列） */
function lyMoveMark(yang) { return (yang ? '○' : '×') + '→'; }

/** 'YYYY-MM-DD HH:MM:SS' → 'YYYY年MM月DD日 HH:MM'（参考图上日期那一行的写法） */
function lyFormatDate(raw) {
  if (!raw) return '';
  var m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!m) return String(raw);
  return m[1] + '年' + m[2] + '月' + m[3] + '日 ' + m[4] + ':' + m[5];
}

/** 四柱：月建日辰是断卦的提纲，图上用红色标出来 —— 这一处颜色是**有意义的**，别当成装饰删掉 */
function lyGzCells(chart) {
  var cells = [['年', chart.yearGZ, ''], ['月', chart.monthGZ, ' ly-gz-key'], ['日', chart.dayGZ, ' ly-gz-key'], ['时', chart.hourGZ, '']];
  var h = '';
  for (var i = 0; i < cells.length; i++) {
    h += '<td class="ly-td-sub'+cells[i][2]+'">'+escHtml(cells[i][1] || '—')+'</td>';
  }
  return h;
}

/** 空亡：四柱各按自己的干支起旬（后端 display.kong 给的就是这个） */
function lyKongCells(display) {
  var k = (display && display.kong) || {};
  var order = [k.year, k.month, k.day, k.hour];
  var h = '';
  for (var i = 0; i < 4; i++) {
    h += '<td class="ly-td-sub ly-td-muted">'+escHtml(order[i] || '—')+'</td>';
  }
  return h;
}

/** 排盘信息表：事项 / 日期 / 卦式 / 节气 / 干支 / 空亡 / 神煞（参考图自上而下就是这几行） */
function lyInfoCard(chart, display, meta) {
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
function lyGuaTitle(hexMeta, fallbackName, isBen) {
  if (!hexMeta) return escHtml(fallbackName || '');
  var h = escHtml(hexMeta.name || fallbackName || '');
  if (hexMeta.palaceName) h += '<span class="ly-palace">(' + escHtml(hexMeta.palaceName) + ')</span>';
  return h;
}

/** 卦型标注（「本卦：六冲卦」那一行） */
function lyGuaTags(hexMeta, label) {
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
function lyPanCard(chart, display) {
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

/**
 * 断卦要点 —— 用神那一条 + 后端算好的 `deep.summary`。
 *
 * 这一块**不是**给 AI 的替代品（AI 会展开讲），它解决的是「页面上一堆字，
 * 不知道该看哪个」：先告诉用户这一卦在拿哪一爻当「你」，再列那几句要点。
 * 文字全部来自后端，本页不另写断语。
 */
function lyKeyCard(chart) {
  var ys = chart.yongShen;
  var summary = (chart.deep && chart.deep.summary) || [];
  if (!ys && !summary.length) return '';

  var h = '<div class="card ly-key-card">';
  h += '<div class="card-title">📌 断卦要点</div>';
  if (ys && ys.yong) {
    // 落在卦中的用神同时报出位置与干支（如「上爻 寅木」）—— 用神取的是「世爻」
    // 这类位置名时，不写位置，用户根本不知道该看哪一爻
    var pos = '';
    if (ys.position) {
      pos = LY_YAO_NAMES[ys.position - 1] || '';
      if (ys.branch) pos += ' ' + ys.branch + (ys.wuxing || '');
    }
    h += '<div class="ly-key-yong">用神：<strong>' + escHtml(ys.yong) + '</strong>'
      + (pos ? '<span class="ly-key-pos">' + escHtml(pos) + '</span>' : '')
      + '</div>';
    if (ys.why) h += '<div class="ly-key-why">' + escHtml(ys.why) + '</div>';
  }
  if (summary.length) {
    h += '<ul class="ly-key-list">';
    for (var i = 0; i < summary.length; i++) {
      h += '<li>' + escHtml(summary[i]) + '</li>';
    }
    h += '</ul>';
  }
  if (ys && ys.shi_shen && ys.shi_shen.desc) {
    h += '<div class="ly-key-shi">世身：' + escHtml(ys.shi_shen.desc) + '</div>';
  }
  h += lyLegend();
  h += '</div>';
  return h;
}

/**
 * 术语小抄（默认折叠）—— 网站在用户心里的问题从来不是「没有信息」，而是
 * 「这些字我不认识」。折起来，看的人自己决定要不要展开。
 * 只解释**字面含义**，不下断语：断语由 AI 那份三段式负责，此处多说一句都是两处口径。
 */
function lyLegend() {
  return '<details class="ly-legend">'
    + '<summary>这些字什么意思？</summary>'
    + '<div class="ly-legend-body">'
    + '<p><b>六亲</b>　这一爻与「你」的关系：父母（长辈/文书/房宅）、兄弟（同辈/竞争/花费）、'
    + '子孙（晚辈/福气/免灾）、妻财（钱财/妻妾，男测感情看它）、官鬼（官职/疾病/丈夫，女测感情看它）。</p>'
    + '<p><b>世、应</b>　世爻是「你自己」，应爻是「对方」或所问之事的那一头。</p>'
    + '<p><b>六神</b>　青龙、朱雀、勾陈、腾蛇、白虎、玄武，按日干起，给这一爻添一层色彩（如白虎主凶急、青龙主喜庆）。</p>'
    + '<p><b>动爻（○ / ×）</b>　摇卦时摇出的老阳、老阴会「变」，箭头右边就是它变成的那一爻。'
    + '断卦主要看动的这几爻，静爻一般只作陪衬。</p>'
    + '<p><b>旬空</b>　日辰所在那一旬里轮空的两个地支。落在空亡上的爻，'
    + '事情当下「落不到实处」，须等出空才有分晓。</p>'
    + '</div></details>';
}

/**
 * 一卦的全部页面内容。
 * @param {Object} chart   后端 `/api/liuyao/paipan` 的 `chart`
 * @param {Object} display 同上端点的 `display`（农历/节气/旬空/神煞/变卦整列）
 * @param {Object} meta    { topic, gender, method, divinationTime, createdAt, recordId, savedAnalysis, lunarInfo }
 */
function renderLiuyaoResult(chart, display, meta) {
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
  h += lyKeyCard(chart);
  return h;
}

/**
 * 发给 `/api/chat/send` 的 cardData —— 与后端 `prompt.liuyaoVars` 认的字段对齐。
 *
 * **只送起卦结果与四柱**，不送六亲六神世应：那些由后端自己装（它只认上下卦号）。
 * 从前这里塞了一整份前端装的卦（`gong`/`shiYao`/`liuqin[]`/`liushen[]`），
 * 后端签收后丢掉 —— 既让「前端算错」有可能悄悄传进去，又让人误以为后端在用它们。
 */
function buildLiuyaoAiPayload() {
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
