import React, { useEffect, useRef, useState } from 'react';
import { loadCancellationCapability, cancelAccount, completeAccountCancellation } from './my.logic.js';

export default function AccountCancellation({ username, onClose }) {
  const dialog = useRef(null);
  const cancelButton = useRef(null);
  const inFlight = useRef(false);
  const [capability, setCapability] = useState(null);
  const [confirmation, setConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    element.showModal();
    cancelButton.current.focus();
    const controller = new AbortController();
    loadCancellationCapability(controller.signal).then(setCapability).catch(failure => {
      if (!controller.signal.aborted) setError(failure.message);
    });
    return () => { controller.abort(); element.close(); previousFocus?.focus(); };
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (inFlight.current || !capability || confirmation !== username || !acknowledged) return;
    inFlight.current = true;
    setPending(true); setError('');
    try {
      await cancelAccount({ password, confirmation });
    } catch (failure) {
      setError(failure.message);
      inFlight.current = false; setPending(false);
      return;
    }
    // Never clear credentials before the server has confirmed permanent deletion.
    completeAccountCancellation();
  }

  const verified = capability?.verificationMethod === 'password' && password.length > 0;
  return <dialog ref={dialog} className="cancellation-dialog" aria-labelledby="cancellationTitle" aria-describedby="cancellationWarning" onCancel={event => { event.preventDefault(); if (!inFlight.current) onClose(); }}>
    <form onSubmit={submit} aria-busy={pending}>
      <h2 id="cancellationTitle">永久注销账号</h2>
      <p id="cancellationWarning" className="cancellation-warning">注销后无法恢复。账号及全部用户业务数据将永久删除，无法再登录或找回。</p>
      <ul className="cancellation-data">
        <li>账号资料、登录身份与绑定信息</li>
        <li>所有命盘、排盘记录与相关资料</li>
        <li>AI 解读、聊天、追问及历史记录</li>
        <li>会员等级、积分用量、建议及账号绑定信息</li>
      </ul>
      <p className="cancellation-help">如需保留资料，请先自行备份。注销不是退出登录，也不能撤销。</p>
      <fieldset disabled={pending}>
        <label htmlFor="cancellationConfirmation">输入当前账号：<strong>{username}</strong></label>
        <input id="cancellationConfirmation" value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} required aria-describedby="cancellationExact" />
        <p id="cancellationExact" className="cancellation-help">必须完全一致，包括大小写与空格。</p>
        {!capability && !error && <p role="status">正在确认身份验证方式…</p>}
        {capability?.verificationMethod === 'password' && <>
          <label htmlFor="cancellationPassword">登录密码</label>
          <input id="cancellationPassword" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required />
        </>}
        <label className="cancellation-ack"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} required /><span>我已了解全部数据将永久删除，确认注销且无法恢复。</span></label>
      </fieldset>
      {error && <p className="cancellation-error" role="alert">{error}</p>}
      {pending && <p role="status">正在处理，请勿关闭页面或重复提交…</p>}
      <div className="cancellation-actions">
        <button type="button" ref={cancelButton} disabled={pending} onClick={onClose}>暂不注销</button>
        <button type="submit" className="cancellation-submit" disabled={pending || !capability || !verified || confirmation !== username || !acknowledged}>{pending ? '处理中…' : '永久注销账号'}</button>
      </div>
    </form>
  </dialog>;
}
