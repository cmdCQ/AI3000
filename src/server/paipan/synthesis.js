/**
 * paipan/synthesis.js —— 八字·命局力量综合推理链（3.5.4b-3）
 * ================================================================================
 *
 * 移植自 shushu（github.com/cmdCQ/shushu）`core/bazi/synthesis.py`（162 行）：
 *   `synthesize_mingju` :17 → `synthesizeMingju`
 *
 * 把各子模块的断语汇成**一条可见推理链**：日主强弱立基 → 格局成破救应 →
 * 用神调候到位与否 → 刑冲合害损益，每一因子标【来源模块·利/害/中·权重】，
 * 合成「命局综合评定」（`composite_label` / `composite_score`）。
 *
 * ── 语法细节（都是「照抄才不乱」的地方）──
 * ① 极性标记是**全角**的 `＋`(U+FF0B) / `－`(U+FF0D)，不是半角 `+`/`-`；
 *    分隔符 `　→　` 与 `　⟹　`、`　‖后天‖　` 里的空格是**全角空格** U+3000。
 *    这些字符肉眼几乎不可分，改一个就是纯文本差异，故在此点名。
 * ② `f"（先天综合力{score:+d}）"` —— Python 的 `+d` **总带符号**，`0` 输出 `+0`。
 *    不是 `str(score)`；`pySignFormat` 就是干这个的。
 * ③ `jiu[:60]` / `(...)[:56]` 是**按码位**切片，且 `len(jiu) > 60` 这个判据
 *    **参与算法**（决定要不要加省略号），故走 `pySlice`/`pyLen` 而不是 JS 的
 *    `.slice()/.length`（BMP 内一致，非 BMP 差 1，层 14 的同类教训）。
 * ④ 基准顶部的 `_WX = ("木","火","土","金","水")` **全文未被引用**（死常量）。
 *    不搬 —— 搬一个没人用的常量，只会让人以为哪里在用它。
 *
 * ── 装配位置 ──
 * 基准由 `api/bazi.py:158` 挂在 `chart["mingju_synthesis"]`（且**仅当 available**）。
 * 移植侧同一处，见 `bazi_full.js`。它**必须先有** `overview`/`current_fortune`/
 * `life_aspects` 之外的这一串：`strength_info`/`combos.geju_evaluation`/`yong_shen`/
 * `tiaohou`/`relations.summary`/`current_fortune`。
 *
 * 对拍：`duipan/gen_golden_bazi_assembly.py`（家族 `sy*`）。
 */
'use strict';

const { pyGet, pyTruthy, pyOr, pyStr, pyLen, pySlice, pyIndexSlice, pyAddStr, pySignFormat } =
  require('./pycompat.js');

/** 因子极性 → 行内标记（**全角**加减号，见文件头 ①）。 */
const POL_MARK = { 利: '＋', 害: '－', 中: '·' };

