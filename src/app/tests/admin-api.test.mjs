// @vitest-environment jsdom
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
let transport
beforeEach(async()=>{
  vi.resetModules(); localStorage.clear()
  localStorage.setItem('sqw_admin_token','fixture-token')
  localStorage.setItem('sqw_admin_expiry',String(Date.now()+100000))
  transport=await import('../admin/api.js')
})
afterEach(()=>vi.unstubAllGlobals())
function respond(body,status=200){vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}})))}
describe('admin transport',()=>{
  it('uses bearer and exact write methods instead of assuming CRUD conventions',async()=>{
    respond({ok:true})
    await transport.api.updatePoints('account-alice',0.0123)
    let [url,options]=fetch.mock.calls.at(-1)
    expect(url).toBe('/api/admin/user-points');expect(options.method).toBe('PATCH')
    expect(options.headers.get('Authorization')).toBe('Bearer fixture-token')
    expect(JSON.parse(options.body)).toEqual({username:'account-alice',pointsUsed:0.0123})
    await transport.api.updateTier('account-alice',1)
    expect(fetch.mock.calls.at(-1)[1].method).toBe('PATCH')
    await transport.api.updatePrompt('mhys_system','draft')
    expect(fetch.mock.calls.at(-1)[1].method).toBe('POST')
  })
  it('401 clears authentication and emits session expiry',async()=>{
    respond({error:'登录过期'},401)
    const listener=vi.fn();window.addEventListener('admin:unauthorized',listener)
    await expect(transport.api.users()).rejects.toThrow('登录过期')
    expect(localStorage.getItem('sqw_admin_token')).toBeNull()
    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener('admin:unauthorized',listener)
  })
  it('503 is an error rather than successful empty data',async()=>{
    respond({error:'统计暂不可用'},503)
    await expect(transport.api.stats()).rejects.toThrow('统计暂不可用')
    expect(localStorage.getItem('sqw_admin_token')).toBe('fixture-token')
  })
})
