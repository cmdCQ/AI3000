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
 *
 * 每个变异跑完按 sha256 逐字节还原，最后一个变异之后统一再核一次全部文件。
 *
 * 用法：node duipan/mutate_liuyao_page.js     （四轮驱动，约 6–8 分钟）
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
const WEB = process.env.DRIVE_ROOT || path.join(ROOT, 'build', 'nginx');

const F = {
  // 老实现：一个文件里全都有（三个函数 + 折卦）
  legacy: path.join(WEB, 'js', 'page-liuyao.js'),
  // 新实现：函数在 logic.js，挂 window 的那几行在 main.jsx
  logic: path.join(ROOT, 'src', 'app', 'liuyao', 'logic.js'),
  main: path.join(ROOT, 'src', 'app', 'liuyao', 'main.jsx'),
};

const VITE = path.join(ROOT, 'src', 'app', 'node_modules', '.bin', 'vite');
function rebuild() {
  const r = spawnSync(VITE, ['build', '--logLevel', 'error'], {
    cwd: path.join(ROOT, 'src', 'app'), encoding: 'utf8', timeout: 120000,
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
        name: 'M4 castToTrigrams 折卦算错 -> ⑥ 的折卦判据必须红',
        files: ['logic'],
        find: 'export function castToTrigrams',
        repl: 'export function castToTrigrams_mutated',
        expect: '',
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
  const r = spawnSync('node', ['duipan/drive_liuyao_page.js'], {
    cwd: ROOT, encoding: 'utf8', timeout: 900000, maxBuffer: 64 * 1024 * 1024,
  });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

// ── 主流程 ──────────────────────────────────────────────────────
const isReact = deployedIsReact();
console.log(`路径：${isReact ? '新实现（src/app/liuyao，改源码 + 重建）' : '老实现（build/nginx/js/page-liuyao.js，直接改产物）'}`);
console.log(`产物根：${WEB}\n`);

const before = {};
for (const k of Object.keys(F)) {
  if (fs.existsSync(F[k])) before[k] = sha(F[k]);
}
const MUT = mutations(isReact);
let bad = 0;

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

  // ④ 判：退出码非 0，且期望的那条在输出里
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

console.log(bad === 0 && drift === 0
  ? `\n✅ ${MUT.length} 个变异全部被抓，文件全还原`
  : `\n❌ ${bad} 个变异没抓住，${drift} 个文件漂移`);
process.exit(bad === 0 && drift === 0 ? 0 : 1);
