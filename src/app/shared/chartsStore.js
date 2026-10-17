// 命盘存储（MySQL API）—— 阶段 4 cut-over 从 `src/web/js/charts-store.js` 搬来。
// 函数体与老文件**逐字相同**，只做了两件搬家必须做的事：
//   1. 老文件靠全局 `AUTH.getToken()` 取 token → 改成 import `src/app/lib/auth.js` 的 `getToken()`
//      （同一个 cookie、同一套读法，`lib/auth.js` 头注释写明「读法逐字对齐」）
//   2. 老文件末尾 `window.ChartsStore = ChartsStore` → 改成 `export const ChartsStore`
import { getToken } from '../lib/auth.js'

export const ChartsStore = (() => {
  'use strict';

  function token() {
    return getToken();
  }

  function headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token(),
    };
  }

  /** 获取所有命盘 */
  async function getAll() {
    const res = await fetch('/api/charts', { headers: headers() });
    if (!res.ok) {
      throw { status: res.status, message: res.status === 401 ? '登录已过期，请重新登录' : '获取命盘失败' };
    }
    return await res.json();
  }

  /** 根据 id 获取 */
  async function get(id) {
    const res = await fetch('/api/charts/' + id, { headers: headers() });
    if (!res.ok) return null;
    return await res.json();
  }

  /** 添加命盘 */
  async function add(data) {
    const res = await fetch('/api/charts', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('保存失败');
    return await res.json();
  }

  /** 更新命盘 */
  async function update(id, data) {
    const res = await fetch('/api/charts/' + id, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || '更新失败');
    }
    return await res.json();
  }

  /** 删除命盘 */
  async function remove(id) {
    const res = await fetch('/api/charts/' + id, {
      method: 'DELETE',
      headers: headers(),
    });
    if (!res.ok) throw new Error('删除失败');
  }

  return { getAll, get, add, update, remove };
})();
