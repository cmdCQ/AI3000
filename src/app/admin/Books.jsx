import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Drawer, Form, Input, Modal, Select, Space, Table, Tag, Typography, App } from 'antd';
import { api, request } from './api.js';

const categories = Object.entries({bazi:'四柱八字',ziwei:'紫微斗数',meihua:'梅花易数',liuyao:'六爻',qimen:'奇门遁甲',yijing:'易经（通用）',liuren:'六壬',fengshui:'风水',xiangshu:'相术',general:'通用术数'}).map(([value,label])=>({value,label}));
const statuses = {pending:'待入库', ingested:'已入库', error:'入库失败'};

export default function Books() {
  const { message } = App.useApp();
  const [rows,setRows]=useState([]), [loading,setLoading]=useState(false), [error,setError]=useState('');
  const [category,setCategory]=useState(), [folder,setFolder]=useState(''), [folders,setFolders]=useState([]);
  const [editor,setEditor]=useState(null), [editorError,setEditorError]=useState(''), [saving,setSaving]=useState(false);
  const [deleting,setDeleting]=useState(null), [deletePending,setDeletePending]=useState(false), [deleteError,setDeleteError]=useState('');
  const [ingesting,setIngesting]=useState(null), [batchPending,setBatchPending]=useState(false), [batchOpen,setBatchOpen]=useState(false);
  const [form]=Form.useForm();
  const listVersion=useRef(0),editVersion=useRef(0);
  const [folderError,setFolderError]=useState('');
  async function load() {
    const version=++listVersion.current;
    setLoading(true);setError('');
    try {
      const query=new URLSearchParams(); if(category)query.set('category',category);if(folder)query.set('folder',folder);
      const data=await api.books(query.size?'?'+query:'');
      if(!Array.isArray(data))throw new Error('书籍列表格式错误');
      if(version===listVersion.current)setRows(data);
    } catch(e){if(version===listVersion.current)setError(e.message)} finally {if(version===listVersion.current)setLoading(false)}
  }
  useEffect(()=>{load();return()=>{listVersion.current++}},[category,folder]);
  useEffect(()=>{let active=true;api.folders().then(data=>{if(active)setFolders(Array.isArray(data)?data:[])}).catch(e=>{if(active)setFolderError(e.message)});return()=>{active=false;editVersion.current++}},[]);
  async function edit(book) {
    const version=++editVersion.current;
    setEditorError('');setEditor({loading:true});
    try {
      const data=book?await api.book(book.id):{title:'',category:'bazi',folder:'',author:'',description:'',content:''};
      if(version===editVersion.current){form.resetFields();form.setFieldsValue(data);setEditor(data)}
    } catch(e){if(version===editVersion.current){setEditorError(e.message);setEditor({failed:true})}}
  }
  async function save(values) {
    setSaving(true);setEditorError('');
    try {
      await request(editor.id?`/books/${encodeURIComponent(editor.id)}`:'/books',{method:editor.id?'PATCH':'POST',body:JSON.stringify(values)});
      setEditor(null);message.success('书籍已保存');await load();
    } catch(e){setEditorError(e.message)}finally{setSaving(false)}
  }
  async function remove() {
    setDeletePending(true);setDeleteError('');
    try{await request(`/books/${encodeURIComponent(deleting.id)}`,{method:'DELETE'});setDeleting(null);message.success('书籍已删除');await load()}
    catch(e){setDeleteError(e.message)}finally{setDeletePending(false)}
  }
  async function ingest(book) {
    setIngesting(book.id);
    try {await request(`/books/ingest/${encodeURIComponent(book.id)}`,{method:'POST'});message.success('该书入库完成');await load()}
    catch(e){message.error(e.message);await load()}finally{setIngesting(null)}
  }
  async function batch() {
    setBatchPending(true);
    try{await request('/books/ingest-all',{method:'POST'});setBatchOpen(false);message.info('后台已接受批量入库，请点击刷新查看书籍状态；当前接口不提供任务进度。')}
    catch(e){message.error(e.message)}finally{setBatchPending(false)}
  }
  const columns=[
    {title:'书名',dataIndex:'title',render:(_,b)=><Button type="link" onClick={()=>edit(b)}>{b.title||'未命名'}</Button>},
    {title:'分类',dataIndex:'category',render:v=>categories.find(c=>c.value===v)?.label||v},
    {title:'文件夹',dataIndex:'folder',render:v=>v||'—'},
    {title:'作者',dataIndex:'author',render:v=>v||'—'},
    {title:'入库状态',dataIndex:'status',render:v=><Tag color={v==='ingested'?'success':v==='error'?'error':'default'}>{statuses[v]||v||'未知'}</Tag>},
    {title:'分块数',dataIndex:'chunksCount'},
    {title:'操作',fixed:'right',render:(_,b)=><Space wrap>
      <Button onClick={()=>edit(b)}>编辑</Button>
      {b.hasContent && b.status!=='ingested' && <Button loading={ingesting===b.id} disabled={ingesting!==null && ingesting!==b.id} onClick={()=>ingest(b)}>入库</Button>}
      <Button danger onClick={()=>{setDeleting(b);setDeleteError('')}}>删除</Button>
    </Space>},
  ];
  return <>
    <div className="page-title"><Typography.Title level={3}>参考书籍</Typography.Title><Space wrap>
      <Button onClick={()=>load()} loading={loading}>刷新</Button><Button onClick={()=>setBatchOpen(true)}>批量入库</Button><Button type="primary" onClick={()=>edit(null)}>添加书籍</Button>
    </Space></div>
    <Card>{folderError&&<Alert type="warning" title={`文件夹筛选暂不可用：${folderError}`} style={{marginBottom:16}}/>}<Space wrap style={{marginBottom:16}}>
      <Select aria-label="筛选分类" placeholder="全部分类" allowClear value={category} onChange={setCategory} options={categories} style={{width:160}} />
      <Select aria-label="筛选文件夹" placeholder="全部文件夹" allowClear value={folder||undefined} onChange={v=>setFolder(v||'')} options={folders.map(f=>({value:f.name,label:f.name}))} style={{width:180}} />
    </Space>
    {error?<Alert type="error" title={error} action={<Button onClick={load}>重试</Button>}/>:<Table rowKey="id" dataSource={rows} columns={columns} loading={loading} scroll={{x:'max-content'}} pagination={{pageSize:20}}/>}</Card>
    <Drawer title={editor?.id?'编辑书籍':'添加书籍'} width={640} open={editor!==null} onClose={()=>{if(!saving){editVersion.current++;setEditor(null)}}} destroyOnHidden>
      {editorError&&<Alert type="error" title={editorError} style={{marginBottom:16}}/>}
      {editor?.loading?<Typography.Text>加载中…</Typography.Text>:!editor?.failed&&<Form form={form} layout="vertical" onFinish={save}>
        <Form.Item name="title" label="书名" rules={[{required:true,whitespace:true,message:'请输入书名'}]}><Input/></Form.Item>
        <Form.Item name="category" label="分类" rules={[{required:true}]}><Select options={categories}/></Form.Item>
        <Form.Item name="folder" label="文件夹"><Input/></Form.Item>
        <Form.Item name="author" label="作者"><Input/></Form.Item>
        <Form.Item name="description" label="简介"><Input.TextArea rows={3}/></Form.Item>
        <Form.Item name="content" label="正文"><Input.TextArea rows={12}/></Form.Item>
        <Button type="primary" htmlType="submit" loading={saving}>保存书籍</Button>
      </Form>}
    </Drawer>
    <Modal title="删除书籍" open={Boolean(deleting)} onCancel={()=>!deletePending&&setDeleting(null)} onOk={remove} confirmLoading={deletePending} okText="确认删除" cancelText="取消" okButtonProps={{danger:true}}>
      <p>删除《{deleting?.title}》后不可恢复。本操作不承诺清理外部向量库索引。</p>{deleteError&&<Alert type="error" title={deleteError}/>}</Modal>
    <Modal title="批量入库" open={batchOpen} onCancel={()=>!batchPending&&setBatchOpen(false)} onOk={batch} confirmLoading={batchPending} okText="确认开始" cancelText="取消">
      <p>将调用现有后台入库任务。接口仅确认接受，不提供任务进度；请勿重复启动。</p>
    </Modal>
  </>;
}
