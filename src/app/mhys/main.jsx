import { refreshAIPanel, aiInlineHost } from '../shared/aiPanel.js';
import { AUTH } from '../shared/auth.js';
import { AI_PANEL_CONF } from '../shared/mhysAiPanel.js';
import { TRIGRAMS, currentGua, currentTopic, currentRecordId, currentResultMeta, currentAiPayload, renderAnalysis, renderResult } from '../shared/mhysRender.js';
// 梅花易数起卦页 —— 阶段 3 第 4 页（`/mhys/`）。
// 逐字搬运自 `src/web/js/page-mhys.js`（判据快照 `duipan/legacy_ref/page-mhys.js`，
// payload sha256 aad85d443209eaaa4e2080397480b5f163a76fc3049047b3adb762ca32b37f81）。
// ==========================================================================
//
// ─────────────────────────────────────────────────────────────
// 架构：外壳是 React，结果区 / 参数区是**命令式**的（与 my-charts / ai-chat 同一形态）
// ─────────────────────────────────────────────────────────────
// 纯函数与时间选择器逻辑全在 `./logic.js`（那边是差分脚本的对拍对象，所以它
// **不许 import 任何东西**）。本文件只做三件事：
//   ① 用 React 渲染老页面的静态骨架（`.mh-wrapper` 那一整棵）；
//   ② 按老页面的**装载顺序**跑一次 `init()`；
//   ③ 把内联 `onclick` 需要的那几个名字挂到 `window` 上（ESM 里它们不是全局）。
//
// ★ 骨架为什么用 `dangerouslySetInnerHTML` 而**不是** JSX 元素
// ─────────────────────────────────────────────────────────────
// 老骨架里有两处**行内事件属性**（`onclick="openTimePicker()"` 这类，共 11 处），
// 它们是 HTML 契约的一部分：用户明确要求「逐字保留这些 id / class / 内联 onclick
// 的名字」。走 JSX 写 `onClick={…}` 会把它变成 React 合成事件、DOM 上的
// `onclick` 属性消失（契约就没了）；而写 `<div onclick="…">` 这种非标准小写属性，
// React 19 对它的处理属于「未文档化行为」—— 一次依赖升级就可能被静默丢掉，
// 且丢的正是这一类「点了没反应」的隐性故障。
// `dangerouslySetInnerHTML` 是唯一能把这段 HTML **原样**交给浏览器、
// 由浏览器自己解析行内属性的路子（`innerHTML` 里的 `<script>` 不执行，
// 但这里一个 script 都没有；`onclick` 属性照常生效，`id`/`class` 顺序逐字保留）。
// 风险面由此收窄成一句话：**这段字符串的 HTML 与老 index.html 的第 19-130 行一致**。
//
// 顺带解决一个 DOM 顺序问题：`ai_panel.js` 的 `mountAIPanel()`（它自己那一文件里）
// 在 `document.readyState === 'loading'` 时挂 `DOMContentLoaded` 等，否则**立刻**
// 执行 `mount()`；两条路都要求 `#resultArea` 已经存在，否则 `aiInlineHost()`
// 找不到宿主就静默放弃（不报错）。React 18+ 的 `root.render()` 默认是并发渲染、
// 不保证在本行之前提交 —— 所以这里用 `flushSync` 把首次提交做成同步的。
// 老页没这问题：它是 classic script，写标记时节点早就解析完了。这条是**正确性**
// 需要，不是性能。

import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

import {
  state,
  init, bindPageLifecycle, bindDocumentClick,
  openTimePicker, closeTimePicker, toggleDropdown, selectMethod, startDivination,
  switchCalendar, confirmTimePicker, updateTimeDisplay,
} from './logic.js'
import './style.css'

