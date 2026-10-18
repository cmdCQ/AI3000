import { AUTH } from '../shared/auth.js'

function headers(extra = {}) {
  const token = AUTH.getToken()
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra }
}
async function json(response) {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw Object.assign(new Error(body.error || `请求失败（${response.status}）`), { status: response.status })
  return body
}
function get(url, signal) {
  return fetch(url, { credentials: 'same-origin', headers: headers(), signal }).then(json)
}
export function params() { return new URLSearchParams(location.search) }
export function getChart(id, signal) { return get(`/api/charts/${encodeURIComponent(id)}`, signal) }
export function listConsultations(chartId, signal, before) {
  const query = new URLSearchParams()
  if (chartId) query.set('chartId', chartId)
  if (before) query.set('before', before)
  return get(`/api/bazi/consultations${query.size ? `?${query}` : ''}`, signal)
}
export function deleteConsultation(id) {
  return fetch(`/api/bazi/consultations/${encodeURIComponent(id)}`, {
    method: 'DELETE', credentials: 'same-origin', headers: headers(),
  }).then(json)
}
export function getConsultation(id, signal) { return get(`/api/bazi/consultations/${encodeURIComponent(id)}`, signal) }

function parseEvent(chunk) {
  let event = 'message'
  const data = []
  for (const line of chunk.split(/\r?\n/)) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) data.push(line.slice(5).trimStart())
  }
  if (!data.length) return null
  try { return { event, data: JSON.parse(data.join('\n')) } }
  catch { throw new Error('服务返回了无法解析的流式事件') }
}
export async function* sendConsultation(input, signal) {
  const response = await fetch('/api/bazi/consultations/send', {
    method: 'POST', credentials: 'same-origin',
    headers: headers({ 'Content-Type': 'application/json', Accept: 'text/event-stream' }),
    body: JSON.stringify(input), signal,
  })
  if (!response.ok) { await json(response); return }
  if (!response.body) throw new Error('服务未返回流式内容')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = '', sawDone = false
  try {
    while (true) {
      const { value, done } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })
      const chunks = buffer.split(/\r?\n\r?\n/)
      buffer = chunks.pop() || ''
      for (const chunk of chunks) {
        const item = parseEvent(chunk)
        if (!item) continue
        if (item.event === 'done') sawDone = true
        yield item
      }
      if (done) break
    }
    if (buffer.trim()) throw new Error('流式响应未完整结束')
    if (!sawDone) throw new Error('回答未完成：服务未返回结束状态')
  } finally { reader.releaseLock() }
}
export function requestId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}
