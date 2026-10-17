#!/usr/bin/env node
/**
 * 变异测试 · duipan/drive_mhys_twice.js
 * ==========================================================================
 *
 * 把这次做好的每一处**逐个改回坏的**，看驱动抓不抓得住。抓不住的判据就是橡皮章
 * （写了等于没写，还给假信心）。
 *
 * 为什么单有一个文件：驱动里那几十条断言是**我自己写的**，它们当然会说自己对。
 * 唯一能证伪的办法就是拿已知的坏版本喂给它 —— 每条断言至少要有一次「它真的红了」。
 *
 * 覆盖的九处（对应 2026-09-25 那次形态改动 + 修好的三个老毛病）：
 *   M1 折叠改成「收起并掐流」   —— 这块最容易写错的一处（用户展开只剩半截 + 白扣额度）
 *   M2 折叠不隐藏正文           —— 「折叠」变成按了没反应
 *   M3 排完盘不叫 refreshAIPanel —— AI 块不出现了（页头按钮删掉之后 = 块彻底没了）
 *   M4 refreshAIPanel 不摆出块   —— 同上，引擎侧
 *   M5 换卦不展开               —— 新盘的「开始解卦」画在折起来的块里 = 看着像没反应
 *   M6 换卦不作废上一卦的解析    —— 第一卦的解读配第二卦的盘（内容错、形式对）
 *   M7 游客门挪到「已存解析」之前 —— 游客看不到自己刚跑出来的那份
 *   M8 「开始解卦」的游客门拆掉  —— 游客再点一次真的又跑（白送一次）
 *   M9 记录页变量挂回渲染之前    —— 记录页既看不到已存解读、也回写不了
 *
 * 每个变异跑完按 sha256 逐字节还原，最后一个变异之后统一再核一次全部文件。
 *
 * 用法：node duipan/mutate_mhys_twice.js     （九轮驱动，约 5–6 分钟）
 * 退出码：0 = 九个变异全被抓且文件全还原
 */

'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
// ⚠ 必须测**产物**（`build/nginx`），不是 `src/web`：页面一旦搬进 `src/app/`，
//   `src/web` 里就没有它了 —— 2026-10-17 `/my-charts/` 搬完当天，本驱动因为服务 `src/web`
//   在页面上什么都读不到（`#baziChart` 根本不存在），被误判成「八字页坏了」。
//   `build/nginx` 是**超集**：没搬的页面是 `src/web` 的逐字拷贝，搬了的在构建产物里。
//   要临时换根：DRIVE_ROOT=/somewhere node <本脚本>
const WEB = process.env.DRIVE_ROOT || path.join(ROOT, "build", "nginx");
// ⚠ 2026-10 前端拆家：`mhys/index.html` 与 `mhys/result.html` 里的内联脚本被外提成
//   `js/page-mhys.js` / `js/page-mhys-result.js`，M3/M9 的变异点跟着搬过去了。
//   别再往那两个 .html 上找 —— 它们现在只剩标签。
const F = {
  panel: path.join(WEB, 'js', 'ai_panel.js'),
  render: path.join(WEB, 'js', 'mhys_render.js'),
  // ⚠ 2026-10-17 `/mhys/` 搬进 `src/app/` 之后，这一条**不再是产物里的文件**：
  //   `page-mhys.js` 已经被删掉，逻辑现在在 `src/app/mhys/logic.js`，经 `vite build`
  //   打成 `build/nginx/assets/mhys-<hash>.js`。所以它改成**改源码 → 重建 → 跑驱动**。
  //   打包产物是压缩过的，按字符串找变异点在那儿本来就不可靠；重建一次实测 0.6s，
  //   九个变异多花约 11s，比「变异点找不到（源码变了？）」那种「这条没验到」划算得多 ——
  //   后者会让整份变异结果变成橡皮章嫌疑。
  pageMhys: process.env.DRIVE_ROOT
    ? path.join(WEB, 'js', 'page-mhys.js')
    : path.join(ROOT, 'src', 'app', 'mhys', 'logic.js'),
  // ⚠ 2026-10-17 `/mhys/result.html` 也搬进 `src/app/` 了（阶段 3 第 11 页），同 `pageMhys`
  //   的处理：产物里没有这个文件了，M9 的变异点改成**改源码 → 重建 → 跑驱动**。
  //   落点是 `src/app/mhys/result.logic.js`（老 `page-mhys-result.js` 的逐字搬家版，
  //   为了能对拍老脚本，函数体一字未改，所以 M9 那两段 from/to 字符串原样有效）。
  pageMhysResult: process.env.DRIVE_ROOT
    ? path.join(WEB, 'js', 'page-mhys-result.js')
    : path.join(ROOT, 'src', 'app', 'mhys', 'result.logic.js'),
};
// 改了源码的变异点要在跑驱动之前重建。`DRIVE_ROOT` 指到别处时按老办法直接改产物。
const NEEDS_REBUILD = !process.env.DRIVE_ROOT;
const VITE = path.join(ROOT, 'src', 'app', 'node_modules', '.bin', 'vite');
function rebuild() {
  const r = spawnSync(VITE, ['build', '--logLevel', 'error'], {
    cwd: path.join(ROOT, 'src', 'app'), encoding: 'utf8', timeout: 120000,
  });
  if (r.status !== 0) {
    throw new Error('vite build 失败：' + String(r.stdout || '') + String(r.stderr || ''));
  }
}
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

