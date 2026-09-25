/**
 * paipan/overview.js —— 八字·命局总论合成器（3.5.4b-2）
 * ================================================================================
 *
 * 移植自 shushu（github.com/cmdCQ/shushu）`core/bazi/overview.py`（149 行）：
 *   `_first` :17 → `first`    `synthesize_overview` :21 → `synthesizeOverview`
 *
 * 各模块各出「词条」（用神、格局、神煞、刑冲…），本文件把它们**编织成一段连贯叙述**：
 * 日主立命 → 格局成破 → 用神趋避 → 格局亮点 → 支中动象 → 当前运程 → 一生大局。
 * **不引入新断法**，只对既有结构化结果做编织。
 *
 * ── 两处照搬的「看着像 bug」──
 * ① 一生大局的「凶」档文案里有个英文残留 `avoid`，基准在下一行用
 *    `tone.replace("avoid", "切忌")` 打补丁。**照搬**（含那句 replace）——
 *    直接写「切忌」就会与基准在不同档位上分叉：replace 对**所有**档位都执行，
 *    只是别的档位文案里没有 `avoid` 而已。这类「补丁式修正」在移植里必须连补丁一起搬。
 * ② `f"（帮身{si.get('help_score','?')}、泄耗{si.get('drain_score','?')}）" if si else ""`
 *    —— 判的是 `si`（`strength_info` 这个**字典非空**），不是那两个分数在不在。
 *    故 `strength_info` 为空字典时整段括号不出现。
 *
 * ── 插值一律当 Python `str()` 处理 ──
 * 基准的 f-string 对非字符串值会 `str()` 一次（层 14 因此报过 7920 例差异）。
 * 本文件对**可能非字符串**的那几个字段（strength / 分数 / 年份）显式套 `pyStr`；
 * 其余取自结构体的字段在真实链路里恒为字符串（缺省也是 `""`），按原样插值。
 *
 * 依赖：`chart` 必须是**已装配**的盘（`life_aspects` 之外的那一串：
 * `combos.geju_evaluation` / `yong_shen` / `special_patterns` / `relations.summary` /
 * `tiaohou` / `current_fortune`），装配见 `bazi_full.js`。
 *
 * 对拍：`duipan/gen_golden_bazi_assembly.py`（家族 `ov*`）。
 */
'use strict';

const { pyGet, pyTruthy, pyOr, pyNe, pyStr, pySlice, pyIndexSlice, pyAddStr } =
  require('./pycompat.js');

/** overview.py:17 `_first` —— 取首个或默认（Python 的真值判断 = 「列表非空」）。 */
function first(seq, dflt) {
  const d = dflt === undefined ? '' : dflt;
  return (seq && seq.length) ? seq[0] : d;
}