// ============================================================
// 静态骨架（逐字对齐 `src/web/mhys/index.html` 第 19-130 行）
// ============================================================
// 逐项核对过的东西，改之前先回老页对照：
//   · `.mh-wrapper > .mh-header > a.mh-back[href="/"] + h1.mh-title`
//   · `input#topicInput.input-field`（placeholder「选填」、maxlength 100）
//   · `div#timeDisplayRow.tp-time-row[onclick=openTimePicker()]`
//       > `span#timeDisplay.tp-time-text`（初值 `--`）+ `span.tp-time-edit`「修改 ▸」
//   · `div#methodSelector > div#methodDisplay[onclick=toggleDropdown()]`
//       （`span#methodLabel`「报数起卦（三个数）」+ `span#methodArrow.arrow`「▾」）
//     + `div#methodDropdown` 六个 `.method-option`，顺序 time/manual/number/split/
//       character/auto，**只有 `number` 带 `selected`**，各自 `onclick="selectMethod('…',this)"`
//   · `div#methodParams`（由 logic.js 的 `renderMethodParams()` 写 innerHTML）
//   · `button.btn-primary#startBtn[onclick="startDivination(event)"]`「开始排盘」
//   · `a.record-entry[href="/mhys/history.html"] > .re-left > span.re-text` + `span.re-arrow`
//   · `div#resultArea`（由 mhys_render.js 写 innerHTML）
//   · ★ `div.analysis-card#analysisArea[hidden]` —— **必须紧跟 #resultArea 的
//     下一个兄弟位置**，且必须排在时间选择器弹窗**之前**。理由（老页第 96-104 行
//     的原注释）：AI 面板的宿主 `#aiInlineHost` 由引擎插在「结果容器 nextSibling」
//     上，所以顺序必须是
//         排盘信息 → 起卦结果 → ☯ AI 解读 → 解卦区
//     用户 2026-09-25 要的就是「梅花的自动解析移到卦象解析前面」。把解析区挪进
//     `#resultArea` 里面，宿主就只能排到整个结果之后，AI 块会被压到最底下。
//   · 时间选择器弹窗整棵（`#tpOverlay` → `.tp-panel` → `.tp-top` / `#tpToggle` /
//     `#tpPicker` 五列 / `.tp-actions`），内联 onclick：
//     `closeTimePicker(event)` / `event.stopPropagation()` / `switchCalendar('…')` /
//     `closeTimePicker()` / `confirmTimePicker()`。
//   · **顺序是判据**：`#analysisArea` 在 `#tpOverlay` 之前；`#tpOverlay` 在
//     `.mh-wrapper` 里面（老页也这样 —— 虽然 `.tp-overlay` 是 position:fixed，
//     放哪儿视觉都一样，但结构照抄）。
const SHELL_HTML = `
  <div class="mh-wrapper">
    <div class="mh-header">
      <a href="/" class="mh-back">← 返回</a>
      <h1 class="mh-title">梅花易数</h1>
      <!-- 2026-09-25 删掉页头那颗「☯ 看不懂？试试自动解析」：用户拍板
           「我不想要这个按钮，折叠功能你完全可以添加在那个 ai 解析的板块里面」。
           现在排完盘 AI 块自己出现在卦象下面（\`showResultHere\` → \`refreshAIPanel\`），
           收起/展开那颗控件长在块的标题栏里（\`js/ai_panel.js\` 的 \`aiFoldBtn\`）。 -->
    </div>

    <!-- 1. 事项内容 -->
    <div class="card">
      <div class="card-title">📝 事项内容</div>
      <input type="text" id="topicInput" class="input-field" placeholder="选填" maxlength="100">
    </div>

    <!-- 2. 起卦时间 -->
    <div class="card">
      <div class="card-title">🕐 起卦时间</div>
      <div class="tp-time-row" id="timeDisplayRow" onclick="openTimePicker()">
        <span class="tp-time-text" id="timeDisplay">--</span>
        <span class="tp-time-edit">修改 ▸</span>
      </div>
    </div>

    <!-- 3. 起卦方式 -->
    <div class="card">
      <div class="card-title">☯ 起卦方式</div>
      <div class="method-selector" id="methodSelector">
        <div class="method-display" id="methodDisplay" onclick="toggleDropdown()">
          <span id="methodLabel">报数起卦（三个数）</span>
          <span class="arrow" id="methodArrow">▾</span>
        </div>
        <!-- \`data-method\` 一律用**后端起卦法的原名**（time/number/split/character/
             manual）：页面只把用户选的名字转交给后端，自己不认这些名字。旧记录里
             的 \`num1\`（拆半）\`num2\`（三数）不在下拉里，但两个展示表都留着别名，
             老记录仍显示中文。 -->
        <div class="method-dropdown" id="methodDropdown">
          <div class="method-option" data-method="time" onclick="selectMethod('time',this)">
            <span class="check">✓</span>时间起卦
          </div>
          <div class="method-option" data-method="manual" onclick="selectMethod('manual',this)">
            <span class="check">✓</span>手动指定
          </div>
          <div class="method-option selected" data-method="number" onclick="selectMethod('number',this)">
            <span class="check">✓</span>报数起卦（三个数）
          </div>
          <div class="method-option" data-method="split" onclick="selectMethod('split',this)">
            <span class="check">✓</span>报数起卦（拆半求和）
          </div>
          <div class="method-option" data-method="character" onclick="selectMethod('character',this)">
            <span class="check">✓</span>字占（按原文分层）
          </div>
          <div class="method-option" data-method="auto" onclick="selectMethod('auto',this)">
            <span class="check">✓</span>自动起卦
          </div>
        </div>
      </div>

      <!-- 方法参数面板 -->
      <div id="methodParams"></div>
    </div>

    <!-- 4. 开始排盘按钮 -->
    <button type="button" class="btn-primary" id="startBtn" onclick="startDivination(event)">开始排盘</button>

    <!-- 5. 排盘记录 -->
    <a href="/mhys/history.html" class="record-entry">
      <div class="re-left">
        <span class="re-text">排盘记录</span>
      </div>
      <span class="re-arrow">›</span>
    </a>

    <!-- 6. 结果区：排完盘就地在下面出结果，不再跳结果页。空的时候是空的，不占位。 -->
    <div id="resultArea"></div>

    <!-- 6b. 解卦区（本卦/互卦/变卦…的解析）。**必须摆在结果区的下一个兄弟位置**：
         AI 面板的宿主 \`#aiInlineHost\` 由引擎插在「结果容器 nextSibling」上
         （\`ai_panel.js::aiInlineHost()\`），所以顺序是
           排盘信息 → 起卦结果 → ☯ AI 解读 → 解卦区
         —— 用户 2026-09-25 要的就是「梅花的自动解析移到卦象解析前面」。
         ⚠ 这两块的先后由**这里的 DOM 顺序**决定，别把解析区挪回 #resultArea 里面
         （那样宿主只能排到整个结果之后，AI 块又被压到最底下）。
         起卦前它是 hidden 的空框，\`renderAnalysis()\` 落内容时自己取消 hidden。 -->
    <div class="analysis-card" id="analysisArea" hidden></div>

    <!-- 时间选择器弹窗 -->
    <div class="tp-overlay" id="tpOverlay" style="display:none" onclick="closeTimePicker(event)">
      <div class="tp-panel" onclick="event.stopPropagation()">
        <div class="tp-top">
          <span class="tp-top-title">选择起卦时间</span>
          <span class="tp-top-display" id="tpDisplay"></span>
        </div>
        <div class="tp-toggle" id="tpToggle">
          <button class="tp-toggle-btn active" data-cal="gregorian" onclick="switchCalendar('gregorian')">公历</button>
          <button class="tp-toggle-btn" data-cal="lunar" onclick="switchCalendar('lunar')">农历</button>
        </div>
        <div class="tp-picker" id="tpPicker">
          <div class="tp-col" id="tpColYear"></div>
          <div class="tp-col" id="tpColMonth"></div>
          <div class="tp-col" id="tpColDay"></div>
          <div class="tp-col" id="tpColHour"></div>
          <div class="tp-col" id="tpColMinute"></div>
        </div>
        <div class="tp-actions">
          <button class="tp-btn-cancel" onclick="closeTimePicker()">取消</button>
          <button class="tp-btn-confirm" onclick="confirmTimePicker()">确定</button>
        </div>
      </div>
    </div>
  </div>
`

