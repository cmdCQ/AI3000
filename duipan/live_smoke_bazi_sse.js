/**
 * 线上探针 · 八字解读的**真流式**这一条路
 * ==========================================================================
 *
 * 为什么单独立一条（其余证据都盖不到它）：
 *
 *   · 容器内那支探针（`tools/probe_bazi_report.js`）抓的是 `baziChartFromParams` +
 *     `baziReportPrompt`，**用 `stream: false` 调的上游**；
 *   · `duipan/smoke_bazi_parse.js` 的 `fetch`/`openai` **全是桩**，验的是闸门行为；
 *   · 页面探针（`live_smoke_bazi_detail.js`）是**只读**的，从不点「解读」（那是真花钱）。
 *
 *   于是「关掉思考 + 温度 0.3 + 一份长报告」这组参数，**没有一条真链路走过**
 *   `stream: true` 那一支。而这两种走法在上游是两条实现：`thinking` / `temperature`
 *   能不能与流式共存、流里的 `usage` 帧到不到得了、nginx 会不会把流攒成一坨、
 *   长报告在流上会不会被切断 —— 全都只有真跑一次才知道。
 *
 * 这条探针**会花钱、会给测试账号写一条解析记录**，所以它不是回归的一部分
 * （不在 `regress_bazi.sh` 里），只在「动过这条路的参数」之后手动跑一次。
 * 判据只取**用户看得见的东西**：字节是不是一点点来的、正文完不完整、尾巴上的
 * 消耗数是不是上游真数 —— 不去窥探上游的内部字段（那些容器探针已经管了）。
 *
 * 用法：
 *   node duipan/live_smoke_bazi_sse.js
 *   账号：AI3000_TEST_PHONE / AI3000_TEST_PW，缺省回落 /tmp/ai3000_testacct
 *         （第 1 行手机号、第 2 行密码；**不进仓库**）
 *   BASE 可覆盖（缺省 https://sqw.somtfly.com）
 *
 *   PROBE_DUMP=<file>        真跑之后把原始字节与时间戳存下来
 *   PROBE_JUDGE_FILE=<file>  拿存稿**离线复判**：不发请求、不花钱、不写记录
 *
 *   存稿与离线复判是**必须先有**的东西，不是锦上添花：判据写错是常态
 *   （本文件第一版就有两条，见 `judge()` 的注），而「改一条判据要再花一次真调用」
 *   会让人明知判据不对也凑合留着 —— 那正是「判据过严，好输出看起来像坏的」的病根。
 * 退出码：0 = 全绿；1 = 有用例失败；2 = 环境问题
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'https://sqw.somtfly.com';
const ROOT = path.join(__dirname, '..');

// 上限与标签**从源码切**，不在本脚本里写死：写死 8000 的话，线上真把上限改到 3000
// 而长报告正好被截断，这里会因为「8000 > 3000 也算小于」或者别的巧合照样绿。
function fromSource(re, label, human) {
  const src = fs.readFileSync(path.join(ROOT, 'build/backend/auth-server.js'), 'utf8');
  const m = src.match(re);
  if (!m) {
    console.error(`❌ 取不到「${label}」（${human}）。auth-server.js 改名了？`);
    process.exit(2);
  }
  return m[1];
}
const LLM_MAX_TOKENS = Number(fromSource(/const LLM_MAX_TOKENS = (\d+);/, 'LLM_MAX_TOKENS', '上游 token 上限'));
const POINTS_LABEL = fromSource(/const POINTS_LABEL = '([^']+)';/, 'POINTS_LABEL', '记账尾巴标签');
// 8 个模块的名字从产品层那份规范里取（`bazi_report.js` 的 `### N. 名字`）。
// 不在这里另抄一份：抄一份的话，规范里改了模块名、这里照样按旧名字判。
const MODULES = (() => {
  const src = fs.readFileSync(path.join(ROOT, 'build/backend/paipan/bazi_report.js'), 'utf8');
  const heads = (src.match(/^### \d+\. .+$/gm) || []).map((s) => s.replace(/^### \d+\. /, ''));
  if (heads.length !== 8) {
    console.error(`❌ 从 bazi_report.js 取到的模块标题不是 8 个（${heads.length}）：${JSON.stringify(heads)}`);
    process.exit(2);
  }
  return heads;
})();

const fails = [];
function check(label, cond, detail) {
  if (!cond) fails.push(`${label}：${detail}`);
  console.log(`   ${cond ? '✓' : '✗'} ${label}${cond ? '' : ` —— ${detail}`}`);
}

function account() {
  if (process.env.AI3000_TEST_PHONE && process.env.AI3000_TEST_PW) {
    return { phone: process.env.AI3000_TEST_PHONE, pw: process.env.AI3000_TEST_PW };
  }
  const f = '/tmp/ai3000_testacct';
  if (!fs.existsSync(f)) {
    console.error(`❌ 没有测试账号：设 AI3000_TEST_PHONE / AI3000_TEST_PW，或建 ${f}（两行）`);
    process.exit(2);
  }
  const [phone, pw] = fs.readFileSync(f, 'utf8').split('\n').map((s) => s.trim());
  return { phone, pw };
}

// 与前端同一张盘的那组出生参数（1984-02-04 12:30 男）—— 逐字段可复现，
// 故同一张盘跑两次的分数也能直接比（用户拍板的「替换，一次只看一个」那套里，
// 分数稳定性正是要反复验的东西）。
const BIRTH = { y: 1984, mo: 2, d: 4, h: 12, mi: 30, gender: '男' };

async function main() {
  // 离线复判：只读存稿，不发请求、不花钱、不写记录。改判据时走这条。
  if (process.env.PROBE_JUDGE_FILE) {
    const f = process.env.PROBE_JUDGE_FILE;
    const d = JSON.parse(fs.readFileSync(f, 'utf8'));
    console.log(`▌离线复判（${f}，真跑于 ${d.at}）—— 不发请求、不花钱`);
    judge(d);
    return report();
  }

  const acc = account();
  console.log(`▌线上八字解读 · 真流式（${BASE}）`);
  console.log('⚠ 这一跑会真调模型、花费用，并给测试账号写一条解析记录\n');

  console.log('① 登录');
  const lr = await fetch(`${BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: acc.phone, password: acc.pw }),
  });
  const lj = await lr.json().catch(() => ({}));
  check('登录拿到 token', lr.ok && !!lj.token, JSON.stringify(lj).slice(0, 200));
  if (!lr.ok || !lj.token) { console.error('❌ 登录失败，后面的都无从谈起'); process.exit(2); }
  const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + lj.token };

  console.log('\n② 取一份真命盘（解读记到它名下）');
  const cr = await fetch(`${BASE}/api/charts`, { headers: H });
  const cj = await cr.json().catch(() => ({}));
  const list = cj.charts || cj.list || cj;
  check('拿到命盘列表且至少一份', Array.isArray(list) && list.length > 0, JSON.stringify(cj).slice(0, 200));
  const chartId = Array.isArray(list) && list.length ? list[0].id : null;
  if (chartId) console.log(`   · 用第 1 份：id=${chartId}`);

  console.log('\n③ POST /api/bazi/parse（tab=事业，流式）');
  const t0 = Date.now();
  const r = await fetch(`${BASE}/api/bazi/parse`, {
    method: 'POST', headers: H,
    body: JSON.stringify(Object.assign({}, BIRTH, { tab: '事业', chartId })),
  });
  check('HTTP 200', r.status === 200, String(r.status));
  const ctype = r.headers.get('content-type') || '';
  check('流式响应头（text/event-stream）', /text\/event-stream/.test(ctype), ctype);
  // ⚠ 这里**不查** `X-Accel-Buffering`：那是给 nginx 看的控制头，nginx 会**消费掉**它，
  //   不会转发给客户端 —— 从外面看到 null 是**默认行为**，不是「代理在攒包」。
  //   （我第一版就把它当成失败项，红了一条其实没问题的断言。这是第四次栽在
  //    「判据写代理、不写效果」上，故这条注释留着。）
  //   真正要证的效果是「字节是一点点来的」——由下面那两条按时间戳判，与代理怎么配无关。
  if (!r.status || r.status !== 200) {
    const t = await r.text().catch(() => '');
    console.error('   响应：' + t.slice(0, 300));
    process.exit(1);
  }

  // ── 真的是一点点来的吗 ─────────────────────────────────────────────
  const stamps = [];
  const dec = new TextDecoder('utf-8');
  let body = '';
  let firstByteAt = null;
  for await (const chunk of r.body) {
    if (firstByteAt === null) firstByteAt = Date.now();
    stamps.push(Date.now());
    body += dec.decode(chunk, { stream: true });
  }
  const totalMs = Date.now() - t0;
  const ttfb = (firstByteAt || Date.now()) - t0;
  console.log(`   · 首字节 ${(ttfb / 1000).toFixed(1)}s，末字节 ${(totalMs / 1000).toFixed(1)}s，`
    + `${stamps.length} 块，正文 ${body.length} 字`);
  // 存稿：把这次真跑的**原始字节与时间戳**落盘，之后改判据可以离线复判
  // （`PROBE_JUDGE_FILE`），不必再花一次真调用。
  // ⚠ 没有这个的话，会心疼钱而不敢改判据 —— 明知判据有问题也凑合留着，
  //   而这正是「判据过严 → 好输出看起来像坏的」反复发生的原因。
  if (process.env.PROBE_DUMP) {
    fs.writeFileSync(process.env.PROBE_DUMP, JSON.stringify({
      base: BASE, at: new Date().toISOString(), ttfb, totalMs,
      chunks: stamps.length, body, stamps,
    }));
    console.log(`   · 存稿写入 ${process.env.PROBE_DUMP}（改判据时用 PROBE_JUDGE_FILE 离线复判）`);
  }

  judge({ base: BASE, ttfb, totalMs, stamps, body });
  return report();
}

/**
 * 判据全在这里 —— 输入只有「字节 + 时间戳」。
 *
 * 拆出来是为了 `PROBE_JUDGE_FILE`：拿存稿离线复判，一分钱不再花。
 * 判据写错了（过严/过松）是**常态**，本文件第一版就有两条：
 *   · 拿 `X-Accel-Buffering` 当判据（那是给 nginx 的控制头，客户端根本收不到）；
 *   · 拿「输入+输出」的合计去比 `max_tokens`（那个上限只管**输出**）。
 * 没有离线复判，改这两条就要再花一次真调用 —— 于是明知判据不对也会凑合留着。
 */
