import React, {useEffect,useRef,useState} from 'react';
import {Alert,Button,Card,Empty,Grid,Input,List,Modal,Select,Space,Table,Tag,Typography} from 'antd';
import {api,request} from './api.js';
const identity=u=>u.userId||u.username||u.id;
const displayDate=v=>v?new Date(v).toLocaleString('zh-CN',{hour12:false}):'—';

export default function Records({kind}) {
  const screens=Grid.useBreakpoint();
  const mobile=screens.sm===false;
  const [groups,setGroups]=useState([]),[records,setRecords]=useState([]),[current,setCurrent]=useState(null);
  const [loading,setLoading]=useState(false),[error,setError]=useState(''),[search,setSearch]=useState(''),[type,setType]=useState();
  const [target,setTarget]=useState(null),[deleting,setDeleting]=useState(false),[deleteError,setDeleteError]=useState('');
  const version=useRef(0);
  const title={charts:'命盘管理',divination:'占卜管理',suggestions:'建议管理'}[kind];
  async function load() {
    const run=++version.current;setLoading(true);setError('');
    try {
      const data=current?await ({charts:api.chartRecords,divination:api.divinationRecords,suggestions:api.suggestionDetail}[kind])(current):await api[kind]();
      if(!Array.isArray(data))throw new Error('记录数据格式错误');
      if(run===version.current){if(current)setRecords(data);else setGroups(data)}
    }catch(e){if(run===version.current)setError(e.message)}finally{if(run===version.current)setLoading(false)}
  }
  useEffect(()=>{setRecords([]);setSearch('');setType(undefined);load();return()=>{version.current++}},[kind,current]);
  async function remove() {
    setDeleting(true);setDeleteError('');
    const path=kind==='charts'?'charts':target.type==='liuyao'?'liuyao-records':'mhys-records';
    try{await request(`/${path}/${encodeURIComponent(target.id)}`,{method:'DELETE'});setTarget(null);await load()}
    catch(e){setDeleteError(e.message)}finally{setDeleting(false)}
  }
  const groupColumns=[{title:'用户',render:(_,u)=><Button type="link" onClick={()=>setCurrent(identity(u))}>{identity(u)}</Button>},
    {title:'记录数',render:(_,u)=>u.count??((u.mhysCount||0)+(u.liuyaoCount||0))},
    {title:'最近记录',dataIndex:'latestAt',render:displayDate}];
  let columns;
  if(kind==='charts') columns=[
    {title:'命盘名称',render:(_,r)=><a href={`/my-charts/?id=${encodeURIComponent(r.id)}&admin=1`} target="_blank" rel="noopener noreferrer">{r.name||'未命名'}</a>},
    {title:'性别',dataIndex:'gender',render:v=>v==='male'?'男':v==='female'?'女':'—'},
    {title:'出生日期',render:(_,r)=>r.birth?.year?`${r.birth.year}-${r.birth.month}-${r.birth.day}`:'—'},
    {title:'出生地',dataIndex:'birthplace'}, {title:'创建时间',dataIndex:'createdAt',render:displayDate},
  ];
  else if(kind==='divination') columns=[
    {title:'事项',render:(_,r)=><a href={`/${r.type==='liuyao'?'liuyao':'mhys'}/result.html?id=${encodeURIComponent(r.id)}&admin=1`} target="_blank" rel="noopener noreferrer">{r.topic||'无事项'}</a>},
    {title:'类型',dataIndex:'type',render:v=>v==='liuyao'?'六爻':'梅花易数'},
    {title:'起卦方式',dataIndex:'method'}, {title:'起卦时间',render:(_,r)=>r.divinationTime||displayDate(r.createdAt)},
  ];
  else columns=[{title:'建议内容',dataIndex:'content',render:v=><span style={{whiteSpace:'pre-wrap'}}>{v||'无文字建议'}</span>},
    {title:'评分',render:(_,r)=>Object.entries(r.ratings||{}).map(([k,v])=>`${({overall:'综合',ui:'界面',feature:'功能',ai:'AI',responseSpeed:'速度',accuracy:'准确性'})[k]||k} ${v??'—'}`).join(' / ')},
    {title:'提交时间',dataIndex:'createdAt',render:displayDate}];
  if(kind!=='suggestions')columns.push({title:'操作',fixed:'right',render:(_,r)=><Button danger onClick={()=>{setTarget(r);setDeleteError('')}}>删除</Button>});
  const filtered=current?records.filter(r=>(!type||r.type===type)&&`${r.name||''} ${r.topic||''} ${r.content||''}`.includes(search)):groups.filter(u=>String(identity(u)).includes(search));
  const mobileItem = item => {
    if (!current) return <List.Item className="admin-mobile-card" key={identity(item)}>
      <div className="mobile-card-header"><Button type="link" className="mobile-record-link" onClick={()=>setCurrent(identity(item))}>{identity(item)}</Button><Tag>{item.count??((item.mhysCount||0)+(item.liuyaoCount||0))} 条记录</Tag></div>
      <dl className="mobile-fields"><div><dt>最近记录</dt><dd>{displayDate(item.latestAt)}</dd></div></dl>
      <Button className="mobile-card-primary" onClick={()=>setCurrent(identity(item))}>查看记录</Button>
    </List.Item>;
    const titleValue=kind==='charts'?item.name||'未命名':kind==='divination'?item.topic||'无事项':item.content||'无文字建议';
    const typeValue=kind==='charts'?(item.gender==='male'?'男':item.gender==='female'?'女':'—'):kind==='divination'?(item.type==='liuyao'?'六爻':'梅花易数'):Object.entries(item.ratings||{}).map(([k,v])=>`${({overall:'综合',ui:'界面',feature:'功能',ai:'AI',responseSpeed:'速度',accuracy:'准确性'})[k]||k} ${v??'—'}`).join(' / ');
    return <List.Item className="admin-mobile-card" key={`${item.type||kind}-${item.id}`}>
      <div className="mobile-card-header">{kind==='suggestions'?<Typography.Text strong className="mobile-record-content">{titleValue}</Typography.Text>:<a className="mobile-record-link" href={kind==='charts'?`/my-charts/?id=${encodeURIComponent(item.id)}&admin=1`:`/${item.type==='liuyao'?'liuyao':'mhys'}/result.html?id=${encodeURIComponent(item.id)}&admin=1`} target="_blank" rel="noopener noreferrer">{titleValue}</a>}{kind==='divination'&&<Tag>{typeValue}</Tag>}</div>
      <dl className="mobile-fields">{kind==='charts'&&<><div><dt>性别</dt><dd>{typeValue}</dd></div><div><dt>出生日期</dt><dd>{item.birth?.year?`${item.birth.year}-${item.birth.month}-${item.birth.day}`:'—'}</dd></div><div><dt>出生地</dt><dd>{item.birthplace||'—'}</dd></div><div><dt>创建时间</dt><dd>{displayDate(item.createdAt)}</dd></div></>}{kind==='divination'&&<><div><dt>起卦方式</dt><dd>{item.method||'—'}</dd></div><div><dt>起卦时间</dt><dd>{item.divinationTime||displayDate(item.createdAt)}</dd></div></>}{kind==='suggestions'&&<><div><dt>评分</dt><dd>{typeValue||'—'}</dd></div><div><dt>提交时间</dt><dd>{displayDate(item.createdAt)}</dd></div></>}</dl>
      {kind!=='suggestions'&&<Button danger className="mobile-card-primary" onClick={()=>{setTarget(item);setDeleteError('')}}>删除</Button>}
    </List.Item>;
  };
  const mobileList = <List className="admin-mobile-list" loading={loading} dataSource={filtered} renderItem={mobileItem} locale={{emptyText:<Empty description="暂无记录"/>}} pagination={{pageSize:20,size:'small',showSizeChanger:false,hideOnSinglePage:true}} />;
  return <>
    <div className="page-title"><Typography.Title level={3}>{title}</Typography.Title><Space>{current&&<Button onClick={()=>setCurrent(null)}>返回列表</Button>}<Button onClick={load}>刷新</Button></Space></div>
    {current&&<Typography.Paragraph>用户：{current}</Typography.Paragraph>}
    <Card><Space wrap className="admin-toolbar" style={{marginBottom:16}}><Input aria-label="搜索记录" placeholder={current?'搜索当前用户记录':'搜索账号'} value={search} onChange={e=>setSearch(e.target.value)} allowClear/>
      {current&&kind==='divination'&&<Select aria-label="卦例类型" placeholder="全部类型" allowClear value={type} onChange={setType} options={[{value:'mhys',label:'梅花易数'},{value:'liuyao',label:'六爻'}]} style={{width:140}}/>}</Space>
      {error?<Alert type="error" title={error} action={<Button onClick={load}>重试</Button>}/>:mobile?mobileList:<Table rowKey={r=>current?`${r.type||kind}-${r.id}`:identity(r)} columns={current?columns:groupColumns} dataSource={filtered} loading={loading} scroll={{x:'max-content'}} locale={{emptyText:<Empty description="暂无记录"/>}} pagination={{pageSize:20}}/>}
      {current&&kind==='charts'&&<Typography.Paragraph type="secondary">接口最多返回最近 200 份命盘；当前分页只针对已加载数据。</Typography.Paragraph>}
    </Card>
    <Modal className="admin-mobile-modal" title="删除记录" open={Boolean(target)} onCancel={()=>!deleting&&setTarget(null)} onOk={remove} okText="确认删除" cancelText="取消" confirmLoading={deleting} okButtonProps={{danger:true}}>
      <p>确定删除“{target?.name||target?.topic||'此记录'}”？此操作不可恢复。</p>{deleteError&&<Alert type="error" title={deleteError}/>}</Modal>
  </>;
}
