import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, App, Button, Card, Form, Grid, Input, List, Modal, Select, Space, Table, Tag, Typography } from 'antd';
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
  const screens = Grid.useBreakpoint();
  const mobile = screens.sm === false;
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
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  function openDelete(user) {
    setDeleteTarget(user); setDeleteConfirmation(''); setDeleteError('');
  }
  async function deleteUser() {
    if (!deleteTarget || deletePending || deleteConfirmation !== canonicalUsername(deleteTarget)) return;
    setDeletePending(true); setDeleteError('');
    try {
      const result = await api.deleteUser(canonicalUsername(deleteTarget));
      if (result?.ok !== true) throw new Error('删除结果未确认，请刷新用户列表核实');
      setDeleteTarget(null); message.success('账号及关联数据已删除'); await load();
    } catch (error) { setDeleteError(error.message); }
    finally { setDeletePending(false); }
  }
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
    { title: '操作', key: 'actions', fixed: 'right', render: (_, user) => <Space wrap><Button size="small" onClick={() => openPoints(user)}>今日积分</Button><Button aria-label="调整等级" size="small" icon={<EditOutlined />} onClick={() => openTier(user)}>调整等级</Button><Button size="small" danger onClick={() => openDelete(user)}>删除用户</Button></Space> },
  ];

  const renderMobileUser = user => {
    const quota = quotaFor(user, tiers);
    const tier = tierOf(quota);
    return <List.Item className="admin-mobile-card" key={canonicalUsername(user)}>
      <div className="mobile-card-header"><Typography.Text strong>{text(canonicalUsername(user))}</Typography.Text><Tag color={tier === 2 ? 'gold' : 'default'}>{TIER_LABELS[tier] || TIER_LABELS[0]}</Tag></div>
      <dl className="mobile-fields">
        <div><dt>手机</dt><dd>{text(user.phone)}</dd></div>
        <div><dt>今日积分</dt><dd>已用 {numberText(quota.pointsUsed)} / 上限 {quota.tier === 2 && quota.pointsLimit === null ? '无限' : numberText(quota.pointsLimit)} / 剩余 {quota.tier === 2 && quota.pointsRemaining === null ? '无限' : numberText(quota.pointsRemaining)}</dd></div>
        <div><dt>累计积分</dt><dd>{numberText(quota.totalPointsUsed)}</dd></div>
        <div><dt>注册时间</dt><dd>{text(user.createdAt)}</dd></div>
        <div><dt>最后活跃</dt><dd>{text(user.lastActive)}</dd></div>
      </dl>
      <Space wrap className="mobile-card-actions"><Button onClick={() => openPoints(user)}>今日积分</Button><Button aria-label="调整等级" icon={<EditOutlined />} onClick={() => openTier(user)}>调整等级</Button><Button danger onClick={() => openDelete(user)}>删除用户</Button></Space>
    </List.Item>;
  };

  return <>
    <div className="page-title"><div><Typography.Title level={3}>用户管理</Typography.Title><Typography.Text type="secondary">易三千管理后台</Typography.Text></div><Space wrap className="admin-toolbar"><Input.Search aria-label="搜索用户" placeholder="搜索账号或手机" allowClear value={query} onChange={event => setQuery(event.target.value)} style={{ width: 240 }} /><Button onClick={load} loading={loading}>刷新</Button></Space></div>
    <Card>{loadError ? <Alert type="error" title={loadError} action={<Button onClick={load}>重试</Button>} /> : mobile ? <List className="admin-mobile-list" loading={loading} dataSource={filteredRows} renderItem={renderMobileUser} locale={{ emptyText: '暂无用户' }} pagination={{ pageSize: 20, size: 'small', showSizeChanger: false, hideOnSinglePage: true }} /> : <Table rowKey={user => canonicalUsername(user)} loading={loading} columns={columns} dataSource={filteredRows} scroll={{ x: 'max-content' }} pagination={{ pageSize: 20, showSizeChanger: true }} />}</Card>
    <Modal className="admin-mobile-modal" title="永久删除用户" open={Boolean(deleteTarget)} onCancel={() => !deletePending && setDeleteTarget(null)} onOk={deleteUser} okText="永久删除" cancelText="取消" confirmLoading={deletePending} closable={!deletePending} maskClosable={!deletePending} keyboard={!deletePending} cancelButtonProps={{disabled:deletePending}} okButtonProps={{'aria-label':'永久删除',danger:true,disabled:deletePending || deleteConfirmation !== canonicalUsername(deleteTarget)}}>
      <Alert type="warning" title="此操作不可恢复" description="将永久删除账号及其命盘、梅花/六爻卦例、聊天、八字咨询、建议与积分用量，不保留业务数据。" />
      <p>请输入账号 <strong>{canonicalUsername(deleteTarget)}</strong> 确认删除：</p>
      <Input aria-label="确认删除账号" value={deleteConfirmation} disabled={deletePending} onChange={event => setDeleteConfirmation(event.target.value)} autoComplete="off" />
      {deleteError && <Alert type="error" title={deleteError} />}
    </Modal>
    <Modal className="admin-mobile-modal" title="调整今日积分" open={pointsOpen} onCancel={() => !pointsPending && setPointsOpen(false)} footer={null} destroyOnHidden>
      {pointsError && <Alert type="error" title={pointsError} style={{ marginBottom: 16 }} />}
      <Form form={pointsForm} layout="vertical" onFinish={savePoints}><Form.Item name="pointsUsed" label="今日已用积分" rules={[{ validator: pointsRule }]}><Input inputMode="decimal" /></Form.Item><Button type="primary" htmlType="submit" loading={pointsPending}>确认保存</Button></Form>
    </Modal>
    <Modal className="admin-mobile-modal" title="调整等级" open={tierOpen} onCancel={() => !tierPending && setTierOpen(false)} footer={null} destroyOnHidden>
      {tierError && <Alert type="error" title={tierError} style={{ marginBottom: 16 }} />}
      <Form form={tierForm} layout="vertical" onFinish={saveTier}><Form.Item name="tier" label="会员等级" rules={[{ required: true, message: '请选择会员等级' }]}><Select virtual={false} options={tierOptions} /></Form.Item><Button type="primary" htmlType="submit" loading={tierPending}>确认保存</Button></Form>
    </Modal>
  </>;
}
