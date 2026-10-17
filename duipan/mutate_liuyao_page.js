#!/usr/bin/env node
/**
 * 变异测试 · duipan/drive_liuyao_page.js
 * ==========================================================================
 *
 * 把每一处**逐个改回坏的**，看驱动抓不抓得住。抓不住的判据就是橡皮章
 * （写了等于没写，还给假信心）。
 *
 * 为什么单有一个文件：驱动里那几十条断言是**我自己写的**，它们当然会说自己对。
 * 唯一能证伪的办法就是拿已知的坏版本喂给它 —— 每条断言至少要有一次「它真的红了」。
 *
 * ★ 本文件的主要目的是给新加的 **⑥bis** 节做证伪。
 *   ⑥bis 抓的是「运行时拼出来的 HTML 里的行内 onclick 名字没挂到 window 上」。
 *   这个故障的**唯一**症状是浏览器控制台一行 `coinClick is not defined`，页面看着
 *   完全正常、不抛异常、也不影响折卦结果 —— 所以差分与 ⑥ 全绿，⑥bis 是唯一防线。
 *   不拿坏版本喂它一次，就不知道它到底守没守住。M1/M2/M3 三个变异全是打它的。
 *
 * 覆盖的变异：
 *   M1 `coinClick` 没挂到 window        —— ⑥bis「没有 … is not defined」必须红
 *   M2 `cycleManualLine` 没挂到 window  —— 同上（第二个名字，防只挂了一半）
 *   M3 `cycleManualLine` 挂上了但空转    —— ⑥bis「内容确实变了」必须红
 *   M4 `castToTrigrams` 折卦算错         —— ⑥ 的折卦判据必须红（证它也不是摆设）
 *   M5 记录页 `toggleManage` 没挂到 window —— ⑬「管理」必须红（同一类故障，另一页）
 *   M6 记录页 `viewRecord` 没挂到 window   —— ⑬「点卡片跳转」必须红
 *   M7 记录页 `viewRecord` 把 id 弄丢      —— ⑬「带上它自己的 id」必须红
 *   M8 结果页 `cardFromResult` 老形状折错  —— ⑨「老形状也渲染出卦」必须红
 *   M9 结果页 `meta.recordId` 传错         —— ⑨「解读存回它自己的 id」必须红
 *
 *   M5–M9 只在**新实现**分支里存在：这两页的老产物
 *   （`build/nginx/js/page-liuyao-{result,history}.js`）已随三页迁完删除，
 *   没有老东西可改。这不是覆盖漏洞，是那一侧已经没有实现。
 *
 * 每个变异跑完按 sha256 逐字节还原，最后一个变异之后统一再核一次全部文件。
 *
 * 用法：node duipan/mutate_liuyao_page.js     （九轮驱动，约 15–20 分钟）
 * 退出码：0 = 全部被抓且文件全还原
 */

'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
// ⚠ 必须测**产物**（`build/nginx`），不是 `src/web`：页面搬进 `src/app/` 之后
//   `src/web` 里就没有它了，驱动会在一个空页上「什么都读不到」而误报页面坏了。
//   `build/nginx` 是**超集**：没搬的页面是 `src/web` 的逐字拷贝，搬了的在构建产物里。
//   要临时换根：DRIVE_ROOT=/somewhere node <本脚本>
//
// ★ `PROBE_OUT=/tmp/liuyao-probe` 是**一条指令管三处**：产物根（WEB）、`vite build`
//   `--outDir`、以及喂给驱动的 `DRIVE_ROOT`。给这个开关的理由：`build/nginx` 是 nginx
//   的 bind mount 点，搬页那一轮**不许直写它**（直写等于绕过验证）。所以变异测试一律
//   `PROBE_OUT=/tmp/liuyao-probe node duipan/mutate_liuyao_page.js`。
//   不设 PROBE_OUT 时行为与原来完全一致（重建到 build/nginx）。
const OUT = process.env.PROBE_OUT || '';
const WEB = process.env.DRIVE_ROOT || OUT || path.join(ROOT, 'build', 'nginx');

