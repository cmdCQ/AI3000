import { getToken } from '../lib/auth.js';

/** Display only the server's current daily quota; never derive it in the browser. */
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
      !(data.pointsLimit === null ? data.pointsRemaining === null :
        nonnegative(data.pointsLimit) && nonnegative(data.pointsRemaining))) {
    throw new Error('额度数据格式错误');
  }
  return data;
}

export function logout() {
  if (!window.confirm('确定退出登录吗？')) return;
  document.cookie = 'sqw_token=; path=/; max-age=0';
  document.cookie = 'sqw_username=; path=/; max-age=0';
  window.location.href = '/';
}