function judge(d) {
  const { body, ttfb, totalMs, stamps } = d;
  check('响应是多块来的（真流式，不是攒成一块）', stamps.length > 1, `${stamps.length} 块`);
  // 首字节要**明显早于**末字节，否则「多块」可能只是 TCP 切包。
  // 长报告的生成要几十秒，首字节若在末尾附近出现，那这段流对用户就是「转圈到底」。
  check('首字节远早于末字节（用户能边生成边看，不是转圈到最后）',
    ttfb < totalMs / 2 && totalMs - ttfb > 3000,
    JSON.stringify({ 首字节ms: ttfb, 总ms: totalMs }));
  // 进度是**铺开**的，不是「攒一会儿猛地吐完」：第一块与最后一块之间要占掉大部分时长。
  // 这条才是「代理有没有在攒包」的效果判据（见上面那段为什么不能查响应头）。
  const spread = stamps.length ? stamps[stamps.length - 1] - stamps[0] : 0;
  check('字节是持续吐出来的（首块到末块占掉大部分时长，不是攒完一次吐）',
    stamps.length > 10 && spread > totalMs * 0.5,
    JSON.stringify({ 块数: stamps.length, 铺开ms: spread, 总ms: totalMs }));

  // ── 正文完不完整（截断是这个规格最大的风险，见 LLM_MAX_TOKENS 那段注）──
  const missHead = MODULES.filter((m, i) => body.indexOf(`### ${i + 1}. ${m}`) < 0);
  check('8 个模块标题一个不缺（真按规范输出了）', missHead.length === 0, JSON.stringify(missHead));
  const lastIdx = body.indexOf(`### 8. ${MODULES[7]}`);
  const tailAfterLast = lastIdx < 0 ? 0 : body.slice(lastIdx).length;
  check('最后一个模块之后还有正文（不是切在标题上）', tailAfterLast > 80, `${tailAfterLast} 字`);
  check('有「命盘评分」那一部分', /命盘评分/.test(body), body.slice(0, 80));
  check('正文够长（长报告确实是长的，不是一段敷衍）', body.length > 2000, `${body.length} 字`);

  // ── 记账尾巴：数字必须是上游真数 ──
  const tail = body.slice(-160);
  const esc = POINTS_LABEL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tm = new RegExp(esc + '输入 (\\d+) \\+ 输出 (\\d+) = (\\d+)').exec(tail);
  check('末尾有记账尾巴（' + POINTS_LABEL + '），三个数齐',
    !!tm, JSON.stringify(tail));
  if (tm) {
    const [, inp, outp, tot] = tm.map(Number);
    check('「输入 + 输出 = 合计」自洽（不是本地估出来的三个独立数）',
      inp + outp === tot, JSON.stringify({ inp, outp, tot }));
    // ⚠ 与上限比的是**输出**，不是合计：`max_tokens` 管的是模型**生成**的那一段，
    //   输入（这份盘材料很长）不计入 —— 我第一版拿合计比 8000，线上正常出文却报
    //   「9288 > 8000 疑似截断」，纯属判据选错字段。
    //   而且真正的截断判据不在这里：**截断必然切掉尾巴**，上面那两条
    //   「8 个模块齐 + 最后一个模块之后还有正文」才是精确判据（截断时那条必红）。
    //   这一条只是「没顶到天花板上」的旁证。
    check(`输出 token 没顶到上游上限 ${LLM_MAX_TOKENS}（顶死才是截断的样子）`,
      outp > 0 && outp < LLM_MAX_TOKENS, JSON.stringify({ 输出: outp, 上限: LLM_MAX_TOKENS }));
  }
}

function report() {
  console.log('');
  if (fails.length) {
    console.log(`❌ 线上真流式探针：${fails.length} 项失败：`);
    fails.forEach((f) => console.log('   · ' + f));
    console.log('\n⚠ 这一跑已经写进测试账号的解析记录；失败时请把上面的正文片段留档再决定要不要重跑。');
    console.log('   改判据后可用 PROBE_JUDGE_FILE=<存档> 离线复判，不必再花一次真调用。');
    return 1;
  }
  console.log('✅ 线上真流式全绿（真 nginx + 真后端 + 真上游）。');
  console.log('   ⚠ 本跑给测试账号写了一条解析记录（bazi_analyses）—— 需要的话请手动清掉。');
  return 0;
}

main().then((code) => process.exit(code))
  .catch((e) => { console.error('❌ ' + (e && e.stack || e)); process.exit(1); });
