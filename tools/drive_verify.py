#!/usr/bin/env python3
"""批 0 验收：六爻(手动) + 梅花(报数/时间) 真跑一遍，确认排盘与体用分级落到页面上。

用法：python3 drive_verify.py
踩过的坑（都别再踩）：
 1. profile 是 shot.py 里硬编码的 /tmp/shushu-shots/profile，Firefox 会用它缓存 HTML，
    跑之前必须先 rm -rf，否则拿到旧页面。
 2. selectMethod(method, el) 会读 el.textContent —— 必须传真实的 .method-option 元素；
    传 null 会抛异常导致 renderMethodParams() 不执行、输入框压根不渲染。
 3. Marionette 的 executeScript 里 bare `MANUAL_LINES = [...]` 只写进沙箱全局，跨调用丢失；
    要写页面全局必须 `window.MANUAL_LINES = ...`。本驱动干脆走页面自己的
    cycleManualLine()，与真实用户点击同一条路径。
 4. 页面 alert() 会阻塞后续 executeScript（超时返回 None），所以先 stub 掉收进 __alerts。
 5. 每次 navigate 后 prelude 随页面销毁，必须重新装；跨页脚本里不要直接调 __alertsOf。
"""
import sys
import time

sys.path.insert(0, '/tmp/shushu-shots')
from shot import Marionette

OUT = '/tmp/ai3000/shots'

PRELUDE = """
window.__alerts = [];
window.alert = function(m){ window.__alerts.push(String(m)); };
window.confirm = function(m){ window.__alerts.push('confirm:'+String(m)); return true; };
window.__alertsOf = function(){ return window.__alerts.join(' | '); };
window.__pick = function(method){
  var opts = [].slice.call(document.querySelectorAll('.method-option'));
  var el = null;
  for (var i=0;i<opts.length;i++){
    if ((opts[i].getAttribute('onclick')||'').indexOf("'"+method+"'") >= 0) { el = opts[i]; break; }
  }
  if (!el) throw new Error('找不到方法选项: '+method);
  selectMethod(method, el);
  return el.textContent.trim();
};
window.__setInput = function(id, v){
  var inp = document.getElementById(id);
  if (!inp) throw new Error('缺少输入框: '+id);
  var set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
  set.call(inp, v);
  inp.dispatchEvent(new Event('input', {bubbles:true}));
  return inp.value;
};
"""


def start():
    m = Marionette(w=1440, h=1600)
    m.sock.settimeout(120)
    # 站点引 Google Fonts（国内挂死），等 load 会超时；eager = DOMContentLoaded 即返回
    r = m._cmd('WebDriver:NewSession',
               {'capabilities': {'pageLoadStrategy': 'eager'}})
    m.session = r.get('sessionId')
    return m


def check(name, ok, detail=''):
    print(('  ✅ ' if ok else '  ❌ ') + name + ('  ' + detail if detail else ''))
    return ok


def liuyao(m):
    """手动起卦：乾为天初爻动（老阳）。用页面自己的 cycleManualLine 点出来。"""
    print('=== 六爻：手动起卦 乾为天初爻动（老阳）===')
    m.navigate('https://sqw.somtfly.com/liuyao/')
    time.sleep(2.5)
    m.script(PRELUDE)
    print('  方法标签:', m.script("return window.__pick('manual')"))
    time.sleep(0.5)  # 等 setTimeout(fillManualLineSelects, 50) 那次硬重置跑完
    m.script("window.__setInput('topicInput', '批0验收')")
    # 默认全少阴；cycleManualLine 顺序 少阳→老阳→少阴→老阴→少阳（index 0=初爻）
    # 初爻 少阴 --3次--> 老阳；其余五爻 少阴 --2次--> 少阳  ⇒ 乾为天，初爻动 → 变天风姤
    m.script("""
      for (var i=1;i<=5;i++){ cycleManualLine(i); cycleManualLine(i); }
      cycleManualLine(0); cycleManualLine(0); cycleManualLine(0);
    """)
    print('  六爻(初→上):', m.script("return window.MANUAL_LINES.join(',')"))
    m.script("document.getElementById('startBtn').click()")
    time.sleep(4.0)
    url = m.script('return location.href')
    print('  结果页:', url)

    res = m.script("""
      try {
        var tbl = [].slice.call(document.querySelectorAll('table.ht')).map(function(t){
          return [].slice.call(t.querySelectorAll('tr.hr')).map(function(r){
            return [].slice.call(r.children).map(function(td){ return td.innerText.trim(); });
          });
        });
        var gs = document.querySelector('.h-gs-line');
        var area = document.getElementById('contentArea');
        var txt = (area ? area.innerText : document.body.innerText).replace(/\\s+/g,' ');
        return {
          tables: tbl,
          guaShen: gs ? gs.innerText.replace(/\\s+/g,' ').trim() : null,
          cols: tbl.length ? tbl[0][0].length : 0,
          names: (txt.match(/[^ ]+\\([^ ]+宫\\)/g) || []).join(' '),
          bian: (txt.match(/变卦[:：][^ ]*/g) || []).join(' '),
          dong: (txt.match(/动爻[^ ]{0,20}/) || []).join(' '),
          alerts: (typeof window.__alertsOf === 'function') ? window.__alertsOf() : '',
        };
      } catch(e) { return {err: String(e && e.message ? e.message : e)}; }
    """)
    if res.get('err'):
        print('  ❌ 提取失败:', res['err'])
        m.shot(f'{OUT}/v1-liuyao-err.png')
        return
    check('排盘表为 6 列（含世应列）', res['cols'] == 6, '实得 %s 列' % res['cols'])
    check('行数一致 → 本卦/变卦两表对齐',
          len(res['tables']) == 2 and len(res['tables'][0]) == len(res['tables'][1]),
          '本卦 %s 行 / 变卦 %s 行' % (len(res['tables'][0]), len(res['tables'][1])))
    rows0 = res['tables'][0]
    check('世应只标本卦（变卦列全空）',
          any(r[0] == '世' for r in rows0) and any(r[0] == '应' for r in rows0)
          and all(r[0] == '' for r in res['tables'][1]))
    print('  本卦表（自上而下=上爻→初爻）:')
    for r in rows0:
        print('     ', ' | '.join(r))
    print('  变卦表:')
    for r in res['tables'][1]:
        print('     ', ' | '.join(r))
    # 乾为天：乾宫六世 世在上爻、应在三爻；阳世从子起顺数至世 6 → 巳
    check('乾为天 世在上爻、应在三爻',
          rows0[0][0] == '世' and rows0[3][0] == '应',
          '上爻=%r 三爻=%r' % (rows0[0][0], rows0[3][0]))
    check('卦身为巳（阳世从子起，顺数至世爻）', '巳' in (res['guaShen'] or ''),
          (res['guaShen'] or '')[:70])
    check('初爻动 → 变卦天风姤', '姤' in res['bian'], res['bian'] or '(未取到变卦)')
    check('世代标签已中文化（不再出现 pure）', 'pure' not in res['names'], res['names'])
    if res['alerts']:
        print('  ⚠ 页面 alert:', res['alerts'])
    m.shot(f'{OUT}/v1-liuyao.png')


