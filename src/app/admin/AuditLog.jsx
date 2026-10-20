import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Grid, Input, List, Space, Table, Tabs, Tag, Typography } from 'antd';
import { api } from './api.js';
import { timeText } from './format.js';

// 「审计日志」= 管理员对用户做过什么、为什么。
// 两个只追加的台账并排放：积分发放（points_permanent_ledger）与等级变更（user_tier_ledger）。
// 这里**只读**：台账是证据，不提供改和删的入口 —— 要纠正就再记一笔新的。
const TIER_LABELS = ['普通用户', '普通会员', 'SVIP'];

// 时间格式化统一走 format.js（北京时间）。


function numberText(value, digits = 4) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  const text = Number(value).toFixed(digits);
  // 只从小数点后去尾零：早先写成 `replace(/\.?0+$/, '')`，把 1000000000000 也削成了
  // 「1」（整数的尾零被当成小数尾零），于是「加了 2 亿分」显示成「≈ 1 token」。
  const trimmed = text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text;
  const [whole, fraction] = trimmed.split('.');
  const withSeparators = Number(whole).toLocaleString('zh-CN');
  return fraction ? `${withSeparators}.${fraction}` : withSeparators;
}

export default function AuditLog() {
  const screens = Grid.useBreakpoint();
  const mobile = screens.sm === false;
  const [kind, setKind] = useState('points');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [who, setWho] = useState('');

  const load = useCallback(async (nextKind = kind, nextWho = who) => {
    setLoading(true); setError('');
    try {
      const data = await api.auditLog(nextKind, nextWho.trim(), 100, 0);
      setItems(data?.items || []);
    } catch (e) {
      setError(e.message);
      setItems([]);
    } finally { setLoading(false); }
  }, [kind, who]);

  useEffect(() => { load(kind, who); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [kind]);

  const common = [
    { title: '时间', key: 'createdAt', width: 180, render: (_, row) => timeText(row.createdAt) },
    { title: '用户', key: 'username', width: 160, render: (_, row) => <Typography.Text code>{row.username}</Typography.Text> },
    { title: '理由', key: 'reason', render: (_, row) => row.reason || '—' },
    { title: '操作人', key: 'adminUsername', width: 140, render: (_, row) => row.adminUsername || '—' },
  ];
  const columns = kind === 'points'
    ? [
      common[0], common[1],
      { title: '增加积分', key: 'points', width: 120, render: (_, row) => <Tag color="green">+{numberText(row.points)}</Tag> },
      { title: '折合 token', key: 'tokens', width: 130, render: (_, row) => numberText(row.tokens, 0) },
      common[2], common[3],
    ]
    : [
      common[0], common[1],
      {
        title: '等级变更', key: 'tier', width: 200,
        render: (_, row) => <Space size={4}><Tag>{TIER_LABELS[row.oldTier] ?? row.oldTier}</Tag><span>→</span><Tag color={row.newTier === 2 ? 'gold' : 'blue'}>{TIER_LABELS[row.newTier] ?? row.newTier}</Tag></Space>,
      },
      common[2], common[3],
    ];

  function renderItem(row) {
    return <List.Item className="audit-item">
      <div className="audit-item-head">
        <Typography.Text code>{row.username}</Typography.Text>
        <Typography.Text type="secondary">{timeText(row.createdAt)}</Typography.Text>
      </div>
      <div className="audit-item-change">
        {kind === 'points'
          ? <Space size={6}><Tag color="green">+{numberText(row.points)}</Tag><span>≈ {numberText(row.tokens, 0)} token</span></Space>
          : <Space size={4}><Tag>{TIER_LABELS[row.oldTier] ?? row.oldTier}</Tag><span>→</span><Tag color={row.newTier === 2 ? 'gold' : 'blue'}>{TIER_LABELS[row.newTier] ?? row.newTier}</Tag></Space>}
      </div>
      <div className="audit-item-reason">{row.reason || '—'}</div>
      <Typography.Text type="secondary">操作人：{row.adminUsername || '—'}</Typography.Text>
    </List.Item>;
  }

  return <>
    <div className="page-title">
      <div>
        <Typography.Title level={3}>审计日志</Typography.Title>
        <Typography.Text type="secondary">管理员对用户做过什么、为什么 —— 只追加，不可修改与删除</Typography.Text>
      </div>
      <Space wrap className="admin-toolbar">
        <Input.Search aria-label="按用户筛选" placeholder="按用户筛选" allowClear value={who} onChange={e => setWho(e.target.value)} onSearch={() => load(kind, who)} style={{ width: 200 }} />
        <Button onClick={() => load(kind, who)} loading={loading}>刷新</Button>
      </Space>
    </div>
    <Card>
      {error && <Alert type="error" title={error} style={{ marginBottom: 16 }} action={<Button onClick={() => load(kind, who)}>重试</Button>} />}
      <Tabs
        activeKey={kind}
        onChange={setKind}
        items={[
          { key: 'points', label: '积分变动' },
          { key: 'tier', label: '等级变更' },
        ]}
      />
      {mobile
        ? <List
          loading={loading}
          dataSource={items}
          renderItem={renderItem}
          pagination={{ pageSize: 20, size: 'small', showSizeChanger: false, hideOnSinglePage: true }}
          locale={{ emptyText: kind === 'points' ? '还没有发放过永久积分' : '还没有改过用户等级' }}
        />
        : <Table
          rowKey={(row, index) => `${kind}-${row.id ?? row.requestId ?? index}`}
          loading={loading}
          columns={columns}
          dataSource={items}
          size="middle"
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 20, showSizeChanger: true, hideOnSinglePage: true }}
          locale={{ emptyText: kind === 'points' ? '还没有发放过永久积分' : '还没有改过用户等级' }}
        />}
    </Card>
  </>;
}
