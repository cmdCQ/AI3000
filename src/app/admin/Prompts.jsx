import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Input, Select, Space, Tag, Typography, message } from 'antd';
import { DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { api, request } from './api.js';

const promptLabelMap = {
  mhys_system: '梅花易数 · 系统提示词',
  mhys_prompt: '梅花易数 · 用户提示词（有事项）',
  mhys_notopic: '梅花易数 · 无事项回复',
  mhys_followup: '梅花易数 · 追问回复',
  liuyao_system: '六爻 · 系统提示词',
  liuyao_prompt: '六爻 · 用户提示词（有事项）',
  liuyao_notopic: '六爻 · 无事项回复',
  liuyao_followup: '六爻 · 追问回复',
};

const promptVarHints = {
  mhys: '可用变量：{{topic}} {{benGuaName}} {{benGuaUpper}} {{benGuaLower}} {{huGuaName}} {{huGuaUpper}} {{huGuaLower}} {{bianGuaName}} {{bianGuaUpper}} {{bianGuaLower}} {{cuoGuaName}} {{cuoGuaUpper}} {{cuoGuaLower}} {{zongGuaName}} {{zongGuaUpper}} {{zongGuaLower}} {{tiName}} {{tiElement}} {{yongName}} {{yongElement}} {{tiyongVerdict}} {{tiyongDesc}} {{movingYao}} {{ragContext}} {{followUp}} {{context}}',
  liuyao: '可用变量：{{topic}} {{gender}} {{benGuaName}} {{benGuaUpper}} {{benGuaLower}} {{bianGuaName}} {{bianGuaUpper}} {{bianGuaLower}} {{ragContext}} {{followUp}} {{context}}',
};

const groups = [
  { label: '🌸 梅花易数', prefix: 'mhys' },
  { label: '⚡ 六爻', prefix: 'liuyao' },
];

function normalizeRows(data) {
  if (Array.isArray(data)) return data;
  return Object.entries(data || {}).map(([key, value]) => ({ key, value }));
}

function effectiveValue(row) {
  return row.isCustom ? (row.customValue ?? '') : (row.defaultValue ?? row.value ?? '');
}

function rowLabel(key) {
  return promptLabelMap[key] || key;
}

export default function Prompts() {
  const [resource, setResource] = useState({ loading: true, error: '', rows: [] });
  const [selectedKey, setSelectedKey] = useState('');
  const [drafts, setDrafts] = useState({});
  const [baseline, setBaseline] = useState({});
  const [saving, setSaving] = useState({});

  const load = async () => {
    setResource(current => ({ ...current, loading: true, error: '' }));
    try {
      const rows = normalizeRows(await api.prompts());
      const values = Object.fromEntries(rows.map(row => [row.key, effectiveValue(row)]));
      setResource({ loading: false, error: '', rows });
      setBaseline(values);
      setDrafts(current => Object.fromEntries(Object.entries(current).filter(([key]) => key in values)));
      setSelectedKey(current => current || rows[0]?.key || '');
    } catch (error) {
      setResource(current => ({ ...current, loading: false, error: error.message || '加载失败' }));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selected = resource.rows.find(row => row.key === selectedKey);
  const value = selected ? (drafts[selected.key] ?? baseline[selected.key] ?? effectiveValue(selected)) : '';
  const dirtyKeys = useMemo(() => Object.keys(drafts).filter(key => drafts[key] !== baseline[key]), [drafts, baseline]);
  const dirty = dirtyKeys.length > 0;

  useEffect(() => {
    const beforeNavigate = event => {
      if ((dirty || Object.values(saving).some(Boolean)) && !window.confirm('有未保存或正在保存的 Prompt，确定离开？')) event.preventDefault();
    };
    window.addEventListener('admin:before-navigate', beforeNavigate);
    return () => window.removeEventListener('admin:before-navigate', beforeNavigate);
  }, [dirty, saving]);

  useEffect(() => {
    const beforeUnload = event => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '有未保存的 Prompt 修改';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  const updateDraft = nextValue => setDrafts(current => ({ ...current, [selectedKey]: nextValue }));

  async function save(row = selected) {
    if (!row) return;
    const key = row.key;
    const nextValue = drafts[key] ?? baseline[key] ?? effectiveValue(row);
    setSaving(current => ({ ...current, [key]: true }));
    try {
      await api.updatePrompt(key, nextValue);
      setBaseline(current => ({ ...current, [key]: nextValue }));
      setDrafts(current => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      setResource(current => ({ ...current, rows: current.rows.map(item => item.key === key ? { ...item, isCustom: true, customValue: nextValue } : item) }));
      message.success('Prompt 已保存');
    } catch (error) {
      message.error(error.message || '保存失败');
    } finally {
      setSaving(current => ({ ...current, [key]: false }));
    }
  }

  async function reset(row = selected) {
    if (!row || !row.isCustom) return;
    const key = row.key;
    if (!window.confirm(`确定恢复「${rowLabel(key)}」为默认模板吗？`)) return;
    setSaving(current => ({ ...current, [key]: true }));
    try {
      await request(`/prompts/${encodeURIComponent(key)}`, { method: 'DELETE' });
      const nextValue = row.defaultValue ?? '';
      setBaseline(current => ({ ...current, [key]: nextValue }));
      setDrafts(current => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      setResource(current => ({ ...current, rows: current.rows.map(item => item.key === key ? { ...item, isCustom: false, customValue: null } : item) }));
      message.success('已恢复默认模板');
    } catch (error) {
      message.error(error.message || '重置失败');
    } finally {
      setSaving(current => ({ ...current, [key]: false }));
    }
  }

  if (resource.error) return <Card><Typography.Paragraph type="danger">{resource.error}</Typography.Paragraph><Button onClick={load}>重试</Button></Card>;

  return <>
    <div className="page-title"><div><Typography.Title level={3}>Prompt管理</Typography.Title><Typography.Text type="secondary">易三千管理后台</Typography.Text></div>{dirty && <Tag color="orange">有未保存修改</Tag>}</div>
    <Card loading={resource.loading} title="Prompt模板">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Select virtual={false} aria-label="选择 Prompt 模板" value={selectedKey || undefined} onChange={setSelectedKey} placeholder="请选择模板" style={{ width: '100%' }} options={groups.map(group => ({ label: group.label, options: resource.rows.filter(row => row.key.startsWith(`${group.prefix}_`)).map(row => ({ value: row.key, label: rowLabel(row.key) })) })).filter(group => group.options.length)} />
        {selected && <>
          <Space wrap><Typography.Text strong>{rowLabel(selected.key)}</Typography.Text><Tag color={selected.isCustom ? 'blue' : 'default'}>{selected.isCustom ? '已自定义' : '默认模板'}</Tag>{dirtyKeys.includes(selected.key) && <Tag color="orange">未保存</Tag>}</Space>
          <Input.TextArea aria-label="Prompt内容" rows={selected.key.endsWith('_prompt') ? 14 : 8} value={value} disabled={Boolean(saving[selected.key])} onChange={event => updateDraft(event.target.value)} />
          <Typography.Text type="secondary">{promptVarHints[selected.key.startsWith('mhys') ? 'mhys' : 'liuyao']}</Typography.Text>
          <Space>
            <Button aria-label="保存" type="primary" icon={<SaveOutlined />} loading={Boolean(saving[selected.key])} disabled={!dirtyKeys.includes(selected.key)} onClick={() => save(selected)}>保存</Button>
            {selected.isCustom && <Button aria-label="恢复默认" danger icon={<DeleteOutlined />} loading={Boolean(saving[selected.key])} onClick={() => reset(selected)}>恢复默认</Button>}
          </Space>
        </>}
      </Space>
    </Card>
  </>;
}
