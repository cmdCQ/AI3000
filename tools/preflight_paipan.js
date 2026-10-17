/**
 * 部署预检（**在容器内**跑）：确认改动后的 paipan 层真能加载、真出值，
 * 且 formatChart 文本里没有 undefined/NaN。
 *
 * 为什么要在容器内跑：线上 require 的是挂载进去的那份，宿主机上跑
 * 只能证明「本地那份没问题」，证明不了容器里加载到的是同一份。
 *
 * 用法：docker cp tools/preflight_paipan.js ai3000-backend:/tmp/ && \
 *       docker exec ai3000-backend node /tmp/preflight_paipan.js
 * 退出码：0 = 通过；1 = 加载失败/取值缺失/文本有 undefined|NaN。
 */
'use strict';

const L = require('/app/paipan/liuyao.js');

// 乾为天初爻动 → 天风姤（与前端 buildLiuyaoAiPayload 同形），求财
const c = L.buildChart({
  benUpper: 1, benLower: 1, bianUpper: 1, bianLower: 5,
  yearGZ: '乙巳', monthGZ: '己丑', dayGZ: '己丑', hourGZ: '己巳',
  topic: '求财',
});

const y = c.yongShen || {};
const fails = [];
const need = (label, v) => {
  if (v === undefined || v === null || v === '') fails.push(label);
  return v;
};

console.log('  事项        ', need('topic', y.topic));
console.log('  用神        ', `${need('primary', y.primary)}(${need('branch', y.branch)}${need('wuxing', y.wuxing)})`);
console.log('  在卦中      ', y.on_chart, '位置', y.position);
console.log('  四神        ', JSON.stringify(c.deep && c.deep.yong_yuan_ji_chou));
console.log('  伏神        ', y.fu_shen ? y.fu_shen.emerge_type : '无（用神已在卦中）');
console.log('  世身        ', y.shi_shen ? `${y.shi_shen.he_zhi} ${y.shi_shen.wang_shuai}` : '无');
console.log('  summary 条数', (c.deep && c.deep.summary || []).length);

const text = L.formatChart(c);
if (!text || !text.includes('【用神】')) fails.push('formatChart 缺【用神】段');
if (/\bundefined\b|NaN/.test(text)) fails.push('formatChart 文本含 undefined/NaN');

// 再压一例**位置名**事项（综合），确认补全路径在容器内也通
const c2 = L.buildChart({
  benUpper: 1, benLower: 1, yearGZ: '乙巳', monthGZ: '己丑', dayGZ: '己丑', hourGZ: '己巳',
  topic: '综合',
});
if (!c2.yongShen || !c2.yongShen.wuxing) fails.push('综合事项未取到用神五行');
console.log('  综合事项用神', `${c2.yongShen.primary}(${c2.yongShen.branch}${c2.yongShen.wuxing})`);

// 来源自证：容器里加载的确实是挂载源，不是镜像里的旧副本
const fs = require('fs');
const src = fs.readFileSync('/app/paipan/liuyao.js', 'utf8');
console.log('  liuyao.js 字节', src.length, '含 yongshen 引用:', src.includes("require('./yongshen')"));
if (!src.includes("require('./yongshen')")) fails.push('容器内 liuyao.js 未引用 yongshen.js（装的是旧版？）');

console.log();
if (fails.length) {
  console.log('❌ 预检失败：' + fails.join('；'));
  process.exit(1);
}
console.log('✅ 预检通过');
