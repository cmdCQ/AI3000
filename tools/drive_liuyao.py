#!/usr/bin/env python3
"""跑一遍易三千的六爻：手动起卦 → 结果页，截图 + DOM 探测。"""
import json
import shutil
import sys
import time

sys.path.insert(0, '/tmp/shushu-shots')
from shot import Marionette

OUT = '/tmp/ai3000/shots'
MARK = 'WM' + str(int(time.time()))[-6:]


def main():
    shutil.rmtree(f'{OUT}/profile', ignore_errors=True)
    m = Marionette(w=1440, h=1400)
    m.sock.settimeout(120)
    try:
        # 站点引了 Google Fonts（国内挂死），等 load 事件会超时；eager = DOMContentLoaded 即返回
        r = m._cmd('WebDriver:NewSession',
                   {'capabilities': {'pageLoadStrategy': 'eager'}})
        m.session = r.get('sessionId')
        m.navigate('https://sqw.somtfly.com/liuyao/')
        time.sleep(3)
        print('标题:', m.script('return document.title'))

        # 水印，确认截图与 DOM 同源
        m.script('''
          const d = document.createElement('div');
          d.id = 'wm';
          d.textContent = arguments[0];
          d.style.cssText = 'position:fixed;top:0;left:0;z-index:99999;background:#c00;'
            + 'color:#fff;font:700 26px monospace;padding:4px 12px';
          document.body.appendChild(d);
        ''', MARK)

        # 切手动 + 设定六爻（初爻优先）：老阳动 / 少阴 / 老阴动 / 少阳 / 少阳 / 少阴
        m.script('''
          selectMethod('manual', null);
          MANUAL_LINES = ['laoyang','shaoyin','laoyin','shaoyang','shaoyang','shaoyin'];
          renderManualLines();
          const inp = document.getElementById('topicInput');
          const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
          set.call(inp, '测试六爻显示');
          inp.dispatchEvent(new Event('input', {bubbles:true}));
        ''')
        time.sleep(0.5)
        m.shot(f'{OUT}/1-form.png')

        before = m.script('''
          return {
            method: (typeof currentMethod !== 'undefined') ? currentMethod : '?',
            manual: (typeof MANUAL_LINES !== 'undefined') ? MANUAL_LINES.join(',') : '?',
            wm: (document.getElementById('wm')||{}).textContent,
          };
        ''')
        print('起卦前:', json.dumps(before, ensure_ascii=False))

        # 点「开始排盘」
        m.script("document.getElementById('startBtn').click()")
        time.sleep(4)
        print('结果页 URL:', m.script('return location.href'))
        print('标题:', m.script('return document.title'))

        # 结果页 DOM 探测
        res = m.script('''
          const wm = document.getElementById('wm');
          if (wm) wm.textContent = arguments[0];
          const text = (document.getElementById('contentArea')||document.body).innerText
            .replace(/\\s+/g,' ').trim();
          return { wm: wm ? wm.textContent : null, len: text.length, text: text.slice(0, 1400) };
        ''', MARK)
        print('结果页文本:', res['text'][:1400])
        print('水印:', res['wm'], '应为', MARK)

        # 六爻表格逐行（六亲/地支/六神/世应）
        table = m.script('''
          const rows = [...document.querySelectorAll('table.ht tr')].map(r =>
            [...r.children].map(td => td.innerText.trim()).join(' | '));
          return rows.slice(0, 40);
        ''')
        print('排盘表:')
        for r in (table or []):
            print('   ', r)

        m.shot(f'{OUT}/2-result-full.png')
        m.script("window.scrollTo(0, 0)")
        time.sleep(0.4)
        m.shot(f'{OUT}/3-result-top.png')
    finally:
        m.quit()


if __name__ == '__main__':
    main()