function synthesizeOverview(chart) {
  const dm = pyGet(chart, 'day_master', '');
  const dmWx = pyGet(chart, 'day_master_wuxing', '');
  const prof = pyOr(pyGet(chart, 'day_master_profile', {}), {});
  const strength = pyGet(chart, 'strength', '');
  const si = pyOr(pyGet(chart, 'strength_info', {}), {});
  const pattern = pyGet(chart, 'pattern', '');
  const geju = pyOr(pyGet(pyOr(pyGet(chart, 'combos', {}), {}), 'geju_evaluation', {}), {});
  const ys = pyOr(pyGet(chart, 'yong_shen', {}), {});
  const sp = pyOr(pyGet(chart, 'special_patterns', {}), {});
  const rel = pyOr(pyGet(pyOr(pyGet(chart, 'relations', {}), {}), 'summary', {}), {});
  const tiaohou = pyOr(pyGet(chart, 'tiaohou', {}), {});

  const paras = [];

  // 1. 日主立命
  const symbol = pyGet(prof, 'symbol', '');
  const traits = pyGet(prof, 'core_traits', '');
  const deling = pyGet(si, 'deling', undefined);
  const deqi = pyGet(si, 'deqi', undefined);
  const ling = pyTruthy(deling) ? '得令当时'
    : (pyTruthy(deqi) ? '月令生身、得气不得令' : '失令');
  const p1 = `${pyStr(dm)}${pyStr(dmWx)}日主`
    + (pyTruthy(symbol) ? `，${pyStr(symbol)}` : '') + '。'
    + (pyTruthy(traits) ? `${pyStr(traits)}。` : '')
    + `生月${ling}，日主之势属「${pyStr(strength)}」`
    + (Object.keys(si).length
      ? `（帮身${pyStr(pyGet(si, 'help_score', '?'))}、泄耗${pyStr(pyGet(si, 'drain_score', '?'))}）`
      : '')
    + '，此为一生气数之本。';
  paras.push({ title: '日主立命', text: p1 });

  // 2. 格局成破
  const status = pyGet(geju, 'status', '');
  const verdict = pyGet(geju, 'verdict', '');
  if (pattern) {
    let p2 = `命成「${pyStr(pattern)}」`;
    if (pyTruthy(status)) p2 += `，${pyStr(status)}`;
    p2 += '。';
    if (pyTruthy(verdict)) {
      p2 += (verdict.endsWith('。') || verdict.endsWith('！')) ? verdict : verdict + '。';
    }
    paras.push({ title: '格局成破', text: p2 });
  }

  // 3. 用神趋避（指南针）
  const yw = pyGet(ys, 'yong_shen_wx', null);
  const xw = pyGet(ys, 'xi_shen_wx', null);
  const jw = pyGet(ys, 'ji_shen_wx', null);
  if (pyTruthy(yw)) {
    // ⚠ 三处插值都过 `pyStr`：`master_synthesis` 明写了「用神可能是 list」，
    //   而 Python `f"{['水','木']}"` 给 `['水', '木']`、JS 模板串给 `水,木`。
    let p3 = `论趋避，全局以${pyStr(yw)}为用`;
    if (pyTruthy(xw) && pyNe(xw, yw)) p3 += `、${pyStr(xw)}为喜`;
    if (pyTruthy(jw)) p3 += `，最忌${pyStr(jw)}`;
    p3 += '。';
    const ana = pyGet(ys, 'analysis', '');
    if (pyTruthy(ana)) p3 += ana.endsWith('。') ? ana : ana + '。';
    // 调候点睛
    const thPrimary = pyGet(tiaohou, 'primary', null);
    if (pyTruthy(thPrimary)) {
      const inChart = pyGet(tiaohou, 'primary_in_chart', undefined);
      p3 += `调候之神${pyStr(thPrimary)}`
        + (pyTruthy(inChart) ? '已透干得用，寒暖燥湿调适。' : '未现于命，岁运逢之则发。');
    }
    paras.push({ title: '用神趋避', text: p3 });
  }

  // 4. 格局亮点（最显著的一两个特殊格局）
  const matched = pyOr(pyGet(sp, 'matched', []), []);
  if (matched.length) {
    const bits = matched.slice(0, 2).map((m) => {
      const nm = pyGet(m, 'name', '');
      const interp = pyGet(m, 'interpretation', '');
      // `interp.split("—")[-1].strip()` —— 取破折号后那段；无破折号则原文
      let short = interp.includes('—') ? interp.split('—').slice(-1)[0].trim() : interp;
      short = short.includes('。') ? short.split('。')[0] + '。' : short;
      return `${pyTruthy(pyGet(m, 'auspicious', undefined)) ? '吉象' : '凶象'}`
        + `「${pyStr(nm)}」——${short}`;
    });
    paras.push({ title: '格局亮点', text: '命中尤可注目者：' + bits.join('　') });
  }

  // 5. 支中动象（关键合/冲）
  const kb = pyOr(pyGet(rel, 'key_blessings', []), []);
  const kw = pyOr(pyGet(rel, 'key_warnings', []), []);
  if (kb.length || kw.length) {
    const parts = [];
    if (kb.length) parts.push('吉：' + first(kb));
    if (kw.length) parts.push('忌：' + first(kw));
    paras.push({
      title: '支中动象',
      text: '地支动象——' + parts.join('；') + '。此为命局暗藏之牵动，逢岁运填引则应。',
    });
  }

  // 5.5 当前运程（大运流年并入 — 后天之时）
  const cf = pyOr(pyGet(chart, 'current_fortune', {}), {});
  if (pyTruthy(pyGet(cf, 'available', undefined))) {
    const cdy = pyOr(pyGet(cf, 'current_dayun', {}), {});
    const cln = pyOr(pyGet(cf, 'current_liunian', {}), {});
    const helpMap = {
      扶用: '助旺用神、为顺境之运', 助忌: '助起忌神、宜守不宜进',
      中性: '于命局用忌无显著助损',
    };
    let pcf = `现行${pyStr(pyGet(cdy, 'ganzhi', ''))}大运（${pyStr(pyGet(cdy, 'start_age', ''))}-`
      + `${pyStr(pyGet(cdy, 'end_age', ''))}岁，${pyStr(pyGet(cdy, 'shishen', ''))}），`
      + `${pyGet(helpMap, pyGet(cdy, 'help', ''), '')}。`;
    if (pyTruthy(pyGet(cln, 'ganzhi', ''))) {
      pcf += `${pyStr(pyGet(cf, 'current_year', ''))}年逢${pyGet(cln, 'ganzhi', '')}`
        + `（${pyStr(pyGet(cln, 'shishen', ''))}·${pyStr(pyGet(cln, 'quality', ''))}）。`;
    }
    const brief = pyGet(cf, 'suiyun_brief', '');
    if (brief) pcf = pyAddStr(pcf, pyIndexSlice(brief, 0, 40));
    paras.push({ title: '当前运程', text: pcf });
  }

  // 6. 一生大局（收束）
  const quality = pyGet(geju, 'quality', '');
  let tone = {
    吉: '格正用真，一生大局向上，宜顺势而为、守正待时。',
    中: '格局有成有破、得失相参，一生在趋用避忌间见高低，重在扬长补短。',
    凶: '格损用伤，一生多费周折，尤须借岁运补救、avoid犯其所忌。',
  }[quality] || '综观全局，趋用神之乡则顺、犯忌神之地则滞，吉凶随运而转。';
  tone = tone.replace('avoid', '切忌');          // ← 基准的补丁，照搬（见文件头 ①）
  paras.push({ title: '一生大局', text: tone });

  // 摘要一句（用于 AI/分享）
  let summary = `${pyStr(dm)}${pyStr(dmWx)}日主·${pyStr(strength)}·${pyStr(pattern)}`
    + (pyTruthy(status) ? `（${pyStr(status)}）` : '');
  if (pyTruthy(yw)) summary += `，用${pyStr(yw)}忌${pyStr(pyOr(jw, '—'))}`;

  return {
    available: paras.length > 0,
    headline: summary,
    quality: pyOr(quality, '中'),              // 吉/中/凶 —— 供前端定盘着色
    day_master: `${pyStr(dm)}${pyStr(dmWx)}`,
    pattern: pattern,
    pattern_status: status,
    yong_shen_wx: yw,
    ji_shen_wx: jw,
    verdict_line: tone,                    // 一生大局一句，作定盘结语
    paragraphs: paras,
  };
}

module.exports = { synthesizeOverview, first };