const F = {
  // 老实现：一个文件里全都有（三个函数 + 折卦）
  legacy: path.join(WEB, 'js', 'page-liuyao.js'),
  // 新实现：函数在 logic.js，挂 window 的那几行在 main.jsx
  logic: path.join(ROOT, 'src', 'app', 'liuyao', 'logic.js'),
  main: path.join(ROOT, 'src', 'app', 'liuyao', 'main.jsx'),
  // 结果页 / 记录页（阶段 3 第 6、7 页）。记录页的 13 个函数在共享件里，
  // 挂 window 的 7 行在 history.jsx —— 一页两文件，理由见 M5/M6。
  resultLogic: path.join(ROOT, 'src', 'app', 'liuyao', 'result.logic.js'),
  historyJsx: path.join(ROOT, 'src', 'app', 'liuyao', 'history.jsx'),
  lib: path.join(ROOT, 'src', 'app', 'lib', 'recordsHistory.js'),
};

const VITE = path.join(ROOT, 'src', 'app', 'node_modules', '.bin', 'vite');
// 驱动脚本与超时。两个都可从环境变量覆盖 —— **只为验证「被杀不算抓住」这条判据本身**
// （`MUTATE_DRIVER=/tmp/sleep-driver.js MUTATE_TIMEOUT=2500 node …` 见文件尾注释）。
// 正常情况下不要设它们。
const DRIVER = process.env.MUTATE_DRIVER || path.join('duipan', 'drive_liuyao_page.js');
const TIMEOUT = Number(process.env.MUTATE_TIMEOUT || 300000);
function rebuild() {
  const args = ['build', '--logLevel', 'error'];
  if (OUT) {
    // outDir 在 root 之外，Vite 要求显式 --emptyOutDir（否则只警告不清理）。
    fs.rmSync(OUT, { recursive: true, force: true });
    args.push('--outDir', OUT, '--emptyOutDir');
  }
  const r = spawnSync(VITE, args, {
    cwd: path.join(ROOT, 'src', 'app'), encoding: 'utf8', timeout: 180000,
  });
  if (r.status !== 0) {
    console.error('✗ vite build 失败：\n' + (r.stderr || '') + (r.stdout || ''));
    process.exit(2);
  }
}

const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

// ── 这次跑的是老实现还是新实现？────────────────────────────────────
// 判据取**产物**：新页的 index.html 引用 /assets/*.js 且带 type="module"。
function deployedIsReact() {
  try {
    const html = fs.readFileSync(path.join(WEB, 'liuyao', 'index.html'), 'utf8');
    return /type="module"/.test(html) && /\/assets\//.test(html);
  } catch (e) { return false; }
}

