// 八字盘面渲染（基本信息 / 四柱 / 命局提要 / 大运一览）—— **只渲染，一个字都不算**。
//
// 为什么是「只渲染」：2026-09-25 之前，`charts/index.html` 与 `my-charts/index.html`
// **各有一份** `calcBazi`，加上写库时的快照，同一件事三处实现 —— 而本项目最痛的病
// 正是「两边各算一份、慢慢对不上」。所以页面从此**只发出生原始参数**，
// 盘由后端 `POST /api/bazi/paipan` 现算（那条端点走的是对拍过的 `paipan/`，
// 页面上看到的盘与 AI 读到的那段 prompt 出自**同一个函数**，不可能分叉）。
//
// 本文件因此只做三件事：把后端给的结构摆成白话版面、把术语就地注一句、把
// 五行上色。**任何历法/术数判断都不许在这里出现**（连生肖都从 `display.shengxiao`
// 取，不从 `birthYear` 推 —— 公历年推生肖在「1月1日–立春」之间是错的）。
//
// 来源与去向：本文件是 2026-09-25 新写的；版面顺序照用户给的参考图
// （`Pictures/example/bazi1..3.jpg`，问真八字）的信息层次：基本信息 → 四柱 → 大运。
//
// 用法：
//   BaziRender.render(document.getElementById('baziChart'), resp, {
//     name:'张三', genderText:'男', birthplace:'…', createdAt:'…',
//     trueSolarText:'1984-02-04 11:52:00',   // 页面上算好的真太阳时（后端暂无此项）
//     solarText:'1984-02-04 12:00:00',
//   }, document.getElementById('baziRest'));
// 其中 resp 形如 `{chart, sizhu, display}`（即 `/api/bazi/paipan` 的返回）。
//
// ⚠ **第 4 个参数 `restHost` 是「拆成两块画」用的**（2026-09-25 用户要求）：
//   用户原话「先把 ai 解析块移到上面一些，让用户一眼就能看到（但可以选择折叠对话，所以
//   不影响看下面的内容），除了排盘以外的不重要信息都给我放下面」。
//   ⇒ 只有 **①生肖姓名 + 四柱八个字** 画给 `host`（用户认的「排盘」），页面上紧跟其后就是
//   AI 解读块；**②基本信息 ③四柱细盘 ④命局提要 ⑤大运一览 全画给 `restHost`**，排在 AI 块下面。
//   ⚠ 第一版把「基本信息」留在了上面 —— 手机上一屏全被它占掉，用户当场骂。**别再挪回去。**
//   不传 `restHost` 时两块追加进 `host`，与从前的外形一致。

