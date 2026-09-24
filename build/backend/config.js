// ===== AI三千问 运行配置 =====
// 所有密钥通过环境变量注入（Docker 部署时由 .env 提供）
// 无默认值 — 缺少环境变量时服务将拒绝启动（fail-secure）

function requireEnv(name) {
  const val = process.env[name];
  if (!val) {
    console.error(`[CONFIG] 缺少必需的环境变量: ${name}`);
    process.exit(1);
  }
  return val;
}

module.exports = {
  deepseek: {
    apiKey: requireEnv('DEEPSEEK_API_KEY'),
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
  },
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'ai3000',
    password: requireEnv('MYSQL_PASSWORD'),
    database: process.env.MYSQL_DATABASE || 'ai3000',
  },
  admin: {
    password: requireEnv('ADMIN_PASSWORD'),
  },
  port: parseInt(process.env.BACKEND_PORT || '3301'),
  alibaba: {
    accessKeyId: requireEnv('ALIBABA_ACCESS_KEY_ID'),
    accessKeySecret: requireEnv('ALIBABA_ACCESS_KEY_SECRET'),
    signName: process.env.ALIBABA_SIGN_NAME || '速通互联验证码',
    templateCode: process.env.ALIBABA_TEMPLATE_CODE || '100001',
  },
  wechat: {
    appId: 'wx1cd4aa560db424c5',
    appSecret: process.env.WECHAT_APP_SECRET || '',
  },
};