// ── 变异表 ──────────────────────────────────────────────────────
// find 必须是**恰好唯一**的一段；脚本会自检出现次数，不是 1 次就当场报错退出
// （比「变异点找不到」静默跳过、结果还报绿好得多）。
function mutations(isReact) {
  if (isReact) {
    return [
      {
        name: 'M1 coinClick 没挂到 window -> ⑥bis 的 not-defined 判据必须红',
        files: ['main'],
        find: "  expose('coinClick', coinClick);",
        repl: "  // [变异 M1] expose('coinClick', coinClick);",
        expect: 'is not defined',
      },
      {
        name: 'M2 cycleManualLine 没挂到 window -> 同上（防只挂了一半）',
        files: ['main'],
        find: "  expose('cycleManualLine', cycleManualLine);",
        repl: "  // [变异 M2] expose('cycleManualLine', cycleManualLine);",
        expect: 'is not defined',
      },
      {
        name: 'M3 cycleManualLine 挂上了但空转 -> ⑥bis 的「内容确实变了」必须红',
        files: ['logic'],
        find: 'export function cycleManualLine(posIdx) {',
        repl: 'export function cycleManualLine(posIdx) {\n  if (posIdx >= -1) return; // [变异 M3] 点了不改状态',
        expect: '内容确实变了',
      },
      {
        // ⚠ 原来这条是把 `castToTrigrams` 改名（`castToTrigrams_mutated`），于是每个
        //   调用者都 ReferenceError → 驱动**崩了**（退出码 2），不是断言判红。崩溃只
        //   证明「改坏了会被发现」，没证明「⑥ 的折卦判据本身有效」。改成「函数还在、
        //   但上下卦对调」：页面照常跑完，只有卦值错 —— 这样才真的在考 ⑥ 那条断言。
        name: 'M4 castToTrigrams 把上下卦对调（折卦算错，函数仍可调用）-> ⑥ 的折卦判据必须红',
        files: ['logic'],
        find: '    upper: linesToTri([yangs[3], yangs[4], yangs[5]]),\n'
            + '    lower: linesToTri([yangs[0], yangs[1], yangs[2]]),',
        repl: '    upper: linesToTri([yangs[0], yangs[1], yangs[2]]),\n'
            + '    lower: linesToTri([yangs[3], yangs[4], yangs[5]]),',
        expect: '与手算逐字相同',
      },
      // ── 结果页 / 记录页（阶段 3 第 6、7 页）────────────────────────────
      // ⚠ 这两页的老产物（`build/nginx/js/page-liuyao-{result,history}.js`）
      //   已经随三页迁完删掉了，所以下面四条只在 isReact 分支里存在；
      //   老实现分支没有「新两页」可变异，不是漏了。
      {
        // 记录页的内联 onclick 要 7 个**真** window 全局。漏挂的症状是「点了没反应、
        // 控制台只有一行 `toggleManage is not defined`」—— ⑬ 的「管理」那条必须红。
        // 拿它当第一条，是因为它测的正是「内联 onclick 的全局得在」这条契约。
        name: 'M5 记录页 toggleManage 没挂到 window -> ⑬ 的「管理」判据必须红',
        files: ['historyJsx'],
        find: "  expose('toggleManage', toggleManage);",
        repl: "  // [变异 M5] expose('toggleManage', toggleManage);",
        // ⚠ 期望项是**那条断言**，不是 `toggleManage is not defined`：管理模式没进去，
        //   后面「点卡片」就变成跳转（本页不再是本页），驱动在那之后会拿 result.html
        //   上的 DOM 去 getElementById → 崩在 `null.click`（退出码 2），
        //   `errsOf` 那一行根本没机会打印。抓「第一条红的断言」才是这条判据的本意。
        expect: '✗ 点「管理」',
      },
      {
        // 同上，第二个名字（防只挂了一半）。`viewRecord` 是 renderCards() 拼进
        // HTML 字符串里的 onclick，比骨架里那几个更容易漏。
        name: 'M6 记录页 viewRecord 没挂到 window -> ⑬ 的「点卡片跳转」必须红',
        files: ['historyJsx'],
        find: "  expose('viewRecord', viewRecord);",
        repl: "  // [变异 M6] expose('viewRecord', viewRecord);",
        // 期望项取「第一条会红的断言」，不取控制台那行 `viewRecord is not defined`：
        // 点了不跳 → `L.until` 空转 6s → href 那条断言立刻红；而错误串要等后面
        // ⑦「没有 JS 报错」才打印，中间任何一步崩了它就没机会出现（M5 踩过同一个坑）。
        expect: '✗ 点卡片跳到结果页',
      },
      {
        // ⚠ 这里刻意不用「跳错成 999」：⑬ 只断言 href 匹配 /result\.html\?id=\d+/，
        //   一个**错的数字 id 照样过**。所以变异取「id 丢了」—— 那才是现有判据
        //   真能看见的错。（「跳错但仍是数字」这条判据现在不守，已写进报告。）
        name: 'M7 记录页 viewRecord 把 id 丢了 -> ⑬ 的「带上它自己的 id」必须红',
        files: ['lib'],
        find: '    window.location.href = detailsUrl + id;',
        repl: '    window.location.href = detailsUrl; // [变异 M7] id 没带上',
        expect: '✗ 点卡片跳到结果页',
      },
      {
        // 老形状记录（卦在 result.gua.benGua 而不是 result.hexagrams）是本轮最容易
        // 折错的一处：把「变卦」当「本卦」折，页面照常渲染、只是那一卦不对。
        name: 'M8 结果页 cardFromResult 把老形状的变卦当本卦 -> ⑨ 的「老形状也渲染出卦」必须红',
        files: ['resultLogic'],
        find: '      benGua: { upper: b.upper, lower: b.lower },',
        repl: '      benGua: { upper: n.upper || b.upper, lower: n.lower || b.lower }, // [变异 M8]',
        expect: '✗ 老形状记录也渲染出卦',
      },
      {
        // meta.recordId 是「盘上带着这条记录的 id」的唯一来源，AI 存档靠它。
        // 传错不白屏、盘也对，只有存档落到别的 id 上 —— ⑨ 末尾那条轮询是唯一能看见它的判据。
        name: 'M9 结果页把 meta.recordId 传错 -> ⑨ 的「解读存回它自己的 id」必须红',
        files: ['resultLogic'],
        find: '    recordId: id,',
        repl: "    recordId: '0', // [变异 M9] 盘上带的 id 错了，AI 存档会存到 0 号",
        expect: '✗ 老记录的解读也存回它自己的 id',
      },
    ];
  }
  return [
    {
      name: 'M1 coinClick 没挂到 window -> ⑥bis 的 not-defined 判据必须红',
      files: ['legacy'],
      find: 'function coinClick() {',
      repl: 'function coinClick_mutated_away() {',
      expect: 'is not defined',
    },
    {
      name: 'M2 cycleManualLine 没挂到 window -> 同上（防只挂了一半）',
      files: ['legacy'],
      find: 'function cycleManualLine(posIdx) {',
      repl: 'function cycleManualLine_mutated_away(posIdx) {',
      expect: 'is not defined',
    },
    {
      name: 'M3 cycleManualLine 挂上了但空转 -> ⑥bis 的「内容确实变了」必须红',
      files: ['legacy'],
      find: 'function cycleManualLine(posIdx) {',
      repl: 'function cycleManualLine(posIdx) {\n  if (posIdx >= -1) return; // [变异 M3] 点了不改状态',
      expect: '内容确实变了',
    },
    {
      name: 'M4 castToTrigrams 折卦算错 -> ⑥ 的折卦判据必须红',
      files: ['legacy'],
      find: 'function castToTrigrams(',
      repl: 'function castToTrigrams_mutated_away(',
      expect: '',
    },
  ];
}

