import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { renderMarkdown } from '../shared/uiCommon.js';
import '../shared/css/tokens.css';
import './style.css';
import agreementText from '../../../docs/用户协议.md?raw';
import privacyText from '../../../docs/隐私政策.md?raw';
import aiText from '../../../docs/AI使用与风险说明.md?raw';

const DOCUMENTS = Object.freeze([
  { id: 'agreement', title: '用户协议', text: agreementText },
  { id: 'privacy', title: '隐私政策', text: privacyText },
  { id: 'ai', title: 'AI 使用与风险说明', text: aiText },
]);

function MarkdownDocument({ text }) {
  const html = useMemo(() => ({ __html: renderMarkdown(text) }), [text]);
  return <article className="legal-document" dangerouslySetInnerHTML={html} />;
}

function LegalPage() {
  // 初始文档取 URL 的 hash（`/legal/#privacy`、`#ai`）：注册页与登录弹窗的「同意法律文档」
  // 三个链接都带锚点，没有这一段时点「隐私政策」落地看到的仍是用户协议 —— 用户以为点错了。
  const [activeId, setActiveId] = useState(() => {
    const id = String(window.location.hash || '').replace('#', '');
    return DOCUMENTS.some(document => document.id === id) ? id : DOCUMENTS[0].id;
  });

  // 已经在这一页时改 hash（地址栏手改、或被别的页面带着锚点跳过来）也要跟着切。
  useEffect(() => {
    const onHashChange = () => {
      const id = String(window.location.hash || '').replace('#', '');
      if (DOCUMENTS.some(document => document.id === id)) setActiveId(id);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const [state, setState] = useState('ready');
  const active = DOCUMENTS.find(document => document.id === activeId) || DOCUMENTS[0];

  return <main className="legal-page">
    <header className="legal-header">
      <a className="legal-back" href="/">← 返回首页</a>
      <div><p className="legal-kicker">易三千</p><h1>法律文档</h1></div>
    </header>
    <nav className="legal-tabs" aria-label="法律文档">
      {DOCUMENTS.map(document => <button key={document.id} className={document.id === active.id ? 'active' : ''} type="button" aria-pressed={document.id === active.id} onClick={() => {
          setActiveId(document.id);
          // 用 replaceState 而不是改 location.hash：不往浏览历史里塞一堆 tab 记录，
          // 但地址栏会跟着变，链接可以直接复制给人。
          window.history.replaceState(null, '', '#' + document.id);
        }}>{document.title}</button>)}
    </nav>
    <section className="legal-card" aria-busy={state === 'loading'}>
      {state === 'ready' && <MarkdownDocument text={active.text} />}
    </section>
  </main>;
}

createRoot(document.getElementById('root')).render(<LegalPage />);
