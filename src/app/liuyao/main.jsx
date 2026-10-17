import '../shared/authModalStyles.js';
import { refreshAIPanel, aiInlineHost } from '../shared/aiPanel.js';
import { AUTH } from '../shared/auth.js';
import { AI_PANEL_CONF } from '../shared/liuyaoAiPanel.js';
// ★ 把解卦面板的配置挂回 `window`：引擎只认这个全局 —— `src/app/shared/aiPanel.js` 的
//   `AIC()` 读的是 `window.AI_PANEL_CONF || {}`。老 `js/liuyao_ai_panel.js` / `js/mhys_ai_panel.js`
//   是 classic script，文件顶层的 `window.AI_PANEL_CONF = {…}` 一加载就生效；搬成 ESM 后
//   只剩 `export const AI_PANEL_CONF`，如果没人挂回去，引擎就全程用默认配置
//   （`cardType` 空、`payload()` 空，请求体 `{message:'', cardType:'', cardData:null}`），
//   六爻/梅花 ⑧ 的 cardData 判据会红，用户那边是「解读里没有这一卦的内容」。
//   放在这一层而不是 conf 模块内部的原因：谁是「用到面板的页面」由页面自己声明，
//   不搞「import 就有副作用」的隐式约定（那等于两套机制）。
window.AI_PANEL_CONF = AI_PANEL_CONF;

import { currentChart, currentTopic, currentGender, currentRecordId, renderLiuyaoResult } from '../shared/liuyaoRender.js';
// 六爻排盘页（`/liuyao/`，主页面）—— 阶段 3 第 5 页。
// 逐字搬运自 `src/web/js/page-liuyao.js`（判据快照 `duipan/legacy_ref/page-liuyao.js`，
// payload sha256 0796c79ced74f04f4d11705db5925af4f83ca27bc8b2249fec584b3ee6ffdf82）。
// ==========================================================================
//
// ─────────────────────────────────────────────────────────────
// 架构：外壳是 React，结果区 / 参数区 / 时间选择器是**命令式**的
//       （与 mhys / my-charts / ai-chat 同一形态）
// ─────────────────────────────────────────────────────────────
// 纯函数与命令式逻辑全在 `./logic.js`（那边是差分脚本的对拍对象，所以它
// **不许 import 任何东西**）。本文件只做三件事：
//   ① 用 React 渲染老页面的静态骨架（`.mh-wrapper` 那一整棵）；
//   ② 按老页面的**装载顺序**把 logic.js 里的 `init()` 跑一次；
//   ③ 把内联 `onclick` 需要的那些名字挂到 `window` 上（ESM 里它们不是全局）。
//
// ★ 骨架为什么用 `dangerouslySetInnerHTML` 而**不是** JSX 元素
// ─────────────────────────────────────────────────────────────
// 老骨架里有 **14 处行内事件属性**（`onclick="openTimePicker()"` 这类；去掉
// `event.stopPropagation()` 那处，一共点到 **8 个不同的全局名**），它们是 HTML
// 契约的一部分：用户明确要求「逐字保留这些 id / class / 内联 onclick 的名字」。
// 走 JSX 写 `onClick={…}` 会把它变成 React 合成事件、DOM 上的 `onclick` 属性
// 消失（契约就没了）；而写 `<div onclick="…">` 这种非标准小写属性，React 19 对
// 它的处理属于「未文档化行为」—— 一次依赖升级就可能被静默丢掉，且丢的正是这一类
// 「点了没反应」的隐性故障。
// `dangerouslySetInnerHTML` 是唯一能把这段 HTML **原样**交给浏览器、由浏览器自己
// 解析行内属性的路子（`innerHTML` 里的 `<script>` 不执行，但这里一个 script 都没有；
// `onclick` 属性照常生效，`id`/`class` 顺序逐字保留）。
// 风险面由此收窄成一句话：**这段字符串的 HTML 与老 index.html 第 22-120 行逐字一致**。
//
// 顺带解决一个 DOM 顺序问题：`ai_panel.js` 的 `mountAIPanel()` 在
// `document.readyState === 'loading'` 时挂 `DOMContentLoaded` 等，否则**立刻**
// 执行 `mount()`；两条路都要求 `#resultArea` 已经存在，因为 AI 宿主
// `#aiInlineHost` 是插在「结果容器 nextSibling」上的，找不到宿主就静默放弃（不报错）。
// React 18+ 的 `root.render()` 默认是并发渲染、不保证在本行之前提交 —— 所以这里用
// `flushSync` 把首次提交做成同步的。老页没这问题：它是 classic script，写标记时节点
// 早就解析完了。这条是**正确性**需要，不是性能。
//
// ⚠ 本页的骨架还多一条顺序约束：`#resultArea` 必须紧跟 `a.record-entry` **之前**，
//   也就是 AI 块会出现在「盘面」与「排盘记录」入口之间。这是老页的 DOM 顺序，
//   本文件逐字照抄，没有改动。