// ── 跑一次驱动 ──────────────────────────────────────────────────
// ⚠ 用 spawnSync 直接起 node、超时直接杀掉它本人；不要走 `sh -c` ——
//   那样超时杀的是 sh，node 还活着继续读产物，下一轮变异会拿到上一轮的结果。
function run() {
  const r = spawnSync('node', [DRIVER], {
    cwd: ROOT, encoding: 'utf8',
    timeout: TIMEOUT,
    // 显式 SIGKILL：这样「我们自己的超时」= SIGKILL，而「被外部杀掉」= SIGTERM
    // （`drive_lib.launchFirefox()` 杀全机无头 Firefox 时就是这个）。两种都不算数，
    // 但日志里要能一眼分清是哪一种。
    killSignal: 'SIGKILL',
    maxBuffer: 64 * 1024 * 1024,
    // 驱动默认读 build/nginx；PROBE_OUT 模式下必须跟着挪，否则它读的是**上一轮**的产物，
    // 变异永远看不到效果（还全报「没抓住」，看着像橡皮章）。
    env: Object.assign({}, process.env, { DRIVE_ROOT: WEB }),
  });
  const out = (r.stdout || '') + (r.stderr || '');
  // ★ 被判据杀掉的运行**不是**断言判红。超时（spawnSync 用 SIGKILL）或被外部杀掉
  //   （`drive_lib.launchFirefox()` 上来就把全机的无头 Firefox 杀掉 —— 所以并发跑
  //   两个驱页时必然出现 SIGTERM）时，`r.status` 是 **null**、`r.signal` 是信号名。
  //
  //   以前这里是 `return { code: r.status, ... }` + `caught = r.code !== 0 && ...`：
  //   `null !== 0` 是 **true**，`expect === ''` 时 `caught` 直接为 true；而且被杀时
  //   驱动的半截输出里往往**已经打印过** `is not defined` 之类（页面报错在崩溃前就
  //   出了），`hit` 也跟着帮凶 —— 两条一起 = **假绿**，且看起来一切正常。
  //   一个会把崩溃算成成功的套件比没有套件更危险，所以这两条判据必须分开。
  const killed = r.status === null;
  return {
    code: r.status, out, killed,
    signal: r.signal || null,
    timedOut: killed && r.signal === 'SIGKILL',
  };
}