// 哪些变异点落在**源码**里（`src/app/**`）—— 改完必须重建，驱动读的是 `build/nginx`。
// ⚠ 原先这里写死 `mu.file === 'pageMhys'`。M9 的落点从产物 `js/page-mhys-result.js`
//   改成源码 `src/app/mhys/result.logic.js` 之后，那个写死的判断就只认得一个文件了：
//   M9 改完源码**没重建**，驱动跑的还是上一次的产物，于是「变异没被抓住」——
//   而真相是变异压根没生效（比「判据是橡皮章」更糟：它会让人去改一条本来有效的断言）。
//   所以判断改成按**路径**来，将来再有页面搬进 src/app 不用再改这里。
const isSource = (k) => F[k].startsWith(path.join(ROOT, 'src', 'app'));
const needsRebuild = (k) => NEEDS_REBUILD && isSource(k);
const before = {};
for (const k of Object.keys(F)) before[k] = sha(F[k]);

const MUT = [
  {
    name: 'M1 折叠改成「收起并掐流」（closeAIPanel）',
    file: 'panel', expect: '⑥ 折着的时候流',
    from: "  var p = document.getElementById('aiPanel');\n"
        + "  if (!p) return;\n"
        + "  setAIPanelFolded(!p.classList.contains('folded'));",
    to: "  var p = document.getElementById('aiPanel');\n"
      + "  if (!p) return;\n"
      + "  if (!p.classList.contains('folded')) { closeAIPanel(); return; }\n"
      + "  setAIPanelFolded(false);",
  },
  {
    name: 'M2 折叠不隐藏正文（class 切了个 false）',
    file: 'panel', expect: '③ 折叠之后正文确实收起来了',
    from: "  p.classList.toggle('folded', !!c);",
    to: "  p.classList.toggle('folded', false);",
  },
  {
    name: 'M3 排完盘不叫 refreshAIPanel（块不出现）',
    file: 'pageMhys', expect: '① 排完盘 AI 块',
    from: "  if (typeof refreshAIPanel === 'function') refreshAIPanel();\n",
    to: '',
  },
  {
    name: 'M4 refreshAIPanel 不把块摆出来（只重画、不 open）',
    file: 'panel', expect: '① 排完盘 AI 块',
    from: "  setAIPanelFolded(false);\n  showAIHome();\n  openAIPanel();\n}",
    to: "  setAIPanelFolded(false);\n  showAIHome();\n}",
  },
  {
    name: 'M5 换卦后不自动展开（新盘那句「开始解卦」画在折着的块里）',
    file: 'panel', expect: '④ 换卦后自动展开',
    from: "  setAIPanelFolded(false);\n  showAIHome();",
    to: "  showAIHome();",
  },
  {
    name: 'M6 换卦时不再作废上一卦的解析（savedAnalysis 不清）',
    file: 'render', expect: '④ 换卦后块里',
    from: '  savedAnalysis = null;\n  currentRecordId = null;\n',
    to: '',
  },
  {
    name: 'M7 游客门挪回「已存解析」之前（游客再也看不到自己那份）',
    file: 'panel', expect: '⑦ 显示的是记录里存着的那份解读',
    from: "  if (aiSaved()) {\n    showSavedAnalysis();\n    return;\n  }\n\n  // 未登录用户",
    to: "  if (false && aiSaved()) {\n    showSavedAnalysis();\n    return;\n  }\n\n  // 未登录用户",
  },
  {
    name: 'M8 「开始解卦」那道游客门拆掉（点下去真的又跑一次）',
    file: 'panel', expect: '⑤ 游客按下',
    from: "  if (!aiCanStart()) return;\n  var anonUsedKey = AIC().anonUsedKey || '';\n"
        + "  if (!AUTH.isLoggedIn() && anonUsedKey && localStorage.getItem(anonUsedKey)) {",
    to: "  if (!aiCanStart()) return;\n  var anonUsedKey = AIC().anonUsedKey || '';\n  if (false) {",
  },
  {
    name: 'M9 记录页把 currentRecordId/savedAnalysis 挪回渲染之前',
    file: 'pageMhysResult', expect: '⑦ 显示的是记录里存着的那份解读',
    from: '      area.innerHTML = renderResult(result);\n      renderAnalysis();\n',
    to: "      currentRecordId = id;\n      savedAnalysis = data.ai_analysis || '';\n"
      + '      area.innerHTML = renderResult(result);\n      renderAnalysis();\n',
    // 再把「渲染之后」那两行删掉（否则等于没挪）
    andAlso: {
      from: "      currentRecordId = id;\n      savedAnalysis = data.ai_analysis || '';\n",
    },
  },
];

