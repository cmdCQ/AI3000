import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, App, Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { api } from './api.js';

const TIER_LABELS = ['普通用户', '普通会员', 'SVIP'];
const tierOptions = TIER_LABELS.map((label, value) => ({ value, label }));

const text = value => value === null || value === undefined || value === '' ? '—' : String(value);
const canonicalUsername = user => user?.username || '';
const tierOf = user => Number.isInteger(user?.tier) ? user.tier : 0;
const numberText = value => value === null || value === undefined || value === '' ? '—' : Number(value).toFixed(4).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
const quotaFor = (user, tiers) => tiers[canonicalUsername(user)] || user || {};

function pointsRule(_, value) {
  if (value === undefined || value === null || value === '') return Promise.reject(new Error('请输入今日已用积分'));
  const raw = String(value).trim();
  if (!/^\d+(?:\.\d{1,4})?$/.test(raw)) return Promise.reject(new Error('请输入非负数，最多 4 位小数'));
  return Promise.resolve();
}

export default function Users() {
  const { message } = App.useApp();
  const [rows, setRows] = useState([]);
  const [tiers, setTiers] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [pointsOpen, setPointsOpen] = useState(false);
  const [tierOpen, setTierOpen] = useState(false);
  const [pointsPending, setPointsPending] = useState(false);
  const [tierPending, setTierPending] = useState(false);
  const [pointsError, setPointsError] = useState('');
  const [tierError, setTierError] = useState('');
  const [pointsForm] = Form.useForm();
  const [tierForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [userData, tierData] = await Promise.all([api.users(), api.tiers()]);
      setRows(Array.isArray(userData) ? userData : userData?.users || []);
      setTiers(tierData?.tiers || tierData || {});
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(user => [canonicalUsername(user), user.phone].some(value => String(value || '').toLowerCase().includes(needle)));
  }, [query, rows]);

  function openPoints(user) {
    const quota = quotaFor(user, tiers);
    setSelected(user);
    setPointsError('');
    pointsForm.setFieldsValue({ pointsUsed: quota.pointsUsed === null || quota.pointsUsed === undefined ? '' : String(quota.pointsUsed) });
    setPointsOpen(true);
  }
  function openTier(user) {
    const quota = quotaFor(user, tiers);
    setSelected(user);
    setTierError('');
    tierForm.setFieldsValue({ tier: tierOf(quota) });
    setTierOpen(true);
  }
  async function savePoints(values) {
    setPointsPending(true); setPointsError('');
    try {
      await api.updatePoints(canonicalUsername(selected), Number(values.pointsUsed));
      message.success('今日积分已更新');
      setPointsOpen(false);
      await load();
    } catch (error) {
      setPointsError(error.message);
    } finally { setPointsPending(false); }
  }
  async function saveTier(values) {
    setTierPending(true); setTierError('');
    try {
      await api.updateTier(canonicalUsername(selected), values.tier);
      message.success('会员等级已更新');
      setTierOpen(false);
      await load();
    } catch (error) {
      setTierError(error.message);
    } finally { setTierPending(false); }
  }

  const columns = [
    { title: '账号', key: 'account', render: (_, user) => <Space direction="vertical" size={0}><Typography.Text strong>{text(canonicalUsername(user))}</Typography.Text><Typography.Text type="secondary">手机：{text(user.phone)}</Typography.Text></Space> },
    { title: '会员等级', key: 'tier', render: (_, user) => <Tag color={tierOf(quotaFor(user, tiers)) === 2 ? 'gold' : 'default'}>{TIER_LABELS[tierOf(quotaFor(user, tiers))] || TIER_LABELS[0]}</Tag> },
    { title: '今日积分', key: 'today', render: (_, user) => { const q = quotaFor(user, tiers); return <Space direction="vertical" size={0}><span>已用：{numberText(q.pointsUsed)}</span><span>上限：{q.tier === 2 && q.pointsLimit === null ? '无限' : numberText(q.pointsLimit)}</span><span>剩余：{q.tier === 2 && q.pointsRemaining === null ? '无限' : numberText(q.pointsRemaining)}</span></Space>; } },
    { title: '累计积分', key: 'total', render: (_, user) => numberText(quotaFor(user, tiers).totalPointsUsed) },
    { title: '注册时间', dataIndex: 'createdAt', render: text },
    { title: '最后活跃', dataIndex: 'lastActive', render: text },
    { title: '操作', key: 'actions', fixed: 'right', render: (_, user) => <Space wrap><Button size="small" onClick={() => openPoints(user)}>今日积分</Button><Button aria-label="调整等级" size="small" icon={<EditOutlined />} onClick={() => openTier(user)}>调整等级</Button><Tooltip title="数据保留范围待确认"><Button size="small" danger disabled>删除用户</Button></Tooltip></Space> },
  ];

  return <>
    <div className="page-title"><div><Typography.Title level={3}>用户管理</Typography.Title><Typography.Text type="secondary">易三千管理后台</Typography.Text></div><Space><Input.Search aria-label="搜索用户" placeholder="搜索账号或手机" allowClear value={query} onChange={event => setQuery(event.target.value)} style={{ width: 240 }} /><Button onClick={load} loading={loading}>刷新</Button></Space></div>
    <Card>{loadError ? <Alert type="error" title={loadError} action={<Button onClick={load}>重试</Button>} /> : <Table rowKey={user => canonicalUsername(user)} loading={loading} columns={columns} dataSource={filteredRows} scroll={{ x: 'max-content' }} pagination={{ pageSize: 20, showSizeChanger: true }} />}</Card>
    <Modal title="调整今日积分" open={pointsOpen} onCancel={() => !pointsPending && setPointsOpen(false)} footer={null} destroyOnHidden>
      {pointsError && <Alert type="error" title={pointsError} style={{ marginBottom: 16 }} />}
      <Form form={pointsForm} layout="vertical" onFinish={savePoints}><Form.Item name="pointsUsed" label="今日已用积分" rules={[{ validator: pointsRule }]}><Input inputMode="decimal" /></Form.Item><Button type="primary" htmlType="submit" loading={pointsPending}>确认保存</Button></Form>
    </Modal>
    <Modal title="调整等级" open={tierOpen} onCancel={() => !tierPending && setTierOpen(false)} footer={null} destroyOnHidden>
      {tierError && <Alert type="error" title={tierError} style={{ marginBottom: 16 }} />}
      <Form form={tierForm} layout="vertical" onFinish={saveTier}><Form.Item name="tier" label="会员等级" rules={[{ required: true, message: '请选择会员等级' }]}><Select virtual={false} options={tierOptions} /></Form.Item><Button type="primary" htmlType="submit" loading={tierPending}>确认保存</Button></Form>
    </Modal>
  </>;
}