// ── 主流程 ──────────────────────────────────────────────────────
// ★ PROBE_OUT 模式必须先认定是**新实现**，不能交给 deployedIsReact() 去猜。
//
//   实测踩到：PROBE_OUT 指向一个**还没建出来的空目录**，而这一行在 `rebuild()`
//   **之前**执行 —— `deployedIsReact()` 读不到 `$PROBE_OUT/liuyao/index.html`，
//   catch 成 false，于是整个套件改的是**老产物 `build/nginx/js/page-liuyao.js`**
//   而不是 `src/app/liuyao/`。症状：⓪ 基线直接 `✗ 退出码 2（W.renderManualLines
//   is not a function）`，后面每条都错位 —— 而汇总仍可能报「4 个变异全部被抓」。
//
//   PROBE_OUT 的语义就是「从 src/app 建到临时目录」，那它必然是新实现。
//   所以：PROBE_OUT 一给，先按新实现选变异集，并立刻建一次产物。
const isReact = OUT ? true : deployedIsReact();
if (isReact && OUT) rebuild();
console.log(`路径：${isReact ? '新实现（src/app/liuyao，改源码 + 重建）' : '老实现（build/nginx/js/page-liuyao.js，直接改产物）'}`);
console.log(`产物根：${WEB}\n`);

const before = {};
for (const k of Object.keys(F)) {
  if (fs.existsSync(F[k])) before[k] = sha(F[k]);
}
const MUT = mutations(isReact);
let bad = 0;
// 「没抓住」之外还要有第三类：**这一轮不算数**（驱动被信号杀死 / 超时 / 卡死）。
// 把它记成 bad 会冤枉变异，记成 caught 就是假绿 —— 所以单列一个计数器，并且同样
// 让退出码非 0（一轮跑不完的套件不能报绿）。
let invalid = 0;

// ── ⓪ 未变异基线 ────────────────────────────────────────────────
// 只有「未变异绿 → 变异红」成对出现，才证明那些红是**变异**引起的，而不是这一轮环境
// 本来就不行（无头 Firefox 起不来、桩服务端口被占、产物还没重建……）。跳过的唯一理由
// 是省一轮：`--no-baseline`。
if (process.argv.indexOf('--no-baseline') < 0) {
  console.log('─'.repeat(72));
  console.log('⓪ 未变异基线（必须先绿，否则后面的红不算数）');
  if (isReact) rebuild();
  const base = run();
  if (base.killed) {
    console.log(`  ⚠ 基线驱动被信号杀死（${base.signal}）—— 这一轮基线**不算数**`);
    console.log(base.out.split('\n').slice(-12).join('\n'));
    process.exit(1);
  }
  if (base.code !== 0) {
    console.log(`  ✗ 基线退出码 ${base.code} —— 变异测试没有意义，先修基线`);
    console.log(base.out.split('\n').slice(-18).join('\n'));
    process.exit(1);
  }
  console.log('  ✓ 基线退出码 0（这一轮环境是好的）');
}