import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

import {
  state,
  init, bindPageLifecycle, bindDocumentClick,
  openTimePicker, closeTimePicker, confirmTimePicker, toggleDropdown,
  selectMethod, startDivination, switchCalendar, selectGender,
  updateTimeDisplay, renderManualLines, renderAccumulatedLines,
  coinClick, coinReset, cycleManualLine,
} from './logic.js'
// 「测试桥 has()」要按名字查 logic.js 的导出，所以另外拿一份命名空间。
// 与上面的具名 import 是同一个模块实例，不会重复求值。
import * as logic from './logic.js'
import './style.css'

// ============================================================
// 静态骨架（逐字对齐 `src/web/liuyao/index.html` 第 22-120 行）
// ============================================================
// 逐项核对过的东西，改之前先回老页对照：
//   · `.mh-wrapper > .mh-header > a.mh-back[href="/"] + h1.mh-title`「六爻」
//   · `input#topicInput.input-field`（placeholder「选填」、maxlength 100）
//   · `div.gender-row#genderRow` 两个 `button.gender-btn[data-gender=male|female]`，
//     **male 带 `active`**，各自 `onclick="selectGender('…')"`，内含 `span.gender-icon` ♂/♀
//   · `div#timeDisplayRow.tp-time-row[onclick=openTimePicker()]`
//       > `span#timeDisplay.tp-time-text`（初值 `--`）+ `span.tp-time-edit`「修改 ▸」
//   · `div#methodSelector > div#methodDisplay[onclick=toggleDropdown()]`
//       （`span#methodLabel`「铜钱摇卦」+ `span#methodArrow.arrow`「▾」）
//     + `div#methodDropdown` 三个 `.method-option`，顺序 coin/manual/auto，
//       **只有 `coin` 带 `selected`**，各自 `onclick="selectMethod('…',this)"`
//   · `div#methodParams`（由 logic.js 的 `renderMethodParams()` 写 innerHTML）
//   · `button.btn-primary#startBtn[onclick="startDivination(event)"]`「开始排盘」
//   · `div#resultArea`（由 liuyao_render.js 写 innerHTML；AI 宿主插在它 nextSibling）
//   · `a.record-entry[href="/liuyao/history.html"] > .re-left > span.re-text` + `span.re-arrow`
//   · 时间选择器弹窗整棵（`#tpOverlay` → `.tp-panel` → `.tp-top` / `#tpToggle` /
//     `#tpPicker` 五列 / `.tp-actions`），行内 onclick：
//     `closeTimePicker(event)` / `event.stopPropagation()` / `switchCalendar('…')` /
//     `closeTimePicker()` / `confirmTimePicker()`
//   · **顺序是判据**：`#resultArea` 在 `a.record-entry` 之前、两者都在 `.mh-wrapper`
//     里面（老页也这样；`.tp-overlay` 是 position:fixed，放哪儿视觉都一样，结构照抄）。
const SHELL_HTML = `
<div class="mh-wrapper">
  <div class="mh-header">
    <a href="/" class="mh-back">← 返回</a>
    <h1 class="mh-title">六爻</h1>
  </div>

  <!-- 1. 事项内容 -->
  <div class="card">
    <div class="card-title">📝 事项内容</div>
    <input type="text" id="topicInput" class="input-field" placeholder="选填" maxlength="100">
  </div>

  <!-- 2. 性别（六爻用神取法依赖性别） -->
  <div class="card">
    <div class="card-title">🧑 性别</div>
    <div class="gender-row" id="genderRow">
      <button type="button" class="gender-btn active" data-gender="male" onclick="selectGender('male')">
        <span class="gender-icon">♂</span> 男
      </button>
      <button type="button" class="gender-btn" data-gender="female" onclick="selectGender('female')">
        <span class="gender-icon">♀</span> 女
      </button>
    </div>
  </div>

  <!-- 3. 起卦时间 -->
  <div class="card">
    <div class="card-title">🕐 起卦时间</div>
    <div class="tp-time-row" id="timeDisplayRow" onclick="openTimePicker()">
      <span class="tp-time-text" id="timeDisplay">--</span>
      <span class="tp-time-edit">修改 ▸</span>
    </div>
  </div>

  <!-- 4. 起卦方式 -->
  <div class="card">
    <div class="card-title">☯ 起卦方式</div>
    <div class="method-selector" id="methodSelector">
      <div class="method-display" id="methodDisplay" onclick="toggleDropdown()">
        <span id="methodLabel">铜钱摇卦</span>
        <span class="arrow" id="methodArrow">▾</span>
      </div>
      <div class="method-dropdown" id="methodDropdown">
        <div class="method-option selected" data-method="coin" onclick="selectMethod('coin',this)">
          <span class="check">✓</span>铜钱摇卦
        </div>
        <div class="method-option" data-method="manual" onclick="selectMethod('manual',this)">
          <span class="check">✓</span>手动指定
        </div>
        <div class="method-option" data-method="auto" onclick="selectMethod('auto',this)">
          <span class="check">✓</span>自动起卦
        </div>
      </div>
    </div>

    <!-- 方法参数面板 -->
    <div id="methodParams"></div>
  </div>

  <!-- 5. 开始排盘按钮 -->
  <button type="button" class="btn-primary" id="startBtn" onclick="startDivination(event)">开始排盘</button>

  <!-- 盘面就渲染在本页下面（不再跳 result.html）—— 上面的表单保持原样，用户要改
       起卦方式/时间直接在原处改，不用从结果页退回来 -->
  <div id="resultArea"></div>

  <!-- 6. 排盘记录 -->
  <a href="/liuyao/history.html" class="record-entry">
    <div class="re-left">
      <span class="re-text">排盘记录</span>
    </div>
    <span class="re-arrow">›</span>
  </a>

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
function LiuyaoPage() {
  return <div dangerouslySetInnerHTML={{ __html: SHELL_HTML }} />
}

// ============================================================
// 挂到 window 上的名字
// ============================================================
/**
 * 老页是 classic script，顶层 `function` 声明天然是 `window` 的全局属性，所以 HTML 里
 * 那些内联 `onclick="openTimePicker()"` / `selectMethod('…',this)` 全靠它们。ESM 里
 * 这些名字**不会**成为全局 —— 不挂就是「点哪儿都没反应」，而且不报错（浏览器只会在
 * 控制台说一句 "openTimePicker is not defined"）。
 *
 * 与 my-charts/main.jsx 末尾、mhys/main.jsx:209-255 同一做法。
 * 阶段 4 收口时把内联 onclick 换成 React 事件，这些挂载一起消掉。
 */
function installGlobals() {
  var expose = function (name, value) {
    try { window[name] = value; }
    catch (e) { /* 只读属性之类的极端情况，别让整页停在这儿 */ }
  };

  // —— ① 静态骨架里 14 处行内事件属性点到的名字（8 个）——
  //    这一批与 mhys 的前七个一一对应，**多一个 `selectGender`** ——
  //    六爻的用神取法依赖性别，老页有性别卡，梅花没有。
  expose('selectGender', selectGender);
  expose('openTimePicker', openTimePicker);
  expose('closeTimePicker', closeTimePicker);
  expose('confirmTimePicker', confirmTimePicker);
  expose('toggleDropdown', toggleDropdown);
  expose('selectMethod', selectMethod);
  expose('startDivination', startDivination);
  expose('switchCalendar', switchCalendar);

  // —— ② `logic.js` **运行时生成**的 HTML 里的行内 onclick（3 个）——
  //
  // ★ 这一批是 mhys 那页**没有**的，靠扫老 index.html 扫不出来：老 index.html 里
  //   一个都看不见，它们长在 `renderMethodParams()` / `renderManualLines()` 拼出来
  //   的字符串里（老 :371 / :377 / :435）：
  //     · `coinClick()`        —— 整条 `.coin-row#coinRow`（铜钱摇卦的主交互）
  //     · `coinReset()`        —— `#coinResetBtn`「重新摇卦」
  //     · `cycleManualLine(i)` —— 手动指定里每一行（点了切换 少阳→老阳→少阴→老阴）
  //   不挂这三个，铜钱点了没反应、手动那一列点了没反应，而且控制台只有一行
  //   "coinClick is not defined"，页面看起来完全正常。
  //   `duipan/drive_liuyao_page.js` 抓不到这一条：它走 `__liuyaoTestApi.setCoinResults`
  //   / `setManualLines` 直接注入状态，从不真点铜钱或爻行（基线 ⑥ 也是这么打的）。
  //   所以这三个必须挂，并且必须真的能点 —— 这是本页最容易被漏掉的一处。
  expose('coinClick', coinClick);
  expose('coinReset', coinReset);
  expose('cycleManualLine', cycleManualLine);

  // —— ③ 下面这个**不是页面 API，是测试桥**，页面自己一个字节都不读 ——
  //
  // `duipan/drive_liuyao_page.js` 的三个原语（`setTime` / `setManual` / `setCoin`）
  // 要直接摆一个已知状态（它们是十几个用例的**准备步骤**，不是断言），并读回文案。
  // 老页里 `selectedTime` / `MANUAL_LINES` / `COIN` 是顶层 `var`，`updateTimeDisplay` /
  // `renderManualLines` / `renderAccumulatedLines` 是顶层 `function`，天然是全局，
  // 驱动顺手就用了；ESM 没有这个「顺手」。
  //
  // ★ 为什么收在一个名字下，而不是把裸名重新挂回 `window`：
  //   挂裸名会让 `window.selectedTime` / `window.MANUAL_LINES` / `window.COIN`
  //   看起来像页面 API，下一个读代码的人会以为页面依赖它们。收进 `__liuyaoTestApi`
  //   只有一个用途、一眼能看出是测试用的。
  //   （`coinClick` / `coinReset` / `cycleManualLine` 不在此列 —— 它们是**真的**被
  //    生成的 HTML 点到的，见上面 ②。）
  //
  // ⚠ 三个原语都照抄驱动里「老路」分支的写法，逐句对应：
  //   · `setTime` 改的是 `state.selectedTime` 的**字段**（不是整体赋值），与老路
  //     `W.selectedTime.year = …` 完全同形；返回 `#timeDisplay`.textContent。
  //   · `setManualLines` 整体换 `state.MANUAL_LINES` 再 `renderManualLines()`，
  //     返回 `#manualLines`.innerText。
  //   · `setCoinResults` 整体换 `state.COIN.results` 再 `renderAccumulatedLines()`，
  //     返回 `COIN.results.join(',')`。
  //   `has(name)` 返回 `typeof` 的**字符串**：驱动用它问 `castToTrigrams` 在不在
  //   （老页它是裸全局 `W.castToTrigrams`，ESM 里查不到，只能这么问）。
  //
  // 移除时机：阶段 4 收口时把驱动的三个原语改成真操作页面 ——
  //   `setTime` 改成真点时间选择器（开 `#tpPicker`、滚列、点确定）、
  //   `setManualLines` 改成真点爻行、`setCoinResults` 改成真点六次铜钱 ——
  //   这个对象连同这一段注释一起删。
  window.__liuyaoTestApi = {
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
    setManualLines: function (types) {
      state.MANUAL_LINES = types.slice();
      renderManualLines();
      return document.getElementById('manualLines').innerText;
    },
    setCoinResults: function (types) {
      state.COIN.results = types.slice();
      renderAccumulatedLines();
      return state.COIN.results.join(',');
    },
    has: function (name) {
      return typeof logic[name];
    },
  };
}

