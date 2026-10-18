import React, { useEffect, useRef, useState } from 'react';
import { AUTH, openAuthModal } from './auth.js';
import './authModalStyles.js';
import './css/shared-history.css';

const unpack = value => Array.isArray(value) ? { records: value, nextBefore: null } : value;

/** Shared records UI. Loaders return rows or {records,nextBefore}; reject with status=401 for expired auth. */
export function RecordsHistoryPage({
  title, backHref, loadRecords, deleteRecord, loadMoreRecords, children,
  emptyTitle = '暂无排盘记录', emptyDescription = '', emptyHref = backHref,
  emptyAction = '去排盘', searchPlaceholder = '搜索卦例...', noResultsText = '没有匹配的卦例',
  loginTitle = '登录后查看排盘记录', loginDescription = '登录后可查看历史排盘和AI解读记录',
}) {
  const [records, setRecords] = useState([]);
  const [phase, setPhase] = useState('loading');
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState('');
  const [manage, setManage] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [nextBefore, setNextBefore] = useState(null);
  const [moreLoading, setMoreLoading] = useState(false);
  const [moreError, setMoreError] = useState('');
  const moreController = useRef(null);
  const selectAll = useRef(null);
  const deleteLock = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    setSelected(new Set()); setManage(false); setError(''); setMoreError(''); setNextBefore(null);
    if (!AUTH.isLoggedIn()) { setPhase('guest'); return () => controller.abort(); }
    setPhase('loading');
    Promise.resolve().then(() => loadRecords(controller.signal)).then(value => {
      if (controller.signal.aborted) return;
      const data = unpack(value);
      if (!Array.isArray(data?.records)) throw new Error('记录数据格式错误');
      setRecords(data.records); setNextBefore(data.nextBefore ?? null); setPhase('ready');
    }).catch(err => {
      if (controller.signal.aborted) return;
      setPhase(err.status === 401 ? 'unauthorized' : 'error');
      setError('记录加载失败，请重试');
    });
    return () => { controller.abort(); moreController.current?.abort(); };
  }, [loadRecords, revision]);
  const filtered = records.filter(row => `${row.title} ${row.meta || ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  const allSelected = filtered.length > 0 && filtered.every(row => selected.has(row.id));
  const someSelected = filtered.some(row => selected.has(row.id));
  useEffect(() => { if (selectAll.current) selectAll.current.indeterminate = someSelected && !allSelected; }, [someSelected, allSelected]);
  function toggle(id) {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }
  async function removeSelected() {
    if (deleteLock.current || !selected.size || !window.confirm(`确定要删除选中的 ${selected.size} 条记录吗？删除后无法恢复。`)) return;
    deleteLock.current = true; setDeleting(true); setError('');
    const removed = new Set();
    let unauthorized = false;
    for (const id of selected) {
      try { await deleteRecord(id); removed.add(id); }
      catch (err) { if (err.status === 401) { unauthorized = true; break; } }
    }
    setRecords(prev => prev.filter(row => !removed.has(row.id)));
    setSelected(prev => new Set([...prev].filter(id => !removed.has(id))));
    if (unauthorized) { setPhase('unauthorized'); setManage(false); }
    else if (removed.size !== selected.size) setError('部分记录删除失败，失败记录已保留，请重试。');
    else setManage(false);
    setDeleting(false); deleteLock.current = false;
  }
  async function loadMore() {
    if (moreLoading || !loadMoreRecords) return;
    const controller = new AbortController(); moreController.current = controller;
    setMoreLoading(true); setMoreError('');
    try {
      const data = unpack(await loadMoreRecords(nextBefore, controller.signal));
      if (controller.signal.aborted) return;
      if (!Array.isArray(data?.records)) throw new Error('记录数据格式错误');
      setRecords(prev => [...new Map([...prev, ...data.records].map(row => [row.id, row])).values()]);
      setNextBefore(data.nextBefore ?? null);
    } catch (err) {
      if (!controller.signal.aborted) {
        if (err.status === 401) { setPhase('unauthorized'); setManage(false); }
        else setMoreError('更多记录加载失败，请重试');
      }
    } finally { if (!controller.signal.aborted) setMoreLoading(false); }
  }
  const ready = phase === 'ready';
  return <section className="records-page">
    <header className="float-menu" id="floatMenu">
      <div className="fm-top"><div className="fm-left"><a className="fm-back" href={backHref}>← 返回</a><h1 className="fm-title">{title}</h1></div>
        <button id="manageBtn" className={`fm-btn manage-btn${manage ? ' active' : ''}`} disabled={!ready || deleting || moreLoading} onClick={() => { setManage(!manage); setSelected(new Set()); setError(''); }}>{manage ? '完成' : '管理'}</button></div>
      <div className="fm-search"><input id="searchInput" type="search" aria-label={nextBefore != null ? '搜索已加载记录' : '搜索记录'} placeholder={nextBefore != null ? '搜索已加载记录…' : searchPlaceholder} value={query} disabled={!ready || deleting} onChange={event => setQuery(event.target.value)} />
        {query && <button id="searchClear" className="fm-search-clear" aria-label="清空搜索" disabled={deleting} onClick={() => setQuery('')}>✕</button>}</div>
      {manage && <div className="fm-actions show" id="fmActions"><label className="fm-select-all"><input ref={selectAll} type="checkbox" checked={allSelected} disabled={deleting || !filtered.length} onChange={() => setSelected(prev => { const next = new Set(prev); filtered.forEach(row => allSelected ? next.delete(row.id) : next.add(row.id)); return next; })} />全选</label>
        <span id="selectedCount" aria-live="polite">已选 {selected.size}</span><button id="deleteSelectedBtn" className="fm-delete-selected" disabled={!selected.size || deleting} onClick={removeSelected}>{deleting ? '删除中…' : '删除选中'}</button></div>}
    </header>
    <div className={`mh-wrapper${manage ? ' manage-mode' : ''}`}>
      {ready && children}
      <div id="contentArea" aria-busy={phase === 'loading' || deleting}>
        {phase === 'loading' && <div className="load-state" role="status"><div className="spinner" />加载中...</div>}
        {(phase === 'guest' || phase === 'unauthorized') && <div className="empty-state"><div className="empty-icon" aria-hidden="true">👤</div><p>{phase === 'unauthorized' ? '登录已失效，请重新登录' : loginTitle}</p><p className="state-description">{loginDescription}</p><button className="guest-btn primary" onClick={() => openAuthModal('login')}>去登录</button></div>}
        {phase === 'error' && <div className="empty-state" role="alert"><p>{error}</p><button className="fm-btn retry-btn" onClick={() => setRevision(v => v + 1)}>重试</button></div>}
        {ready && <>
          {error && <p className="records-error" role="alert">{error}</p>}
          {!filtered.length ? <div className="empty-state"><div className="empty-icon" aria-hidden="true">🔍</div><p>{query.trim() ? noResultsText : emptyTitle}</p>{emptyDescription && !query.trim() && <p className="state-description">{emptyDescription}</p>}<a href={emptyHref}>{emptyAction}</a></div> : <div className="record-list">{filtered.map(row => {
            const content = <><span className="rc-emoji" aria-hidden="true">{row.icon || '☯'}</span><span className="rc-info"><span className="rc-topic">{row.title}</span><span className="rc-meta">{row.meta}</span></span></>;
            return manage ? <label key={row.id} className={`record-card${selected.has(row.id) ? ' selected' : ''}`}><input className="rc-checkbox" type="checkbox" aria-label={`选择 ${row.title}`} checked={selected.has(row.id)} disabled={deleting} onChange={() => toggle(row.id)} />{content}</label> : <a className="record-card" key={row.id} href={row.href}>{content}<span className="rc-arrow" aria-hidden="true">›</span></a>;
          })}</div>}
          {moreError && <p className="records-error" role="alert">{moreError}</p>}
          {nextBefore != null && loadMoreRecords && <button className="fm-btn load-more" disabled={moreLoading || deleting} onClick={loadMore}>{moreLoading ? '加载中…' : '加载更多'}</button>}
        </>}
      </div>
    </div>
  </section>;
}