/** 骨架里那些内联 onclick / 引擎要认的 id 都在这一棵树里，React 不碰它的 children。 */
function MhysPage() {
  return <div dangerouslySetInnerHTML={{ __html: SHELL_HTML }} />
}

// ============================================================
// 挂到 window 上的名字
// ============================================================
/**
 * 老页是 classic script，顶层 `function` 声明天然是 `window` 的全局属性，
 * 所以 HTML 里那些内联 `onclick="openTimePicker()"` / `selectMethod('…',this)`
 * 全靠它们。ESM 里这些名字**不会**成为全局 —— 不挂就是「点哪儿都没反应」，
 * 而且不报错（浏览器只会说 "openTimePicker is not defined" 在控制台）。
 *
 * 与 my-charts/main.jsx 末尾同一做法（那边挂 toggleMenu / closeMenu / doDelete）。
 * 阶段 4 收口时把内联 onclick 换成 React 事件，这些挂载一起消掉。
 */
function installGlobals() {
  var expose = function (name, value) {
    try { window[name] = value; }
    catch (e) { /* 只读属性之类的极端情况，别让整页停在这儿 */ }
  };

  // —— 骨架内联 onclick 需要的（用户点名的七个全在这） ——
  expose('openTimePicker', openTimePicker);
  expose('closeTimePicker', closeTimePicker);
  expose('toggleDropdown', toggleDropdown);
  expose('selectMethod', selectMethod);
  expose('startDivination', startDivination);
  expose('switchCalendar', switchCalendar);
  expose('confirmTimePicker', confirmTimePicker);

  // —— 下面这个**不是页面 API，是测试桥**，页面自己一个字节都不读 ——
  //
  // `duipan/drive_mhys_page.js` 的 `setTime()` 原语要直接设一个已知生辰（它是十几个
  // 用例的**准备步骤**，不是断言），并读回 `#timeDisplay` 的文案。老页里 `selectedTime`
  // 与 `updateTimeDisplay` 是顶层 `var`/`function`，天然是全局，驱动顺手就用了；
  // ESM 没有这个「顺手」。
  //
  // ★ 为什么收在一个名字下，而不是把两个裸名重新挂回 `window`：
  //   挂裸名会让 `window.selectedTime` / `window.currentCalendar` 看起来像页面 API，
  //   下一个读代码的人会以为页面依赖它们（`currentMethod` / `currentCalendar` 连驱动
  //   都没用上，是子代理顺手多挂的，已删）。收进 `__mhysTestApi` 只有一个用途、
  //   一眼能看出是测试用的。
  // `selectMethod` 不在此列 —— 它是**骨架内联 onclick 真的要的**，见上面七条。
  //
  // ⚠ `setTime` 整体重设 `state.selectedTime` 再刷一次显示，与老页
  //   `selectedTime = {…}`（快照 :574）+ `updateTimeDisplay()` 等价。
  //
  // 移除时机：阶段 4 收口时把驱动的 `setTime()` 改成真点时间选择器
  //   （开 `#tpPicker`、滚列、点确定），这个对象连同这一段一起删。
  window.__mhysTestApi = {
    setTime: function (y, mo, d, h, mi) {
      state.selectedTime.year = y;
      state.selectedTime.month = mo;
      state.selectedTime.day = d;
      state.selectedTime.hour = h;
      state.selectedTime.minute = mi;
      state.selectedTime.calendar = 'gregorian';
      updateTimeDisplay();
      return document.getElementById('timeDisplay').textContent;
    },
  };
}