// ============================================================
// 装载（顺序就是老页面 `<script>` 的顺序）
// ============================================================
// 老页面里 `page-liuyao.js` 是**第 5 条** classic script（老 index.html :126，排在
// lunar / auth / ui_common / liuyao_render 之后、ai_panel / liuyao_ai_panel 之前）。
// 新页面里它变成了下面的 module，位置挪到最后，但**执行顺序仍然在 ai_panel.js
// 之后、DOMContentLoaded 之前**（module 自带 defer），要求是：
//   ① 六条传统 script 先执行（它们定义 window.AI_PANEL_CONF、Solar/Lunar、
//      renderLiuyaoResult / refreshAIPanel 这些 logic.js 与页面依赖的全局）；
//   ② `main.jsx` 这个 module（defer）在它们之后执行；
//   ③ 在这里同步把骨架提交进 DOM，再跑 `init()`。
// 因为 `type="module"` 是 defer 的，①一定先于②；②里用 flushSync 保证③之前骨架
// 已经在 DOM 里 —— 这样 `ai_panel.js` 的 DOMContentLoaded 分支拿到的是完整的
// `#resultArea`（它若在 module 之前就 mount，会找不到宿主而静默放弃）。
//
// ⚠ 与老页的一处**顺序差异**（已知、且被判定为不可观察）：老页 `page-liuyao.js` 的
//   顶层 `init()` 跑在 `ai_panel.js` / `liuyao_ai_panel.js` **之前**；新页 `init()`
//   跑在它们之后。两边的 `init()` 都仍在 DOMContentLoaded 之前，而 `init()` 与那两个
//   引擎之间没有共享状态（`init()` 只碰 #timeDisplay / #methodParams / #startBtn /
//   图片预加载；引擎只碰 body 与 #resultArea 的 nextSibling）。这条只能在真浏览器里
//   证，见报告「没能证实的假设」。
//
// 注意 `bindPageLifecycle()` 里那两个监听（pagehide / pageshow）与 `bindDocumentClick()`
// 对应老页的模块级副作用，必须在 init() 之前登记（老页也是这个先后）。
installGlobals();
bindPageLifecycle();

const root = createRoot(document.getElementById('root'));
flushSync(function () {
  root.render(<LiuyaoPage />);
});

// 骨架已在 DOM，这时注册 document 级「点空白关下拉」才安全
// （logic.js 的 bindDocumentClick 注释里写了为什么要从这个位置注册）。
bindDocumentClick();

// 老页快照最后一行是裸调 `init();`。时序等价：都在页面可交互之前、DOM 已在。
init();