function synthesizeMingju(chart) {
  const dm = pyGet(chart, 'day_master', '');
  const dmWx = pyGet(chart, 'day_master_wuxing', '');
  const strength = pyGet(chart, 'strength', '');
  const si = pyOr(pyGet(chart, 'strength_info', {}), {});
  const ge = pyOr(pyGet(pyOr(pyGet(chart, 'combos', {}), {}), 'geju_evaluation', {}), {});
  const ys = pyOr(pyGet(chart, 'yong_shen', {}), {});
  const th = pyOr(pyGet(chart, 'tiaohou', {}), {});
  const rel = pyOr(pyGet(pyOr(pyGet(chart, 'relations', {}), {}), 'summary', {}), {});

  if (!dm) return { available: false };

  const factors = [];
  let score = 0;   // 命局成局得用之综合力

  // ── 一、日主强弱立基（状态，非利害） ──
  const mstat = pyGet(si, 'monthly_status', '');
  const deling = pyGet(si, 'deling', undefined);
  const deqi = pyGet(si, 'deqi', undefined);
  const helpS = pyGet(si, 'help_score', 0);
  const drainS = pyGet(si, 'drain_score', 0);
  const baseNotes = [];
  baseNotes.push(`月令${pyStr(pyOr(mstat, '—'))}` + (pyTruthy(deling) ? '（得令）' : '（不得令）'));
  baseNotes.push(pyTruthy(deqi) ? '坐支通根' : '不通根');
  baseNotes.push(`帮扶力${pyStr(helpS)}对克泄耗${pyStr(drainS)}`);
  factors.push({
    module: '日主旺衰',
    factor: `日主${pyStr(dm)}${pyStr(dmWx)}`,
    polarity: '中',
    weight: 0,
    note: baseNotes.join('；') + ` ⟹ ${pyStr(strength)}`,
  });

  // ── 二、格局成破救应 ──
  // ⚠ 默认值是**急切求值**的（Python 传参先算 `chart.get("pattern","")`），无副作用，
  //   照写即可；但别改成「先判 ge 有没有 pattern 再决定要不要读 chart」——那是另一种语义。
  const pattern = pyGet(ge, 'pattern', pyGet(chart, 'pattern', ''));
  const quality = pyGet(ge, 'quality', '');
  const cheng = pyOr(pyGet(ge, 'cheng_hit', []), []);
  const po = pyOr(pyGet(ge, 'po_hit', []), []);
  const jiu = pyGet(ge, 'jiu', '');
  for (const c of cheng) {
    score += 2;
    factors.push({ module: '格局成破', factor: `成格·${pyStr(pattern)}`, polarity: '利',
      weight: 2, note: c });
  }
  for (const p of po) {
    score -= 2;
    factors.push({ module: '格局成破', factor: `破格·${pyStr(pattern)}`, polarity: '害',
      weight: -2, note: p });
  }
  if (po.length && pyTruthy(jiu)) {
    score += 1;
    factors.push({ module: '格局成破', factor: '破而有救', polarity: '利', weight: 1,
      note: pyAddStr(pyIndexSlice(jiu, 0, 60), pyLen(jiu) > 60 ? '…' : '') });
  }

  // ── 三、用神 + 调候到位 ──
  const yw = pyGet(ys, 'yong_shen_wx', '');
  const jw = pyGet(ys, 'ji_shen_wx', '');
  if (pyTruthy(yw)) {
    // ⚠ `${yw}` 不能裸插：真实链路里它是单字五行，但 `master_synthesis` 明写了
    //   「可能是 list」的处理，故 `pyStr` 兜住（`['水','木']` 与 `水,木` 不是一回事）。
    factors.push({ module: '用神喜忌', factor: `用神取${pyStr(yw)}`, polarity: '中', weight: 0,
      note: pyIndexSlice(pyOr(pyGet(ys, 'analysis', ''), ''), 0, 56) });
  }
  const thPrimary = pyGet(th, 'primary', '');
  const thIn = pyGet(th, 'primary_in_chart', undefined);
  if (pyTruthy(thPrimary)) {
    if (pyTruthy(thIn)) {
      score += 2;
      factors.push({ module: '调候', factor: `调候用神${pyStr(thPrimary)}透/在局`, polarity: '利',
        weight: 2, note: '寒暖燥湿得调，命局气候中和，用神得力' });
    } else {
      score -= 2;
      factors.push({ module: '调候', factor: `调候用神${pyStr(thPrimary)}不上卦`, polarity: '害',
        weight: -2, note: '调候之神缺位，气候失衡，需岁运补之方显' });
    }
  }

  // ── 四、刑冲合害损益 ──
  const nChong = pyGet(rel, 'total_chong', 0);
  const nXing = pyGet(rel, 'total_xing', 0);
  const nHe = pyGet(rel, 'total_he', 0);
  const warns = pyOr(pyGet(rel, 'key_warnings', []), []);
  const bless = pyOr(pyGet(rel, 'key_blessings', []), []);
  if (nChong || nXing) {
    score -= 1;
    const w = warns.length ? warns[0] : `${pyStr(nChong)}冲${pyStr(nXing)}刑`;
    factors.push({ module: '刑冲合害', factor: `${pyStr(nChong)}冲${pyStr(nXing)}刑动荡`,
      polarity: '害', weight: -1, note: pyIndexSlice(w.replace('⚠ ', ''), 0, 56) });
  }
  if (nHe && bless.length) {
    score += 1;
    factors.push({ module: '刑冲合害', factor: `${pyStr(nHe)}合相生`, polarity: '利',
      weight: 1, note: pyIndexSlice(bless[0].replace('✓ ', ''), 0, 56) });
  }

  // ── 五、命局综合评定（先天之体，不计后天运）──
  let label; let desc;
  if (score >= 4) {
    label = '命局上佳'; desc = '格成用真、调候得宜，根基稳固，一生大局向上。';
  } else if (score >= 1) {
    label = '命局中平偏上'; desc = '格局有成、用神可取，然不无瑕疵，趋用避忌则吉。';
  } else if (score >= -1) {
    label = '命局中平'; desc = '成破相参、得失互见，全凭岁运扶抑，重在扬长补短。';
  } else if (score >= -3) {
    label = '命局偏弱'; desc = '格局有损或用神失力，一生多费周折，尤须岁运补救。';
  } else {
    label = '命局受损'; desc = '格破用伤、刑冲交加，根基不固，须大运得力方转。';
  }

  // ── 六、当前运程（后天之时）：大运流年并入，单列不改先天命局评定 ──
  const cf = pyOr(pyGet(chart, 'current_fortune', {}), {});
  let fortuneFactor = null;
  if (pyTruthy(pyGet(cf, 'available', undefined))) {
    const cdy = pyOr(pyGet(cf, 'current_dayun', {}), {});
    const helpv = pyGet(cdy, 'help', '');
    let fpol; let fnote;
    if (helpv === '扶用') {
      fpol = '利'; fnote = '现行大运扶起用神，先天命局得后天之助，宜进取';
    } else if (helpv === '助忌') {
      fpol = '害'; fnote = '现行大运助起忌神，宜守成避险、不宜妄动';
    } else {
      fpol = '中'; fnote = '现行大运于命局用忌无显著助损，平运守常';
    }
    fortuneFactor = {
      module: '当前大运（后天）',
      factor: `${pyStr(pyGet(cdy, 'ganzhi', ''))}运（${pyStr(pyGet(cdy, 'shishen', ''))}）`,
      polarity: fpol, weight: 0, note: fnote,
    };
    factors.push(fortuneFactor);
  }

  // 推理链文字
  const seg = [`日主${dm}${dmWx}（${pyStr(strength)}）`];
  for (const f of factors.slice(1)) {
    if (f.module === '当前大运（后天）') continue;
    const pol = pyGet(POL_MARK, f.polarity, '·');
    seg.push(`〔${f.module}〕${pol}${f.factor}`);
  }
  let chainText = seg.join('　→　') + `　⟹　${label}（先天综合力${pySignFormat(score)}）`;
  if (fortuneFactor) {
    const fpol = pyGet(POL_MARK, fortuneFactor.polarity, '·');
    const cln = pyOr(pyGet(cf, 'current_liunian', {}), {});
    chainText += `　‖后天‖　〔当前大运〕${fpol}${fortuneFactor.factor}`;
    if (pyTruthy(pyGet(cln, 'ganzhi', ''))) {
      chainText += ` · ${pyStr(pyGet(cf, 'current_year', ''))}年${pyGet(cln, 'ganzhi', '')}`
        + `（${pyStr(pyGet(cln, 'quality', ''))}）`;
    }
  }

  return {
    available: true,
    day_master: `${pyStr(dm)}${pyStr(dmWx)}`,
    strength: strength,
    pattern: pattern,
    quality: quality,
    yong_shen_wx: yw,
    ji_shen_wx: jw,
    factors: factors,
    composite_score: score,
    composite_label: label,
    composite_desc: desc,
    current_fortune_note: fortuneFactor ? fortuneFactor.note : '',
    chain_text: chainText,
  };
}

module.exports = { synthesizeMingju, POL_MARK };