// ============================================================
// 装载（顺序就是老页面 `<script>` 的顺序）
// ============================================================
// 老页面里 `page-mhys.js` 是**最后一个** classic script（老 index.html :141，
// 排在 lunar / auth / ui_common / hexagrams_data / mhys_render / ai_panel /
// mhys_ai_panel 之后）。新页面的顺序要求是：
//   ① 七个传统 script 先执行（它们定义 window.AI_PANEL_CONF、TRIGRAMS、
//      renderResult / renderAnalysis / refreshAIPanel 这些 logic.js 与页面依赖的全局）；
//   ② `main.jsx` 这个 module（defer）在它们之后执行；
//   ③ 在这里同步把骨架提交进 DOM，再跑 `init()`。
// 因为 `type="module"` 是 defer 的，①一定先于②；②里用 flushSync 保证③之前
// 骨架已经在 DOM 里 —— 这样 `ai_panel.js` 的 DOMContentLoaded 分支拿到的是
// 完整的 `#resultArea`（它若在 module 之前就 mount，会找不到宿主而静默放弃）。
//
// 注意 `bindPageLifecycle()` 里那两个监听（pagehide / pageshow）与
// `bindDocumentClick()` 对应老页的模块级副作用，必须在 init() 之前登记。
installGlobals();
bindPageLifecycle();

const root = createRoot(document.getElementById('root'));
flushSync(function () {
  root.render(<MhysPage />);
});

// 骨架已在 DOM，这时注册 document 级「点空白关下拉」才安全
// （logic.js 的 bindDocumentClick 注释里写了为什么要从这个位置注册）。
bindDocumentClick();

// 老页快照最后一行是裸调 `init();`。时序等价：都在页面可交互之前、DOM 已在。
init();
