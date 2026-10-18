import { getToken } from '../lib/auth.js';

/** Display only the server's current weekly quota and permanent balance; never derive them in the browser. */
export async function loadPointsUsage(signal) {
  const token = getToken();
  if (!token) throw Object.assign(new Error('请重新登录'), { status: 401 });
  const response = await fetch('/api/user/points', {
    headers: { Authorization: 'Bearer ' + token }, signal,
  });
  if (!response.ok) throw Object.assign(new Error('额度加载失败'), { status: response.status });
  const data = await response.json();
  const nonnegative = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  if (!nonnegative(data.pointsUsed) || ![0, 1, 2].includes(data.tier) ||
      !nonnegative(data.permanentPoints) ||
      !(data.pointsLimit === null ? data.pointsRemaining === null :
        nonnegative(data.pointsLimit) && nonnegative(data.pointsRemaining)) ||
      (data.resetAt !== undefined && data.resetAt !== null && (typeof data.resetAt !== 'string' || !data.resetAt))) {
    throw new Error('额度数据格式错误');
  }
  return data;
}

export async function loadCancellationCapability(signal) {
  const token = getToken();
  if (!token) throw Object.assign(new Error('请重新登录'), { status: 401 });
  const response = await fetch('/api/user/account', {
    method: 'GET', headers: { Authorization: 'Bearer ' + token }, signal,
  });
  if (!response.ok) throw Object.assign(new Error(response.status === 401 ? '登录已过期，请重新登录' : '暂时无法确认注销条件，请稍后重试'), { status: response.status });
  const data = await response.json();
  if (data.verificationMethod !== 'password') throw new Error('当前账号暂不支持在线注销，请联系客服处理');
  return data;
}

export async function cancelAccount({ password, confirmation }) {
  const token = getToken();
  if (!token) throw Object.assign(new Error('请重新登录'), { status: 401 });
  const response = await fetch('/api/user/account', {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, confirmation }),
  });
  if (!response.ok) {
    let message = response.status === 401 ? '登录已过期，请重新登录' : response.status === 400 || response.status === 403 ? '密码或账号确认不正确' : '注销失败，请稍后重试';
    try { const data = await response.json(); if (typeof data.error === 'string' && data.error) message = data.error; } catch {}
    throw Object.assign(new Error(message), { status: response.status });
  }
  const data = await response.json().catch(() => null);
  if (data?.ok !== true) throw new Error('注销结果未确认，请刷新账户状态后核实，不要重复提交');
}

export function completeAccountCancellation() {
  document.cookie = 'sqw_token=; path=/; max-age=0';
  document.cookie = 'sqw_username=; path=/; max-age=0';
  // Explicit allowlist: never erase anonymous quota flags, preferences or admin sessions.
  for (const name of ['localStorage', 'sessionStorage']) {
    try {
      for (const key of ['mhys_result', 'sqw_pending_ask', 'sqw_pickerType', 'bazi_pending_aspect']) window[name].removeItem(key);
    } catch { console.warn('账号已注销，但浏览器阻止了本地缓存清理'); }
  }
  window.location.href = '/';
}

export function logout() {
  if (!window.confirm('确定退出登录吗？')) return;
  document.cookie = 'sqw_token=; path=/; max-age=0';
  document.cookie = 'sqw_username=; path=/; max-age=0';
  window.location.href = '/';
}