function run() {
  // ★ 不用 `execSync('node … 2>&1')`：那会经过 `/bin/sh -c`，超时时**只杀得掉这层
  //   shell**，真正的 `node` 变成孤儿继续活着 —— 而它身上还挂着 `:8901` 的桩服务。
  //   后果是后面每一个变异都报 EADDRINUSE，汇总成「N 个变异没抓住」，看着像断言被
  //   橡皮章，其实是驱动压根没起来。`spawnSync` 直接起 node、超时直接 SIGKILL 它本人，
  //   端口随进程一起没。
  const r = spawnSync('node', ['duipan/drive_mhys_twice.js'], {
    cwd: ROOT, encoding: 'utf8', timeout: 300000, killSignal: 'SIGKILL',
  });
  const out = String(r.stdout || '') + String(r.stderr || '');
  return { code: r.status == null ? -1 : r.status, out };
}

let bad = 0;
for (const mu of MUT) {
  const p = F[mu.file];
  const orig = fs.readFileSync(p, 'utf8');
  if (orig.indexOf(mu.from) < 0) {
    console.log(`✗ ${mu.name}\n    变异点找不到（源码变了？）—— 这条**没验到**，判据仍是橡皮章嫌疑`);
    bad++;
    continue;
  }
  let src = orig.replace(mu.from, mu.to);
  if (mu.andAlso) {
    // 再删掉「渲染之后」那份重复副本（否则等于没挪）。从插入处之后开始找，
    // 免得把刚插进去的那份又删了。
    const i = src.indexOf(mu.andAlso.from, src.indexOf(mu.to) + mu.to.length);
    if (i < 0) { console.log(`✗ ${mu.name}\n    第二个变异点找不到`); bad++; continue; }
    src = src.slice(0, i) + src.slice(i + mu.andAlso.from.length);
  }
  fs.writeFileSync(p, src);
  // 改的是 `src/app/` 那侧就先重建 —— 驱动读的是 `build/nginx`，不重建等于没改。
  if (needsRebuild(mu.file)) rebuild();
  const r = run();
  fs.writeFileSync(p, orig);
  if (needsRebuild(mu.file)) rebuild();
  const caught = r.code !== 0 && r.out.indexOf(mu.expect) >= 0;
  console.log(`${caught ? '✓' : '✗'} ${mu.name}\n    抓到=${caught}（退出码 ${r.code}）期望失败项「${mu.expect}」`);
  if (!caught) { bad++; console.log('    —— 驱动输出尾部：\n' + r.out.split('\n').slice(-16).join('\n')); }
}

console.log('');
let drift = 0;
for (const k of Object.keys(F)) if (sha(F[k]) !== before[k]) { console.log(`✗ 文件没还原干净：${F[k]}`); drift++; }
console.log(drift === 0 ? '✓ 四个源文件逐字节还原（sha256 一致）' : '✗ 有文件漂移');
console.log(bad === 0 && drift === 0
  ? `✅ ${MUT.length} 个变异全部被抓，文件全还原`
  : `❌ ${bad} 个变异没抓住 / ${drift} 个文件漂移`);
process.exit(bad === 0 && drift === 0 ? 0 : 1);
