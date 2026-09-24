#!/usr/bin/env python3
"""验证：六爻手动起卦选的值到底有没有生效。"""
import json
import shutil
import sys
import time

sys.path.insert(0, '/tmp/shushu-shots')
from shot import Marionette

OUT = '/tmp/ai3000/shots'


def main():
    shutil.rmtree(f'{OUT}/profile', ignore_errors=True)
    m = Marionette(w=1200, h=1000)
    m.sock.settimeout(120)
    try:
        r = m._cmd('WebDriver:NewSession', {'capabilities': {'pageLoadStrategy': 'eager'}})
        m.session = r.get('sessionId')
        m.navigate('https://sqw.somtfly.com/liuyao/')
        time.sleep(3)

        # 分步做，每步都读回真值
        print('1) 切手动:', m.script('selectMethod("manual", null); return currentMethod;'))
        time.sleep(0.5)
        print('2) 赋值后 MANUAL_LINES =', m.script("""
          MANUAL_LINES = ['laoyang','shaoyin','laoyin','shaoyang','shaoyang','shaoyin'];
          return MANUAL_LINES.join(',');
        """))
        time.sleep(0.3)
        print('3) 再读一次(看是否被重置) =', m.script('return MANUAL_LINES.join(",")'))
        m.script('renderManualLines()')
        time.sleep(0.3)
        print('4) renderManualLines 后再次读 =', m.script('return MANUAL_LINES.join(",")'))
        dom = m.script("""
          return [...document.querySelectorAll('.coin-line-row')].map(r => r.innerText.replace(/\\s+/g,' '));
        """)
        print('5) 手动区 DOM 每行:', json.dumps(dom, ensure_ascii=False))
        print('6) 全局是否可写 =', m.script('return typeof MANUAL_LINES'))
        # 是否 window 属性
        print('7) window.MANUAL_LINES =', m.script('return String(window.MANUAL_LINES)'))

        # 用页面自带的循环函数把初爻切成老阳
        print('8) cycleManualLine(0) 前:', m.script('return MANUAL_LINES[0]'))
        m.script('cycleManualLine(0)')
        print('   后:', m.script('return MANUAL_LINES[0]'))
        m.shot(f'{OUT}/4-manual-form.png')

        # 起卦
        m.script("""
          const inp = document.getElementById('topicInput');
          const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
          s.call(inp, '手动验证'); inp.dispatchEvent(new Event('input',{bubbles:true}));
        """)
        print('9) 起卦 payload MANUAL_LINES =', m.script('return MANUAL_LINES.join(",")'))
        m.script("document.getElementById('startBtn').click()")
        time.sleep(4)
        print('10) 结果页:', m.script('return location.href'))
        txt = m.script("""
          return (document.getElementById('contentArea')||document.body).innerText
            .replace(/\\s+/g,' ').slice(0, 400);
        """)
        print('11) 排盘信息:', txt)
    finally:
        m.quit()


if __name__ == '__main__':
    main()
