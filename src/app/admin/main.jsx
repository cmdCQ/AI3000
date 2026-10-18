import React, {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Alert,App,Button,Card,ConfigProvider,Drawer,Form,Input,Layout,Menu,Space,Spin,Typography} from 'antd';
import {MenuOutlined,LogoutOutlined} from '@ant-design/icons';
import {api,clearToken,isAuthenticated,login,verify} from './api.js';
import Books from './Books.jsx';
import Users from './Users.jsx';
import Prompts from './Prompts.jsx';
import Records from './Records.jsx';
import Dashboard from './Dashboard.jsx';
import './style.css';

const menuItems=[['dashboard','仪表盘'],['users','用户管理'],['charts','命盘管理'],['divination','占卜管理'],['suggestions','建议管理'],['books','参考书籍'],['prompts','Prompt管理'],['settings','系统设置']];
const labels=Object.fromEntries(menuItems);
function readRoute(){const value=location.hash.slice(1);return labels[value]?value:'dashboard'}

function Login({onSuccess}) {
  const [loading,setLoading]=useState(false),[error,setError]=useState('');
  async function submit(values){setLoading(true);setError('');try{await login(values.username.trim(),values.password);onSuccess()}catch(e){setError(e.message)}finally{setLoading(false)}}
  return <main className="admin-login"><Card className="login-card"><Typography.Title level={2}>易三千</Typography.Title><Typography.Text type="secondary">后台管理</Typography.Text>
    <Form layout="vertical" onFinish={submit} className="login-form">
      <Form.Item name="username" label="用户名" rules={[{required:true,message:'请输入用户名'}]}><Input autoComplete="username"/></Form.Item>
      <Form.Item name="password" label="密码" rules={[{required:true,message:'请输入密码'}]}><Input.Password autoComplete="current-password"/></Form.Item>
      {error&&<Alert type="error" title={error}/>}
      <Button type="primary" htmlType="submit" loading={loading} block>进入后台</Button>
    </Form><a href="/" className="back-home">返回首页</a></Card></main>;
}
function Settings(){
  const [form]=Form.useForm();const {message}=App.useApp();
  const [loading,setLoading]=useState(false),[error,setError]=useState('');
  async function save(v){setLoading(true);setError('');try{await api.password({currentPassword:v.currentPassword,newPassword:v.newPassword});message.success('密码已更新');form.resetFields()}catch(e){setError(e.message)}finally{setLoading(false)}}
  return <><Typography.Title level={3}>系统设置</Typography.Title><Card title="修改管理员密码"><Form form={form} layout="vertical" onFinish={save} style={{maxWidth:480}}>
    <Form.Item name="currentPassword" label="当前密码" rules={[{required:true}]}><Input.Password autoComplete="current-password"/></Form.Item>
    <Form.Item name="newPassword" label="新密码" rules={[{required:true,min:8,message:'新密码至少 8 位'}]}><Input.Password autoComplete="new-password"/></Form.Item>
    <Form.Item name="confirmation" label="确认新密码" dependencies={['newPassword']} rules={[{required:true},{validator:(_,v)=>!v||v===form.getFieldValue('newPassword')?Promise.resolve():Promise.reject(new Error('两次输入不一致'))}]}><Input.Password autoComplete="new-password"/></Form.Item>
    {error&&<Alert type="error" title={error}/>}<Button type="primary" htmlType="submit" loading={loading}>保存</Button>
  </Form></Card></>;
}
function Shell({onLogout}){
  const [open,setOpen]=useState(false),[active,setActive]=useState(readRoute);
  useEffect(()=>{const fn=()=>setActive(readRoute());addEventListener('hashchange',fn);return()=>removeEventListener('hashchange',fn)},[]);
  function navigate(key){
    const event=new Event('admin:before-navigate',{cancelable:true});
    if(key!==active&&!window.dispatchEvent(event))return;
    location.hash=key;setActive(key);setOpen(false);
  }
  let page;
  if(['charts','divination','suggestions'].includes(active))page=<Records key={active} kind={active}/>;
  else{const Page={dashboard:Dashboard,users:Users,books:Books,prompts:Prompts,settings:Settings}[active]||Dashboard;page=<Page/>}
  return <Layout className="admin-shell"><Layout.Header className="admin-header">
    <Button aria-label="打开菜单" icon={<MenuOutlined/>} onClick={()=>setOpen(true)}/><Typography.Title level={4}>易三千 · {labels[active]}</Typography.Title>
    <Space><Typography.Text className="account-label">管理员</Typography.Text><Button aria-label="退出" type="text" icon={<LogoutOutlined/>} onClick={onLogout}>退出</Button></Space>
    </Layout.Header><Layout.Content className="admin-content">{page}</Layout.Content>
    <Drawer title="导航" placement="left" open={open} onClose={()=>setOpen(false)} className="admin-drawer"><Menu mode="inline" selectedKeys={[active]} items={menuItems.map(([key,label])=>({key,label}))} onClick={({key})=>navigate(key)}/></Drawer>
  </Layout>;
}
function Root(){
  const [authed,setAuthed]=useState(false),[checking,setChecking]=useState(true),[error,setError]=useState('');
  async function check(){setChecking(true);setError('');try{if(isAuthenticated()){await verify();setAuthed(true)}}catch(e){setError(e.message)}finally{setChecking(false)}}
  useEffect(()=>{const fn=()=>setAuthed(false);addEventListener('admin:unauthorized',fn);check();return()=>removeEventListener('admin:unauthorized',fn)},[]);
  return <ConfigProvider button={{autoInsertSpace:false}} theme={{token:{colorPrimary:'#1f6b5e',borderRadius:10,colorBgLayout:'#f4f7f6',screenXSMax:600,screenSM:601,screenSMMin:601}}}><App>
    {checking?<div className="admin-login"><Spin tip="验证会话中…"/></div>:authed?<Shell onLogout={()=>{clearToken();setAuthed(false)}}/>:<>{error&&<Alert type="error" title={error} action={<Button onClick={check}>重试验证</Button>}/>}<Login onSuccess={()=>{setAuthed(true);setError('')}}/></>}
  </App></ConfigProvider>;
}
createRoot(document.getElementById('root')).render(<Root/>);
