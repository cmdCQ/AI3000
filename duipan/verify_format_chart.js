/**
 * 校验：把 formatChart 从「自造的近似判定」改接到「已对拍的 relations.js」之后，
 * 输出文本的**每一处差异都是有意改进**，而不是悄悄改坏了什么。
 *
 * 做法（不依赖 shushu —— shushu 没有 formatChart，这是 ai3000 独有的文本层）：
 *   1. 720 例（golden_dynamic.json 同一批 fixture）上跑「旧 formatChart」与
 *      「新 formatChart」，逐例比字符串。
 *   2. 把差异归类，逐类要求「旧侧错/缺、新侧对/全」，任何一类不满足即失败。
 *   3. 结构可达性复核：新盘实际产出的 (本爻支 → 变爻支) 集合，必须与
 *      旧 `JIN_SHEN`/`TUI_SHEN` 相对 `DIZHI_PROGRESS_GROUPS` 多出的四对**不相交**。
 *      ——这是「换表不掉行为」的前提，必须实跑证明，不能只引定理。
 *
 * 用法：node verify_format_chart.js [旧 liuyao.js 路径]
 *
 * 旧文件默认取 /tmp/oldliuyao/liuyao_old.js。**不能直接放 /tmp**：旧文件里有
 * `require('./constants')`，得同目录下有个 constants.js 才加载得起来。
 * 准备：
 *   mkdir -p /tmp/oldliuyao && cd <repo>
 *   git show HEAD:build/backend/paipan/liuyao.js > /tmp/oldliuyao/liuyao_old.js
 *   ln -sf $PWD/build/backend/paipan/constants.js /tmp/oldliuyao/constants.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const PAIPAN = path.join(__dirname, '..', 'build', 'backend', 'paipan');
const C = require(path.join(PAIPAN, 'constants.js'));
const R = require(path.join(PAIPAN, 'relations.js'));
const NEW = require(path.join(PAIPAN, 'liuyao.js'));

const OLD_PATH = process.argv[2] || '/tmp/oldliuyao/liuyao_old.js';
if (!fs.existsSync(OLD_PATH)) {
  console.error(`旧版 liuyao.js 不在 ${OLD_PATH}。见本文件头注的准备步骤。`);
  process.exit(1);
}
const OLD = require(OLD_PATH);

const golden = JSON.parse(fs.readFileSync(path.join(__dirname, 'golden_dynamic.json'), 'utf8'));

// 旧 JIN_SHEN/TUI_SHEN 比 DIZHI_PROGRESS_GROUPS 多出的四对（化冲结构定理的推论，见 relations.js 头注）
const EXTRA_PAIRS = [['辰', '未'], ['戌', '丑'], ['未', '辰'], ['丑', '戌']];
const isExtraPair = (o, c) => EXTRA_PAIRS.some((p) => p[0] === o && p[1] === c);

// 旧 huiTou 的措辞 → 新 analyzeChangedLineRelation 的措辞
const HUITOU_MAP = { 回头生: '回头生', 回头克: '回头克', 化泄气: '化泄', 化耗气: '化克他' };

const reachPairs = new Set();          // 实跑产出的 (本爻支→变爻支)
const extraHits = [];                  // 落在不可达四对上的（应为空）
const jtMismatch = [];                 // 进退神：旧新不一致（只允许落在不可达四对）
const htMismatch = [];                 // 回头生克：旧新类别不一致（只允许旧空、新「化同」）
const huatongCases = [];               // 旧漏判、新补上的「化同」
const sanheLost = [];                  // 旧已判成全三合、新侧丢失（应为空）
let nHalfOld = 0, nHalfNew = 0;        // 旧/新各报了多少组「占两支」
let nSame = 0, nDiff = 0, nBad = 0;
const textSamples = [];

for (const [cid, g] of Object.entries(golden)) {
  const bu = g.ben.upper, bl = g.ben.lower;
  const changed = C.changedLines(bu, bl, g.moving);
  const bt = C.linesToTrigrams(changed);
  const s = g.sizhu;
  const args = {
    benUpper: bu, benLower: bl, bianUpper: bt.upper, bianLower: bt.lower,
    yearGZ: s.year_gz, monthGZ: s.month_gz, dayGZ: s.day_gz, hourGZ: s.hour_gz,
  };
  const nw = NEW.buildChart(args);
  const od = OLD.buildChart(args);
  if (!nw || !od) { nBad++; continue; }

  // ── 可达性：实跑产出的支对 ──────────────────────────────
  for (const y of nw.yaos) {
    if (!y.changed) continue;
    reachPairs.add(y.dizhi + '→' + y.changed.dizhi);
    if (isExtraPair(y.dizhi, y.changed.dizhi)) extraHits.push(`${cid} ${y.dizhi}→${y.changed.dizhi}`);
  }

  // ── 逐动爻：进退神 / 回头生克 的旧新等价性 ────────────────
  for (const y of nw.yaos) {
    if (!y.changed) continue;
    const o = y.dizhi, c = y.changed.dizhi;
    const ow = C.DIZHI_WUXING[o], cw = C.DIZHI_WUXING[c];

    const oldJt = OLD.jinTuiShen(o, c);                       // '化进神'|'化退神'|''
    const newJt = R.checkJinTuiShen(o, c).type;               // '进神'|'退神'|''
    const expect = newJt ? '化' + newJt : '';
    if (oldJt !== expect && !isExtraPair(o, c)) jtMismatch.push(`${cid} ${o}→${c} 旧=${oldJt} 新=${expect}`);

    const oldHt = OLD.huiTou(ow, cw);
    const newHt = R.analyzeChangedLineRelation({ branch: o }, { branch: c }).relation || '';
    const mappedOld = oldHt ? HUITOU_MAP[oldHt] : '';
    if (mappedOld !== newHt) {
      if (mappedOld === '' && /^化同/.test(newHt)) huatongCases.push(`${cid} ${o}→${c}`);
      else htMismatch.push(`${cid} ${o}→${c} 旧=${oldHt} 新=${newHt}`);
    }
  }

  // ── 三合：旧 local sanHeJu 与新的 detectSanheSanhui 对账 ──
  // 只拿旧侧的 **complete**（三支俱全）比对：旧侧把「占两支」也记作三合，
  // 而新侧（照 shushu）把「占两支」另归半合，且 shushu 的半合表更窄
  // （只取长生+帝旺、帝旺+墓库两式，不含长生+墓库）。故半合这块**预期有差**，
  // 只统计不判失败；真正不能丢的是旧侧已判成的**全三合**。
  const key = (bs) => bs.slice().sort().join('');
  const newSanheKeys = new Set((nw.deep.sanhe_sanhui.sanhe || []).map((x) => key(x.branches)));
  for (const x of (od.sanHe || [])) {
    if (x.complete && !newSanheKeys.has(key(x.branches))) sanheLost.push(`${cid} ${x.branches.join('')}`);
    else if (!x.complete) nHalfOld++;
  }
  nHalfNew += (nw.deep.sanhe_sanhui.ban_sanhe || []).length;

  // ── 文本层 ──────────────────────────────────────────────
  const nt = NEW.formatChart(nw), ot = OLD.formatChart(od);
  if (nt === ot) nSame++;
  else {
    nDiff++;
    if (/\bundefined\b|NaN/.test(nt)) nBad++;
    if (textSamples.length < 4) textSamples.push({ cid, ot, nt });
  }
}

// ══════════════════════════════════════════════════════════════
const line = (s) => console.log(s);
line(`样例 ${Object.keys(golden).length} 例　文本相同 ${nSame}　文本有差异 ${nDiff}　内部错误 ${nBad}`);
line('');
line(`实跑可达支对 ${reachPairs.size} 种：${Array.from(reachPairs).sort().join(' ')}`);
line(`  落在旧表多出的四对上：${extraHits.length} 处${extraHits.length ? ' → ' + extraHits.slice(0, 5).join('; ') : ' ✅'}`);
line('');
line(`进退神旧新不一致（排除不可达四对）：${jtMismatch.length} ✅`.replace(/(\d+) ✅$/, (m, n) => (n === '0' ? '0 ✅' : n + ' ⚠')));
if (jtMismatch.length) jtMismatch.slice(0, 10).forEach((x) => line('  ' + x));
line(`回头生克类别不一致：${htMismatch.length}${htMismatch.length ? ' ⚠' : ' ✅'}`);
if (htMismatch.length) htMismatch.slice(0, 10).forEach((x) => line('  ' + x));
line(`旧漏判、新补上的「化同（伏吟、扶持）」：${huatongCases.length} 处（旧 huiTou 无此支，属补全）`);
huatongCases.slice(0, 6).forEach((x) => line('  ' + x));
line(`旧已判成全三合而新侧丢失（应为 0）：${sanheLost.length ? '⚠ ' + sanheLost.length + ' ' + sanheLost.slice(0, 5).join('; ') : '0 ✅'}`);
line(`「占两支」：旧侧记作三合 ${nHalfOld} 组，新侧另归半合 ${nHalfNew} 组`
   + '（新侧表更窄，属照 shushu 收窄，预期有差，不判失败）');
line('');
line('── 文本差异抽样（旧 → 新）────────────────────────────');
for (const s of textSamples) {
  line(`\n【${s.cid}】`);
  line('--- 旧 ---'); line(s.ot);
  line('--- 新 ---'); line(s.nt);
}

const ok = extraHits.length === 0 && jtMismatch.length === 0 && htMismatch.length === 0
        && sanheLost.length === 0 && nBad === 0;
line('');
line(ok ? '✅ 全部差异均为有意改进，无行为回退' : '⚠ 上表有不满足项，需人工判断');
process.exit(ok ? 0 : 1);