def meihua_num(m):
    print('=== 梅花：报数起卦 7/3/5（古法 上=7%8=7 下=3%8=3 动=15%6=3）===')
    m.navigate('https://sqw.somtfly.com/mhys/')
    time.sleep(2.5)
    m.script(PRELUDE)
    print('  方法标签:', m.script("return window.__pick('num2')"))
    time.sleep(0.4)
    m.script("window.__setInput('num2Input', '735')")
    m.script("window.__setInput('topicInput', '批0验收-报数')")
    print('  输入回读:', m.script("return document.getElementById('num2Input').value"),
          '| 加时辰默认:', m.script("return document.getElementById('num2AddShichen').checked"))
    m.script("document.getElementById('num2AddShichen').checked = false")
    m.script("document.getElementById('startBtn').click()")
    time.sleep(4.5)
    url = m.script('return location.href')
    print('  结果页:', url)
    if 'result.html' not in (url or ''):
        print('  ⚠ 未跳转，页面 alert:', m.script(
            "return (typeof window.__alertsOf==='function')?window.__alertsOf():'(prelude 已随页面销毁)'"))
        m.shot(f'{OUT}/v2-meihua-num-fail.png')
        return

    res = m.script("""
      try {
        var v = document.querySelector('.tiyong-verdict');
        var area = document.getElementById('contentArea');
        var txt = (area ? area.innerText : document.body.innerText).replace(/\\s+/g,' ');
        return {
          verdict: v ? v.innerText.trim() : null,
          verdictCls: v ? v.className : null,
          verdictColor: v ? getComputedStyle(v).color + ' / ' + getComputedStyle(v).backgroundColor : null,
          hasMove: /动爻/.test(txt),
          moveLine: (txt.match(/动爻[^ ]{0,40}/) || [''])[0],
          seg3: /懂|白话|一句话|结论/.test(txt),
        };
      } catch(e) { return {err: String(e && e.message ? e.message : e)}; }
    """)
    if res.get('err'):
        print('  ❌ 提取失败:', res['err'])
        return
    print('  体用判词:', res['verdict'], '| class:', res['verdictCls'])
    print('  实际配色:', res['verdictColor'])
    check('体用判词带吉凶分级',
          bool(res['verdict']) and ('吉' in res['verdict'] or '凶' in res['verdict']))
    check('判词用了分级配色（非全站同一个 neutral）',
          bool(res['verdictCls']) and 'verdict-neutral' not in res['verdictCls'], str(res['verdictCls']))
    check('结果页出现动爻信息', res['hasMove'], res['moveLine'])
    m.shot(f'{OUT}/v2-meihua-num.png')


def meihua_time(m):
    print('=== 梅花：时间起卦（验闰月与换日路径不崩、能出结果）===')
    m.navigate('https://sqw.somtfly.com/mhys/')
    time.sleep(2.5)
    m.script(PRELUDE)
    print('  方法标签:', m.script("return window.__pick('time')"))
    time.sleep(0.4)
    m.script("window.__setInput('topicInput', '批0验收-时间')")
    m.script("document.getElementById('startBtn').click()")
    time.sleep(4.5)
    url = m.script('return location.href')
    print('  结果页:', url)
    res = m.script("""
      try {
        var area = document.getElementById('contentArea');
        var txt = (area ? area.innerText : document.body.innerText).replace(/\\s+/g,' ');
        var v = document.querySelector('.tiyong-verdict');
        return {ok: /本卦/.test(txt), len: txt.length, head: txt.slice(0,220),
                verdict: v ? v.innerText.trim() : null};
      } catch(e) { return {err: String(e && e.message ? e.message : e)}; }
    """)
    if res.get('err'):
        print('  ❌ 提取失败:', res['err'])
        return
    check('时间起卦能正常出结果', res['ok'], '%d 字' % res['len'])
    print('  体用判词:', res['verdict'])
    print('  页面开头:', res['head'][:190])
    m.shot(f'{OUT}/v3-meihua-time.png')


def main():
    m = start()
    try:
        liuyao(m)
        print()
        meihua_num(m)
        print()
        meihua_time(m)
    finally:
        m.quit()


if __name__ == '__main__':
    main()
