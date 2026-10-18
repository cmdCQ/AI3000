import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { renderMarkdown } from '../shared/uiCommon.js';
import '../shared/css/tokens.css';
import './style.css';

const DOCUMENTS = Object.freeze([
  { id: 'agreement', title: '用户协议', source: '/legal/user-agreement.html' },
  { id: 'privacy', title: '隐私政策', source: '/legal/privacy-policy.html' },
  { id: 'ai', title: 'AI 使用与风险说明', source: '/legal/ai-risk.html' },
]);

function MarkdownDocument({ text }) {
  const html = useMemo(() => ({ __html: renderMarkdown(text) }), [text]);
  return <article className="legal-document" dangerouslySetInnerHTML={html} />;
}

function LegalPage() {
  const [activeId, setActiveId] = useState(DOCUMENTS[0].id);
  const [documents, setDocuments] = useState({});
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const active = DOCUMENTS.find(document => document.id === activeId) || DOCUMENTS[0];

  React.useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    fetch(active.source, { signal: controller.signal, credentials: 'same-origin' })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then(text => {
        if (controller.signal.aborted) return;
        setDocuments(previous => ({ ...previous, [active.id]: text }));
        setError('');
        setState('ready');
      })
      .catch(reason => {
        if (!controller.signal.aborted) {
          setError(reason.message || '文档加载失败');
          setState('error');
        }
      });
    return () => controller.abort();
  }, [active.id, active.source, retry]);

  return <main className="legal-page">
    <header className="legal-header">
      <a className="legal-back" href="/">← 返回首页</a>
      <div><p className="legal-kicker">易三千</p><h1>法律文档</h1></div>
    </header>
    <nav className="legal-tabs" aria-label="法律文档">
      {DOCUMENTS.map(document => <button key={document.id} className={document.id === active.id ? 'active' : ''} type="button" aria-pressed={document.id === active.id} onClick={() => setActiveId(document.id)}>{document.title}</button>)}
    </nav>
    <section className="legal-card" aria-busy={state === 'loading'}>
      {state === 'loading' && <p className="legal-status" role="status">正在加载文档…</p>}
      {state === 'error' && <div className="legal-status" role="alert"><p>文档加载失败：{error}</p><button type="button" onClick={() => setRetry(value => value + 1)}>重试</button></div>}
      {state === 'ready' && <MarkdownDocument text={documents[active.id] || ''} />}
    </section>
  </main>;
}

createRoot(document.getElementById('root')).render(<LegalPage />);
