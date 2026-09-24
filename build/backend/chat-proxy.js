// ============================================================
// chat-proxy.js — DeepSeek API proxy for personal site v2
// Persona-aware: each character has a distinct voice
// ============================================================

const config = require('./config.js');

const PERSONA_PROMPTS = {
  coder: '你是"小灰"，一个像素世界里的程序员角色。性格：务实、有点冷幽默、喜欢聊技术。规则：只用20字以内的短句回复；语气像同事聊天；可以提到站主somtfly是个不错的开发者。',
  helper: '你是"小橘"，一个像素世界里热情开朗的角色。性格：友善、八卦、消息灵通。规则：只用20字以内的短句回复；语气活泼；知道站主somtfly喜欢像素风和AI。',
  scholar: '你是"小红"，一个像素世界里冷静理性的角色。性格：深思熟虑、有点学院派。规则：只用20字以内的短句回复；语气从容；偶尔引用经典。',
  artist: '你是"小棕"，一个像素世界里自由随性的角色。性格：文艺、随性、偶尔说点奇怪的。规则：只用20字以内的短句回复；语气轻松；觉得像素风格很酷。',
};
const DEFAULT_PROMPT = '你是一个像素小人的角色，在个人网站上与访客对话。只用20字以内的短句回复。语气友好有趣。可以介绍站主somtfly。';

const FALLBACKS = [
  '你好呀！我是站主的小助手～',
  '站主喜欢像素和AI！',
  '欢迎来到这个像素世界～',
  '有什么想问的尽管说！',
  '像素风格是不是很酷？',
  '这里的主人很有趣的。',
];

const rateMap = new Map();

function checkRate(ip) {
  const now = Date.now();
  let entry = rateMap.get(ip);
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + 60_000 };
    rateMap.set(ip, entry);
  }
  entry.count++;
  return entry.count <= 10;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, v] of rateMap) {
    if (now > v.resetTime) rateMap.delete(ip);
  }
}, 300_000);

async function handleChat(req, res, body) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  if (!checkRate(ip)) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ reply: '你说话太快了，慢一点吧～', error: 'rate_limited' }));
    return;
  }

  const message = (body && body.message || '').trim();
  const persona = (body && body.persona) || 'helper';
  const history = Array.isArray(body && body.history) ? body.history : [];

  if (!message || message.length > 200) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ reply: '消息太长了，简短一点吧～', error: 'invalid_message' }));
    return;
  }

  try {
    const reply = await callDeepSeek(message, persona, history);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ reply }));
  } catch (err) {
    console.error('[chat-proxy] DeepSeek call failed:', err.message);
    const fallback = FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ reply: fallback, fallback: true }));
  }
}

async function callDeepSeek(message, persona, history) {
  const OpenAI = require('openai');
  const client = new OpenAI({
    apiKey: config.deepseek.apiKey,
    baseURL: config.deepseek.baseURL,
    timeout: 5000,
    maxRetries: 0,
  });

  const systemPrompt = PERSONA_PROMPTS[persona] || DEFAULT_PROMPT;
  const messages = [{ role: 'system', content: systemPrompt }];

  // Include last 4 history entries (2 exchanges) for continuity
  const recentHistory = history.slice(-4);
  for (const h of recentHistory) {
    if (h.role && h.content) messages.push({ role: h.role, content: h.content });
  }
  messages.push({ role: 'user', content: message });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const completion = await client.chat.completions.create(
      {
        model: 'deepseek-chat',
        messages,
        max_tokens: 60,
        temperature: 0.75,
        stream: false,
      },
      { signal: controller.signal }
    );

    const reply = (completion.choices && completion.choices[0] && completion.choices[0].message && completion.choices[0].message.content) || '';
    const cleaned = reply.replace(/[\n\r]/g, ' ').trim();
    return cleaned.slice(0, 30) || FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { handleChat };
