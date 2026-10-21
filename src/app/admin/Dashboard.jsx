import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, Empty, Grid, List, Space, Spin, Statistic, Table, Tag, Typography } from 'antd';
import { api } from './api.js';
import { timeMinuteText } from './format.js';

const tierLabels = ['普通用户', '普通会员', 'SVIP'];
const statItems = [
  ['users', '总用户'],
  ['todayUsers', '今日新增'],
  ['active7d', '7 天活跃'],
  ['charts', '命盘总数'],
  ['divinations', '排卦总数'],
  ['totalPoints', '累计积分消耗'],
  ['points7d', '近七天积分消耗'],
  // 2026-10-20 用户要求：仪表盘要看得到 token 用量本身，而不只是折合出来的积分。
  // 这里用**原始** token（与 DeepSeek 控制台一致）；命中缓存的那部分只按 1/10 计费，
  // 折算后的「计费 token」不展示 —— 展示它反而会让人以为上游统计少了。
  ['rawTokens', '累计 token 用量'],
  ['rawTokens7d', '近七天 token 用量'],
];

// 统一走 format.js（北京时间、毫秒时间戳格式化）。
const dateText = timeMinuteText;

function tierOf(user) {
  return Number.isInteger(user?.tier) ? user.tier : 0;
}

export default function Dashboard() {
  const screens = Grid.useBreakpoint();
  const mobile = screens.sm === false;
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const version = useRef(0);

  async function load() {
    const current = ++version.current;
    setLoading(true);
    setError('');
    try {
      const [stats, userData] = await Promise.all([api.stats(), api.users()]);
      if (current !== version.current) return;
      if (!stats?.total || typeof stats.total !== 'object') throw new Error('统计数据格式错误');
      const list = Array.isArray(userData) ? userData : userData?.users;
      if (!Array.isArray(list)) throw new Error('用户数据格式错误');
      setData(stats);
      setUsers(list);
    } catch (e) {
      if (current === version.current) setError(e.message || '仪表盘加载失败');
    } finally {
      if (current === version.current) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    return () => { version.current += 1; };
  }, []);

  const recentUsers = useMemo(() => [...users].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5), [users]);
  const tierCounts = useMemo(() => tierLabels.map((label, tier) => ({
    key: tier,
    tier: label,
    count: users.filter(user => tierOf(user) === tier).length,
  })), [users]);
  const total = data?.total || {};
  const recentColumns = [
    { title: '账号', dataIndex: 'username', render: (value, user) => value || user.phone || '—' },
    { title: '会员等级', render: (_, user) => <Tag color={tierOf(user) === 2 ? 'gold' : 'default'}>{tierLabels[tierOf(user)]}</Tag> },
    { title: '注册时间', dataIndex: 'createdAt', render: dateText },
  ];

  if (error) return <Alert type="error" title={error} action={<Button onClick={load}>重试</Button>} />;

  return <>
    <div className="page-title">
      <Typography.Title level={3}>仪表盘</Typography.Title>
      <Button onClick={load} loading={loading}>刷新</Button>
    </div>
    <Spin spinning={loading}>
      <div className="stat-grid">
        {statItems.map(([key, title]) => <Card key={key}><Statistic title={title} value={total[key] ?? '—'} precision={key === 'totalPoints' || key === 'points7d' ? 4 : 0} groupSeparator="," /></Card>)}
      </div>
      <div className="admin-dashboard-panels">
        <Card title="会员等级分布">
          <Table size="small" rowKey="key" pagination={false} dataSource={tierCounts} columns={[
            { title: '等级', dataIndex: 'tier' },
            { title: '用户数', dataIndex: 'count' },
          ]} />
        </Card>
        <Card title="最近注册用户">
          {mobile ? <List
            className="admin-mobile-list"
            dataSource={recentUsers}
            locale={{ emptyText: <Empty description="暂无用户" /> }}
            renderItem={user => <List.Item className="admin-mobile-card">
              <div className="mobile-card-header"><Typography.Text strong>{user.username || user.phone || '—'}</Typography.Text><Tag color={tierOf(user) === 2 ? 'gold' : 'default'}>{tierLabels[tierOf(user)]}</Tag></div>
              <div className="mobile-fields"><div><dt>注册时间</dt><dd>{dateText(user.createdAt)}</dd></div></div>
            </List.Item>}
          /> : <Table size="small" rowKey={(user, index) => user.username || user.phone || index} pagination={false} dataSource={recentUsers} columns={recentColumns} />}
        </Card>
      </div>
    </Spin>
  </>;
}