for (const mu of MUT) {
  console.log('─'.repeat(72));
  console.log(mu.name);

  // ① 自检落点唯一
  const targets = mu.files.map((k) => F[k]);
  const origs = {};
  let ok = true;
  for (const p of targets) {
    if (!fs.existsSync(p)) { console.log(`  ✗ 文件不存在：${p}`); ok = false; break; }
    origs[p] = fs.readFileSync(p, 'utf8');
    const n = origs[p].split(mu.find).length - 1;
    if (n !== 1) { console.log(`  ✗ 变异点出现 ${n} 次（要求恰好 1 次）：${p}\n     find=${JSON.stringify(mu.find)}`); ok = false; break; }
  }
  if (!ok) { bad++; continue; }

  // ② 施加变异
  for (const p of targets) fs.writeFileSync(p, origs[p].replace(mu.find, mu.repl));
  if (isReact) rebuild();

  // ③ 跑驱动。★ 先抓输出再还原 —— 还原放前面的话，万一驱动启动很慢会读到还原后的文件。
  let r;
  try { r = run(); } finally {
    for (const p of targets) fs.writeFileSync(p, origs[p]);
    if (isReact) rebuild();
  }

  // ④ 判：**正常退出**且退出码非 0，且期望的那条在输出里。
  //
  // ★ 被信号杀死（超时 / 外部 kill）**不算数** —— 既不算抓住、也不算没抓住。
  //   `r.status` 在这种情况下是 `null`，而 `null !== 0` 为真；再加被杀时半截输出里
  //   往往已经打印过 `is not defined`（页面报错在崩溃前就出了），`hit` 也真 ——
  //   两条一起就会把「驱动被杀了」判成「✓ 抓到」= 假绿。这条判据和变异本身一样重要。
  if (r.killed) {
    invalid++;
    console.log(`  ⚠ 驱动被信号杀死（${r.signal}${r.timedOut ? '，超时 ' + TIMEOUT + 'ms' : ''}）`
      + '—— 这一轮**不算数**，不记抓到也不记没抓住');
    console.log('    —— 驱动输出尾部：\n' + r.out.split('\n').slice(-12).join('\n'));
    continue;
  }
  const hit = mu.expect ? r.out.indexOf(mu.expect) >= 0 : null;
  const caught = r.code !== 0 && (mu.expect ? hit : true);
  console.log(`  ${caught ? '✓' : '✗'} 抓到=${caught}（退出码 ${r.code}）` +
    (mu.expect ? `  期望失败项「${mu.expect}」出现=${hit}` : ''));
  if (!caught) {
    bad++;
    console.log('    —— 驱动输出尾部：\n' + r.out.split('\n').slice(-18).join('\n'));
  }
}

// ── 最后统一核一次全部文件有没有还原干净 ────────────────────────
console.log('─'.repeat(72));
let drift = 0;
for (const k of Object.keys(before)) {
  if (sha(F[k]) !== before[k]) { console.log(`✗ 文件没还原干净：${F[k]}`); drift++; }
}
console.log(drift === 0
  ? `✓ ${Object.keys(before).length} 个源文件逐字节还原（sha256 一致）`
  : '✗ 有文件漂移');

console.log(bad === 0 && invalid === 0 && drift === 0
  ? `\n✅ ${MUT.length} 个变异全部被抓，文件全还原`
  : `\n❌ ${bad} 个变异没抓住 / ${invalid} 个变异**没跑成**（驱动被杀或超时，不算数）`
    + ` / ${drift} 个文件漂移`);
process.exit(bad === 0 && invalid === 0 && drift === 0 ? 0 : 1);

// ── 附：「被杀不算抓住」这条判据怎么单独验 ───────────────────────────
// 拿一个只会睡觉的假驱动冒充真驱动，并把超时压到 2.5s：
//
//   printf 'setTimeout(function(){}, 600000);\n' > /tmp/sleep-driver.js
//   MUTATE_DRIVER=/tmp/sleep-driver.js MUTATE_TIMEOUT=2500 \
//     PROBE_OUT=/tmp/liuyao-probe node duipan/mutate_liuyao_page.js --no-baseline
//
// 期望：每一条变异都打 `⚠ 驱动被信号杀死（SIGKILL，超时 2500ms）—— 这一轮**不算数**`，
// 汇总行是 `❌ 0 个变异没抓住 / 4 个变异**没跑成**`，退出码 1。
// 如果它打出 `✓ 抓到=true`，说明「被杀」又被算成了「抓住」—— 假绿回来了，别上线。
