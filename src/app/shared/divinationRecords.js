import { AUTH } from './auth.js';
import { EMOJI_MAP, METHOD_NAMES } from '../lib/recordsHistory.js';
import { formatTime } from './uiCommon.js';

async function requireOk(response) {
  if (!response.ok) {
    const error = new Error('记录请求失败');
    error.status = response.status;
    throw error;
  }
  return response;
}
function headers() {
  const token = AUTH.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
function timestamp(record) {
  const value = record.recordTime || record.created_at;
  return value ? new Date(value).getTime() || 0 : 0;
}
function recordTime(record) {
  const value = record.recordTime || record.created_at;
  if (!record.recordTime && record.divinationTime) return record.divinationTime;
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : formatTime(date).slice(0, -3);
}

/** Keep the existing REST/auth contracts while normalizing the two divination lists. */
export function createDivinationRecords(kind) {
  const listUrl = `/api/${kind}-records`;
  return {
    async loadRecords(signal) {
      const response = await requireOk(await fetch(listUrl, { signal, headers: headers() }));
      const records = await response.json();
      if (!Array.isArray(records)) throw new Error('记录数据格式错误');
      return [...records].sort((a, b) => timestamp(b) - timestamp(a)).map(record => ({
        id: String(record.id), title: record.topic || '(无事项)',
        meta: [METHOD_NAMES[record.method] || record.method, recordTime(record)].filter(Boolean).join(' · '),
        href: `/${kind}/result.html?id=${encodeURIComponent(record.id)}`,
        icon: EMOJI_MAP[record.method] || '☯',
      }));
    },
    async deleteRecord(id) {
      await requireOk(await fetch(`${listUrl}/${encodeURIComponent(id)}`, { method: 'DELETE', headers: headers() }));
    },
  };
}
