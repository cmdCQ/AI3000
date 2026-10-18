import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { renderMarkdown } from '../shared/uiCommon.js';
import '../shared/css/tokens.css';
import './style.css';
import agreementText from '../../../docs/用户协议（审核草稿）.md?raw';
import privacyText from '../../../docs/隐私政策（审核草稿）.md?raw';
import aiText from '../../../docs/AI使用与风险说明（审核草稿）.md?raw';

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
  const [activeId, setActiveId] = useState(DOCUMENTS[0].id);
  const [state, setState] = useState('ready');
  const active = DOCUMENTS.find(document => document.id === activeId) || DOCUMENTS[0];

  return <main className="legal-page">
    <header className="legal-header">
      <a className="legal-back" href="/">← 返回首页</a>
      <div><p className="legal-kicker">易三千</p><h1>法律文档</h1></div>
    </header>
    <nav className="legal-tabs" aria-label="法律文档">
      {DOCUMENTS.map(document => <button key={document.id} className={document.id === active.id ? 'active' : ''} type="button" aria-pressed={document.id === active.id} onClick={() => setActiveId(document.id)}>{document.title}</button>)}
    </nav>
    <section className="legal-card" aria-busy={state === 'loading'}>
      {state === 'ready' && <MarkdownDocument text={active.text} />}
    </section>
  </main>;
}

createRoot(document.getElementById('root')).render(<LegalPage />);
