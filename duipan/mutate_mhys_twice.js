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
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const WEB = path.join(ROOT, 'build', 'nginx');
const F = {
  panel: path.join(WEB, 'js', 'ai_panel.js'),
  render: path.join(WEB, 'js', 'mhys_render.js'),
  index: path.join(WEB, 'mhys', 'index.html'),
  result: path.join(WEB, 'mhys', 'result.html'),
};
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
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
    file: 'index', expect: '① 排完盘 AI 块',
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
    file: 'result', expect: '⑦ 显示的是记录里存着的那份解读',
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
  try {
    const out = execSync('node duipan/drive_mhys_twice.js 2>&1', {
      cwd: ROOT, encoding: 'utf8', timeout: 300000,
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status == null ? -1 : e.status, out: String(e.stdout || '') + String(e.stderr || '') };
  }
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
  const r = run();
  fs.writeFileSync(p, orig);
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