var BaziRender = (function () {
  'use strict';

  // ── 五行上色 ────────────────────────────────────────────────────────
  // 颜色取「术数常识配色 · 降低饱和以合本站暖色调」，只顾可辨识，不追求艳。
  var WX_COLOR = { 木: '#2e7d4f', 火: '#c0392b', 土: '#a1750a', 金: '#8a7b3a', 水: '#2a5b8a' };
  var WX_LIST = ['木', '火', '土', '金', '水'];
  // 一行白话把「这一格是什么」讲清楚 —— 服务于不懂的人，别让人去别处查。
  var GLOSS = {
    主星: '主星＝这一柱的天干对「你」是什么角色（比肩＝同类、正财＝正当收入…）',
    天干: '天干＝柱子的上半截，管外部、显性的那一面',
    地支: '地支＝柱子的下半截，管内在、环境与根气',
    藏干: '藏干＝地支里藏着的力量（一支藏 1~3 个天干）',
    副星: '副星＝藏干对「你」是什么角色，比主星隐蔽，但往往更真实',
    纳音: '纳音＝两字合起来取的五行名（如「大林木」），古法用于取象',
    大运: '大运＝每十年换一段的「大环境」，看的是这十年顺不顺',
    流年: '流年＝具体某一年（如 2026 丙午年），看的是今年',
    岁运: '岁运＝流年与大运放在一起看，两者相冲相战时波动最大',
    旺衰: '旺衰＝你自身的力量够不够（太弱扛不住事，太旺又容易过刚）',
    格局: '格局＝这张盘的「主线剧情」，古人按它判断一生的大方向',
    用神: '用神＝对你最有利的那个五行，喜神次之，忌神是最该避开的',
    调候: '调候＝按出生月份的气候补偏救弊（如冬天生人宜见火）',
    神煞: '神煞＝古人标记的吉凶星（如天乙贵人主有人帮），参考、不作定论',
    旬空: '旬空＝这一柱在这十天里「轮空」的两个地支，主一时落不着实处',
    胎元: '胎元＝受孕之月，古法用来旁参体质与根底',
    命宫: '命宫＝古法另起的一宫，常与性格取向一起参看',
    身宫: '身宫＝与命宫相对的一宫，多参看身体与后半生',
    人元司令: '人元司令＝交节后当令的那股气，说明月令真正在管什么',
  };

  function esc(s) {
    if (typeof escHtml === 'function') return escHtml(s == null ? '' : String(s));
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function wx(s) {
    var c = WX_COLOR[s];
    return c ? '<span class="bz-wx" style="color:' + c + '">' + esc(s) + '</span>' : esc(s);
  }
  /** 「天干＋五行」短语 → 给天干上色，五行本身也用同色 */
  function ganWx(gan, wuxing) {
    if (!wuxing) return esc(gan);
    var c = WX_COLOR[wuxing] || '';
    return '<span class="bz-gan" style="color:' + c + '">' + esc(gan) + '</span>';
  }
  function term(name, extra) {
    var g = GLOSS[name];
    return '<span class="bz-term">' + esc(name)
      + (g ? '<span class="bz-tip" title="' + esc(g) + '">?</span>' : '')
      + (extra || '') + '</span>';
  }
  function qualityClass(q) {
    return q === '吉' ? 'bz-good' : (q === '凶' ? 'bz-bad' : 'bz-flat');
  }

  // ── 样式 ────────────────────────────────────────────────────────────
  // 自带一份（只注入一次）：这样任何页面引了本文件就有样式，不必再各页抄一遍
  // ——「同一样式抄三处」正是本项目要消灭的那类重复。
  var CSS_ID = 'bz-style';
  var CSS = [
    '.bz-hero{text-align:center;padding:0.2rem 1rem 0.6rem}',
    '.bz-pillars{display:flex;justify-content:center;gap:0.55rem}',
    '.bz-pillar{display:flex;flex-direction:column;align-items:center;min-width:3rem}',
    '.bz-pillar .bz-gz{font-family:"Noto Serif SC",serif;font-size:1.15rem;font-weight:600;letter-spacing:0.08em}',
    '.bz-pillar .bz-lb{font-size:0.6rem;color:var(--text-muted,#8a8a8a);margin-top:0.1rem;letter-spacing:0.08em}',
    '.bz-sec{margin-top:0.9rem}',
    '.bz-sec-title{font-family:"Noto Serif SC",serif;font-size:0.86rem;font-weight:600;color:var(--text);letter-spacing:0.1em;margin:0 0 0.45rem 0.1rem;display:flex;align-items:center;gap:0.4rem}',
    '.bz-sec-title .bz-line{flex:1;height:1px;background:var(--border,#e8e3d8)}',
    '.bz-card{background:var(--bg-card,#fff);border:1px solid var(--border,#e8e3d8);border-radius:var(--radius-md,14px);overflow:hidden;box-shadow:var(--shadow-card,0 1px 4px rgba(0,0,0,.06))}',
    '.bz-sheet{display:flex;flex-direction:column}',
    '.bz-row{display:flex;align-items:baseline;padding:0.62rem 0.95rem;font-size:0.82rem;line-height:1.55}',
    '.bz-row:nth-child(odd){background:var(--bg-cell,#faf8f3)}',
    '.bz-row .bz-k{color:var(--text-dim,#6b6b6b);font-size:0.72rem;min-width:5.2em;flex-shrink:0}',
    '.bz-row .bz-v{color:var(--text,#1a1a1a);flex:1;word-break:break-all}',
    /* 四柱表：横向四列，行是主星/天干/地支/藏干/副星/纳音（照参考图的密排） */
    '.bz-table{width:100%;border-collapse:collapse;font-size:0.8rem}',
    '.bz-table th,.bz-table td{padding:0.42rem 0.2rem;text-align:center;border-bottom:1px solid var(--border,#e8e3d8)}',
    '.bz-table thead th{font-weight:500;color:var(--text-dim,#6b6b6b);font-size:0.7rem;letter-spacing:0.06em}',
    '.bz-table tbody th{font-size:0.68rem;color:var(--text-dim,#6b6b6b);font-weight:400;text-align:left;padding-left:0.7rem;white-space:nowrap}',
    '.bz-table tbody tr:last-child th,.bz-table tbody tr:last-child td{border-bottom:none}',
    '.bz-table .bz-big{font-family:"Noto Serif SC",serif;font-size:1.02rem;font-weight:600}',
    '.bz-wx{font-weight:600}',
    '.bz-sub{font-size:0.68rem;color:var(--text-dim,#6b6b6b)}',
    /* 命局提要 */
    '.bz-headline{font-family:"Noto Serif SC",serif;font-size:0.95rem;font-weight:600;color:var(--text,#1a1a1a);line-height:1.7;padding:0.95rem 1rem 0.2rem}',
    '.bz-para{font-size:0.8rem;line-height:1.8;color:var(--text,#1a1a1a);padding:0.35rem 1rem}',
    '.bz-para b{color:#8a6d00;font-weight:600}',
    '.bz-details{border-top:1px solid var(--border,#e8e3d8)}',
    '.bz-details summary{font-size:0.75rem;color:#8a6d00;padding:0.6rem 1rem;cursor:pointer;list-style:none}',
    '.bz-details summary::-webkit-details-marker{display:none}',
    '.bz-chips{display:flex;flex-wrap:wrap;gap:0.35rem;padding:0.55rem 0.95rem}',
    '.bz-chip{font-size:0.72rem;padding:0.16rem 0.5rem;border-radius:999px;background:rgba(184,150,10,0.09);color:#7a6208;border:1px solid rgba(184,150,10,0.2)}',
    '.bz-chip.bz-good{background:rgba(46,125,79,0.09);color:#2e7d4f;border-color:rgba(46,125,79,0.22)}',
    '.bz-chip.bz-bad{background:rgba(192,57,43,0.08);color:#c0392b;border-color:rgba(192,57,43,0.2)}',
    /* 大运一览：横向滚动的时间轴，一步一格 */
    '.bz-dayun-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;padding:0.15rem 0}',
    '.bz-dayun{display:flex;gap:0.4rem;padding:0.6rem 0.75rem;min-width:max-content}',
    '.bz-step{min-width:4.6rem;padding:0.55rem 0.3rem;border-radius:10px;border:1px solid var(--border,#e8e3d8);text-align:center;background:var(--bg-card,#fff)}',
    '.bz-step.now{border-color:#b8960a;background:rgba(184,150,10,0.07);box-shadow:0 0 0 1px rgba(184,150,10,0.35)}',
    '.bz-step .bz-dgz{font-family:"Noto Serif SC",serif;font-size:0.95rem;font-weight:600;letter-spacing:0.06em}',
    '.bz-step .bz-dage{font-size:0.6rem;color:var(--text-muted,#8a8a8a);margin-top:0.12rem;line-height:1.35}',
    '.bz-step .bz-dss{font-size:0.64rem;color:var(--text-dim,#6b6b6b);margin-top:0.1rem}',
    '.bz-step .bz-q{font-size:0.62rem;margin-top:0.1rem}',
    '.bz-good{color:#2e7d4f}', '.bz-bad{color:#c0392b}', '.bz-flat{color:var(--text-dim,#6b6b6b)}',
    '.bz-now-tag{display:inline-block;font-size:0.56rem;padding:0 0.3rem;border-radius:6px;background:#b8960a;color:#fff;margin-left:0.25rem;vertical-align:1px}',
    '.bz-note{font-size:0.7rem;color:var(--text-dim,#6b6b6b);line-height:1.75;padding:0.5rem 0.95rem 0.7rem;border-top:1px dashed var(--border,#e8e3d8)}',
    '.bz-gloss{font-size:0.72rem;color:var(--text-dim,#6b6b6b);line-height:1.9;padding:0.35rem 0.95rem 0.7rem}',
    '.bz-term{color:#7a6208}',
    '.bz-tip{display:inline-flex;align-items:center;justify-content:center;width:0.78rem;height:0.78rem;border-radius:50%;border:1px solid rgba(184,150,10,0.5);font-size:0.52rem;margin-left:0.12rem;cursor:help;vertical-align:1px;color:#8a6d00}',
  ].join('\n');

  function injectCss() {
    if (document.getElementById(CSS_ID)) return;
    var st = document.createElement('style');
    st.id = CSS_ID;
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  // ── 各段 ────────────────────────────────────────────────────────────

  function row(k, v) {
    if (v == null || v === '') return '';
    return '<div class="bz-row"><span class="bz-k">' + esc(k) + '</span>'
      + '<span class="bz-v">' + v + '</span></div>';
  }

  /** 四柱表：一行一格，横向四柱对齐（照参考图的密排层次，但只留看得懂的六项） */
  function pillarTable(chart, display, genderText) {
    var P = [chart.year_pillar, chart.month_pillar, chart.day_pillar, chart.hour_pillar];
    var labels = ['年柱', '月柱', '日柱', '时柱'];
    var kong = (display && display.kong) || {};
    var kongKeys = ['year', 'month', 'day', 'hour'];

    function cell(i, html) { return '<td>' + html + '</td>'; }
    var h = '<table class="bz-table"><thead><tr><th></th>';
    for (var i = 0; i < 4; i++) {
      h += '<th>' + labels[i] + (kong[kongKeys[i]]
        ? '<br><span class="bz-sub">空' + esc(kong[kongKeys[i]]) + '</span>' : '') + '</th>';
    }
    h += '</tr></thead><tbody>';

    // 主星：日柱那一格是「自己」，写日元/元男元女更清楚，不写「比肩」——
    // 用户看到日柱写「比肩」会以为自己是比肩命，其实那一格就是本人。
    h += '<tr><th>' + term('主星') + '</th>';
    for (i = 0; i < 4; i++) {
      var p = P[i];
      var v = i === 2 ? ('日元' + (genderText ? '<span class="bz-sub">' + esc(genderText) + '</span>' : ''))
        : esc((p && p.shishen_gan) || '—');
      h += cell(i, v);
    }
    h += '</tr>';

    h += '<tr><th>' + term('天干') + '</th>';
    for (i = 0; i < 4; i++) {
      h += cell(i, '<span class="bz-big">'
        + ganWx(P[i] && P[i].tiangan, P[i] && P[i].wuxing_gan) + '</span>');
    }
    h += '</tr>';

    h += '<tr><th>' + term('地支') + '</th>';
    for (i = 0; i < 4; i++) {
      h += cell(i, '<span class="bz-big">'
        + ganWx(P[i] && P[i].dizhi, P[i] && P[i].wuxing_zhi) + '</span>');
    }
    h += '</tr>';

    h += '<tr><th>' + term('藏干') + '</th>';
    for (i = 0; i < 4; i++) {
      var cg = (P[i] && P[i].canggan) || [];
      h += cell(i, cg.length ? cg.map(function (g) { return esc(g); }).join('<span class="bz-sub">·</span>') : '—');
    }
    h += '</tr>';

    h += '<tr><th>' + term('副星') + '</th>';
    for (i = 0; i < 4; i++) h += cell(i, esc((P[i] && P[i].shishen_zhi) || '—'));
    h += '</tr>';

    h += '<tr><th>' + term('纳音') + '</th>';
    for (i = 0; i < 4; i++) h += cell(i, '<span class="bz-sub">' + esc((P[i] && P[i].nayin) || '—') + '</span>');
    h += '</tr>';

    h += '</tbody></table>';
    return h;
  }

  /** 命局提要：先一句白话结论，再「展开细说」，最后是各类标签 */
  function summaryBlock(chart) {
    var ov = chart.overview || {};
    var h = '<div class="bz-card">';
    if (ov.available) {
      if (ov.headline) h += '<div class="bz-headline">' + esc(ov.headline) + '</div>';
      if (ov.verdict_line) h += '<div class="bz-para bz-sub">' + esc(ov.verdict_line) + '</div>';
      var ps = ov.paragraphs || [];
      if (ps.length) {
        h += '<details class="bz-details"><summary>展开细说（日主 · 格局 · 用神）</summary>';
        ps.forEach(function (p) {
          h += '<div class="bz-para">' + (p.title ? '<b>' + esc(p.title) + '</b>：' : '')
            + esc(p.text) + '</div>';
        });
        h += '</details>';
      }
    } else {
      h += '<div class="bz-para">这张盘的提要暂不可用。</div>';
    }

    // 关键项 + 标签
    var si = chart.strength_info || {};
    var ys = chart.yong_shen || {};
    var th = ys.tiao_hou || {};
    h += '<div class="bz-chips">';
    if (chart.strength) h += '<span class="bz-chip">旺衰 · ' + esc(chart.strength) + '</span>';
    if (chart.pattern) h += '<span class="bz-chip">格局 · ' + esc(chart.pattern) + '</span>';
    if (ys.yong_shen_wx) h += '<span class="bz-chip bz-good">用神 · ' + wx(ys.yong_shen_wx) + '</span>';
    if (ys.xi_shen_wx) h += '<span class="bz-chip bz-good">喜神 · ' + wx(ys.xi_shen_wx) + '</span>';
    if (ys.ji_shen_wx) h += '<span class="bz-chip bz-bad">忌神 · ' + wx(ys.ji_shen_wx) + '</span>';
    if (th.stem) h += '<span class="bz-chip">调候 · ' + esc(th.stem) + wx(th.wuxing || '') + '</span>';
    (chart.shensha || []).forEach(function (s) {
      h += '<span class="bz-chip">' + esc(s.name) + '<span class="bz-sub">'
        + esc((s.pillar || '') + (s.dizhi || '')) + '</span></span>';
    });
    h += '</div>';

    // 五行力量：只报个数，不下结论（结论在上面那段白话里）
    if (si.help_score != null) {
      h += '<div class="bz-note">帮身的力量 ' + esc(si.help_score)
        + '、泄耗的力量 ' + esc(si.drain_score)
        + '；日主生在' + esc(si.monthly_status || '—') + '月令。'
        + esc(GLOSS.旺衰) + '</div>';
    }
    var rel = chart.relations || {};
    var relKeys = [['he', '合'], ['chong', '冲'], ['xing', '刑'], ['hai', '害'], ['po', '破']];
    var relText = [];
    relKeys.forEach(function (kv) {
      (rel[kv[0]] || []).forEach(function (r) {
        relText.push('<span class="bz-chip' + (r.auspicious === false ? ' bz-bad' : '') + '">'
          + esc((r.branches || []).join('') + '相' + kv[1]) + '</span>');
      });
    });
    if (relText.length) {
      h += '<div class="bz-chips">' + relText.join('')
        + '</div><div class="bz-gloss">冲/合/刑/害/破 是地支之间的关系：「冲」主变动与对立，'
        + '「合」主牵连与合作，「刑」主摩擦，「害」主暗损，「破」为次要损耗。'
        + '有标记不等于有灾，要结合大运流年看什么时候应。</div>';
    }
    h += '</div>';
    return h;
  }

  /** 大运一览：横向十步 + 当前那一步高亮；再给当前流年与五年概览 */
  function dayunBlock(chart) {
    var dy = chart.dayun || [];
    if (!dy.length) return '';
    var cf = chart.current_fortune || {};
    var cur = cf.current_dayun || {};
    var curGz = cur.ganzhi || '';
    var h = '<div class="bz-card">';
    if (!cf.pre_yun && curGz) {
      h += '<div class="bz-note">你现在走的是 ' + esc(curGz) + ' 运（'
        + esc(cur.ganzhi ? (String(cur.start_age) + '–' + String(cur.end_age) + ' 岁') : '')
        + '）。' + esc(GLOSS.大运) + '</div>';
    } else if (cf.pre_yun) {
      h += '<div class="bz-note">还没起运（走的是「小运」）。' + esc(GLOSS.大运) + '</div>';
    }
    h += '<div class="bz-dayun-scroll"><div class="bz-dayun">';
    dy.forEach(function (d) {
      var isNow = curGz && d.tiangan + d.dizhi === curGz;
      h += '<div class="bz-step' + (isNow ? ' now' : '') + '">'
        + '<div class="bz-dgz">' + wx0(d) + '</div>'
        + '<div class="bz-dage">' + esc(String(d.start_age)) + '–' + esc(String(d.end_age)) + ' 岁'
        + '<br>' + esc(String(d.start_year)) + '–' + esc(String(d.end_year)) + '</div>'
        + '<div class="bz-dss">' + esc(d.dm_shishen || '') + '</div>'
        + '<div class="bz-q ' + qualityClass(d.quality) + '">' + esc(d.quality || '平')
        + (isNow ? '<span class="bz-now-tag">现在</span>' : '') + '</div>'
        + '</div>';
    });
    h += '</div></div>';

    // 每步的吉凶理由（只列有内容的，白话说）
    var notes = [];
    dy.forEach(function (d) {
      var gz = d.tiangan + d.dizhi;
      (d.auspicious || []).forEach(function (t) { notes.push(esc(gz + '运：' + t)); });
      (d.warnings || []).slice(0, 1).forEach(function (t) { notes.push(esc(gz + '运：' + t)); });
    });
    if (notes.length) {
      h += '<details class="bz-details"><summary>每一步的吉凶理由（' + notes.length + ' 条）</summary>'
        + '<div class="bz-gloss">' + notes.map(function (t) { return '· ' + t; }).join('<br>') + '</div>'
        + '</details>';
    }

    if (cf.current_liunian) {
      var ln = cf.current_liunian;
      h += '<div class="bz-note">今年（' + esc(String(ln.year)) + ' ' + esc(ln.ganzhi) + '年，'
        + esc(ln.shishen || '') + '）：' + esc(ln.summary || '') + '。' + esc(GLOSS.流年) + '</div>';
    }
    var ry = cf.recent_years || [];
    if (ry.length) {
      h += '<div class="bz-chips">' + ry.map(function (y) {
        return '<span class="bz-chip ' + qualityClass(y.quality) + '">' + esc(String(y.year))
          + ' ' + esc(y.ganzhi) + ' · ' + esc(y.shishen || '') + ' · ' + esc(y.quality || '')
          + '</span>';
      }).join('') + '</div>';
    }
    if (cf.suiyun_brief) {
      h += '<div class="bz-gloss">' + esc(cf.suiyun_brief) + esc(GLOSS.岁运) + '</div>';
    }
    h += '</div>';
    return h;
  }

  /** 大运那一格的干支：天干按十神动不了色（干支本气已由五行定），故按干支各自五行上色 */
  function wx0(d) {
    var ganWxMap = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
    var zhiWxMap = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
    return ganWx(d.tiangan, ganWxMap[d.tiangan]) + ganWx(d.dizhi, zhiWxMap[d.dizhi]);
  }

  function section(title, inner) {
    return '<div class="bz-sec"><div class="bz-sec-title">' + esc(title)
      + '<span class="bz-line"></span></div>' + inner + '</div>';
  }

  /**
   * 渲染整张盘（不含 AI 部分）。
   * @param {HTMLElement} host 容器（**「排盘」= 四柱八个字那一段**，AI 解读块紧跟其后）
   * @param {object} resp `/api/bazi/paipan` 的返回：`{chart, sizhu, display}`
   * @param {object} meta 页面已知的登记信息（姓名/出生地/创建时间/真太阳时…）
   * @param {HTMLElement} [restHost] 其余（基本信息 + 四柱细盘 + 命局提要 + 大运一览）的容器，
   *   页面上在 AI 块**下面**；不传就追加在 `host` 后面（老行为）
   */
  function render(host, resp, meta, restHost) {
    if (!host) return;
    injectCss();
    var m = meta || {};
    var chart = (resp && resp.chart) || {};
    var display = (resp && resp.display) || {};
    var sizhu = (resp && resp.sizhu) || {};

    var h = '';

    // ① 四柱（顶上，第一眼要看的就是这八个字）
    h += '<div class="bz-hero"><div class="bz-pillars">';
    ['年柱', '月柱', '日柱', '时柱'].forEach(function (lb, i) {
      var gz = [sizhu.year_gz, sizhu.month_gz, sizhu.day_gz, sizhu.hour_gz][i] || '';
      var w = [chart.year_pillar, chart.month_pillar, chart.day_pillar, chart.hour_pillar][i] || {};
      h += '<div class="bz-pillar"><span class="bz-gz">'
        + ganWx(gz.charAt(0), w.wuxing_gan) + ganWx(gz.charAt(1), w.wuxing_zhi)
        + '</span><span class="bz-lb">' + esc(lb) + '</span></div>';
    });
    h += '</div></div>';

    // ①到此为止：上面这一块（生肖姓名 + 八个字）就是用户认的「排盘」，AI 解读块紧跟其后。
    // **基本信息不能留在上面** —— 2026-09-25 上线的第一版把它留在上面，用户当场骂
    // 「你上线了个狗屎」：手机 390×844 实测，基本信息那 8 行（节气/人元司令/古法参看/
    // 录入时间）占了整整一屏，AI 块只剩个标题露在最底边，点「解读」的按钮还在折线下面。
    host.innerHTML = h;

    // ②基本信息 + ③四柱细盘 + ④命局提要 + ⑤大运一览：**都是用户说的「不重要信息」**，
    // 全画到 restHost，页面上排在 AI 解读块**下面**。
    // 用户原话：「先把 ai 解析块移到上面一些，让用户一眼就能看到（但可以选择折叠对话，
    // 所以不影响看下面的内容），除了排盘以外的不重要信息都给我放下面。」
    var r = '';
    var jq = display.jieQi;
    var rows = '';
    rows += row('姓名', esc(m.name || '') + (m.genderText ? ' <span class="bz-sub">（'
      + esc(m.yinYang || '') + ' ' + esc(m.zao || '') + '）</span>' : ''));
    rows += row('性别', esc(m.genderText || ''));
    rows += row('公历', esc(m.solarText || '') + (m.hourName ? ' <span class="bz-sub">'
      + esc(m.hourName) + '</span>' : ''));
    rows += row('农历', esc(display.lunar || '') + (display.shengxiao
      ? ' <span class="bz-sub">属' + esc(display.shengxiao) + '</span>' : ''));
    if (m.trueSolarText) rows += row('真太阳时', esc(m.trueSolarText));
    if (m.birthplace) rows += row('出生地区', esc(m.birthplace));
    if (jq && jq.name) {
      rows += row('节气', esc(jq.name) + ' ' + esc(jq.at || '')
        + '<br><span class="bz-sub">下一步 ' + esc(jq.nextName || '') + ' ' + esc(jq.nextAt || '') + '</span>');
    }
    if (chart.renyuan_siling && chart.renyuan_siling.phase) {
      rows += row('人元司令', esc(chart.renyuan_siling.phase) + '<br><span class="bz-sub">'
        + esc(GLOSS.人元司令) + '</span>');
    }
    var tg = [];
    if (chart.taiyuan && chart.taiyuan.label) tg.push('胎元 ' + esc(chart.taiyuan.label));
    if (chart.minggong && chart.minggong.label) tg.push('命宫 ' + esc(chart.minggong.label));
    if (chart.shengong && chart.shengong.label) tg.push('身宫 ' + esc(chart.shengong.label));
    if (tg.length) rows += row('古法参看', tg.join(' · ')
      + '<br><span class="bz-sub">胎元＝受孕之月；命宫、身宫＝另起的两宫，古人用来旁参性格与体质</span>');
    if (m.createdAt) rows += row('录入时间', esc(m.createdAt));
    r += section('基本信息', '<div class="bz-card"><div class="bz-sheet">' + rows + '</div></div>');

    // ③ 四柱细盘
    var gloss = Object.keys(GLOSS).slice(0, 6).map(function (k) { return GLOSS[k]; }).join('；');
    r += section('四柱细盘', '<div class="bz-card">'
      + pillarTable(chart, display, m.genderText)
      + '<div class="bz-gloss">' + esc(gloss) + '。'
      + '<br>点每一项后面的 <span class="bz-tip">?</span> 也能看解释。</div></div>');

    // ④ 命局提要
    r += section('命局提要', summaryBlock(chart));

    // ⑤ 大运一览
    var dyHtml = dayunBlock(chart);
    if (dyHtml) r += section('大运一览', dyHtml);

    // 给了 restHost 就分两块；没给（老调用方）就**追加**在同一块后面 ——
    // ⚠ 不能用 `(restHost || host).innerHTML = r`：那样 restHost 缺省时会把刚写好的
    // 四柱整块冲掉，页面上只剩基本信息。全站现在只有一个调用方且都传 restHost，
    // 但这条按老行为（都画进一块）留着，免得下次有人这么调时静默丢盘。
    if (restHost) restHost.innerHTML = r;
    else host.innerHTML += r;
  }

  return { render: render, GLOSS: GLOSS, WX_COLOR: WX_COLOR, injectCss: injectCss };
})();
