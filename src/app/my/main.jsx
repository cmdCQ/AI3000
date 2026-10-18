import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../shared/authModalStyles.js';
import { openAuthModal } from '../shared/auth.js';
import { getUsername } from '../lib/auth.js';
import { loadPointsUsage, logout } from './my.logic.js';
import AccountCancellation from './AccountCancellation.jsx';
import './style.css';

const formatPoints = value => value.toLocaleString('zh-CN', { maximumFractionDigits: 4 });
const tierNames = ['普通用户', '普通会员', 'SVIP'];

function LoginPrompt({ expired = false }) {
  return <div className="mc-empty">
    <div className="empty-icon" aria-hidden="true">🔒</div>
    <h1 className="empty-title">{expired ? '登录已过期' : '登录后查看账户'}</h1>
    <p className="empty-desc">{expired ? '请重新登录后查看账户与额度' : '查看账户信息与今日额度，管理你的使用记录'}</p>
    <button className="empty-btn" onClick={() => openAuthModal('login')}>{expired ? '重新登录' : '去登录'}</button>
  </div>;
}

function QuotaCard({ data }) {
  const unlimited = data.pointsLimit === null;
  return <section className="account-card quota-card" aria-labelledby="quotaTitle">
    <h2 id="quotaTitle">今日额度</h2>
    <div className="quota-balance"><strong>{unlimited ? '不限量' : formatPoints(data.pointsRemaining)}</strong>{!unlimited && <span>积分可用</span>}</div>
    <dl className="quota-details">
      <div><dt>今日已用</dt><dd>{formatPoints(data.pointsUsed)} 积分</dd></div>
      <div><dt>每日额度</dt><dd>{unlimited ? '不限量' : formatPoints(data.pointsLimit) + ' 积分'}</dd></div>
    </dl>
    {!unlimited && <p className="quota-note">北京时间每日 0 点刷新额度</p>}
  </section>;
}

function MyPage() {
  const [username] = useState(getUsername);
  const [phase, setPhase] = useState(username ? 'loading' : 'guest');
  const [data, setData] = useState(null);
  const [revision, setRevision] = useState(0);
  const [settings, setSettings] = useState(false);
  const [cancellation, setCancellation] = useState(false);
  useEffect(() => {
    if (!username) return;
    const controller = new AbortController();
    setPhase('loading');
    loadPointsUsage(controller.signal).then(value => {
      if (!controller.signal.aborted) { setData(value); setPhase('ready'); }
    }).catch(error => {
      if (!controller.signal.aborted) setPhase(error.status === 401 ? 'expired' : 'error');
    });
    return () => controller.abort();
  }, [username, revision]);
  const authorized = !['guest', 'expired'].includes(phase);
  return <>
    <main className="mc-page account-page">
      {authorized && <header className="account-header">
        {settings && <button className="account-back" onClick={() => setSettings(false)}>← 返回</button>}
        <h1>{settings ? '设置' : '我的'}</h1>
      </header>}
      <div id="myContent" aria-busy={phase === 'loading'}>
        {!authorized ? <LoginPrompt expired={phase === 'expired'} /> : settings ?
          <section className="account-card account-menu" aria-label="账号管理">
            <button className="account-row" onClick={() => setCancellation(true)}>注销账号<span aria-hidden="true">›</span></button>
            <button className="account-row logout-row" onClick={logout}>退出账号<span aria-hidden="true">›</span></button>
          </section> : <>
            <section className="account-card account-profile" aria-label="账户信息">
              <span className="account-avatar" aria-hidden="true">👤</span>
              <div><p className="account-name">{username}</p><p className="account-tier">{data && phase === 'ready' ? tierNames[data.tier] : '我的账户'}</p></div>
            </section>
            {phase === 'loading' && <div className="account-status" role="status">正在加载今日额度…</div>}
            {phase === 'error' && <section className="account-card account-error" role="alert"><p>额度加载失败，请稍后重试</p><button onClick={() => setRevision(value => value + 1)}>重试</button></section>}
            {phase === 'ready' && <QuotaCard data={data} />}
            <section className="account-card account-menu" aria-label="账户设置"><button className="account-row" onClick={() => setSettings(true)}>设置<span aria-hidden="true">›</span></button></section>
          </>}
      </div>
    </main>
    {authorized && cancellation && <AccountCancellation username={username} onClose={() => setCancellation(false)} />}
    <nav className="mc-bottom-nav" aria-label="主导航">
      <a className="mc-nav-item" href="/">命理与术数</a>
      <a className="mc-nav-item" href="/my-charts/">我的命盘</a>
      <a className="mc-nav-item active" href="/my/" aria-current="page">我的</a>
    </nav>
  </>;
}

createRoot(document.getElementById('root')).render(<MyPage />);
