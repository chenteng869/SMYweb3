import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 WOPC 创业家管理后台 - 开始 seed...');

  // ============================================================
  // 1. 角色
  // ============================================================
  const superAdmin = await prisma.adminRole.upsert({
    where: { code: 'SUPER_ADMIN' },
    update: {},
    create: {
      name: '超级管理员',
      code: 'SUPER_ADMIN',
      description: '系统最高权限,可管理一切',
      permissions: JSON.stringify(['*']),
      isSystem: true,
    },
  });

  const admin = await prisma.adminRole.upsert({
    where: { code: 'ADMIN' },
    update: {},
    create: {
      name: '管理员',
      code: 'ADMIN',
      description: '日常运营管理员',
      permissions: JSON.stringify([
        'dashboard:read', 'users:read', 'users:write',
        'companies:read', 'companies:write',
        'banks:read', 'banks:write',
        'payments:read', 'payments:write',
        'tax:read', 'tax:write',
        'legal:read', 'legal:write',
        'ai:read', 'ai:write',
        'videos:read', 'videos:write',
        'media:read', 'media:write',
        'documents:read', 'documents:write',
        'orders:read', 'orders:write',
        'notifications:read', 'notifications:write',
        'did:read', 'did:write',
        'dlc:read', 'dlc:write',
        'dvsf:read', 'dvsf:write',
      ]),
      isSystem: true,
    },
  });

  const auditor = await prisma.adminRole.upsert({
    where: { code: 'AUDITOR' },
    update: {},
    create: {
      name: '审计员',
      code: 'AUDITOR',
      description: '只读审计权限',
      permissions: JSON.stringify(['*:read', 'audit:read']),
      isSystem: true,
    },
  });

  const operator = await prisma.adminRole.upsert({
    where: { code: 'OPERATOR' },
    update: {},
    create: {
      name: '运营员',
      code: 'OPERATOR',
      description: '运营人员,处理订单',
      permissions: JSON.stringify([
        'dashboard:read', 'users:read',
        'orders:read', 'orders:write',
        'notifications:read', 'notifications:write',
        'documents:read',
      ]),
      isSystem: true,
    },
  });

  // ============================================================
  // 2. 管理员账号
  // ============================================================
  const passwordHash = await bcrypt.hash('admin123456', 10);
  await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: { password: passwordHash, email: 'admin@wopc.io' },
    create: {
      username: 'admin',
      email: 'admin@wopc.io',
      password: passwordHash,
      name: '超级管理员',
      roleId: superAdmin.id,
      isActive: true,
    },
  });
  await prisma.adminUser.upsert({
    where: { username: 'operator' },
    update: { password: passwordHash },
    create: {
      username: 'operator',
      email: 'operator@wopc.io',
      password: passwordHash,
      name: '运营员',
      roleId: operator.id,
      isActive: true,
    },
  });
  await prisma.adminUser.upsert({
    where: { username: 'auditor' },
    update: { password: passwordHash },
    create: {
      username: 'auditor',
      email: 'auditor@wopc.io',
      password: passwordHash,
      name: '审计员',
      roleId: auditor.id,
      isActive: true,
    },
  });

  // ============================================================
  // 3. DLC 等级
  // ============================================================
  const dlcLevels = [
    { level: 1, name: '青铜', color: '#CD7F32', minDvc: 0, maxDvc: 999, benefits: ['基础服务访问', '社区支持'], commissionRate: 0.05, sortOrder: 1 },
    { level: 2, name: '白银', color: '#C0C0C0', minDvc: 1000, maxDvc: 4999, benefits: ['优先客服', '高级分析报告'], commissionRate: 0.08, sortOrder: 2 },
    { level: 3, name: '黄金', color: '#FFD700', minDvc: 5000, maxDvc: 19999, benefits: ['专属顾问', '优先处理', '月度报告'], commissionRate: 0.12, sortOrder: 3 },
    { level: 4, name: '铂金', color: '#E5E4E2', minDvc: 20000, maxDvc: 49999, benefits: ['VIP通道', '定制化服务', '季度策略会'], commissionRate: 0.15, sortOrder: 4 },
    { level: 5, name: '钻石', color: '#B9F2FF', minDvc: 50000, maxDvc: 999999999, benefits: ['全功能解锁', '最高佣金', '私人银行服务'], commissionRate: 0.20, sortOrder: 5 },
  ];
  for (const lv of dlcLevels) {
    const data = { ...lv, benefits: JSON.stringify(lv.benefits) };
    await prisma.dlcLevel.upsert({
      where: { level: lv.level },
      update: data,
      create: data,
    });
  }

  // ============================================================
  // 4. DVSF 分红池
  // ============================================================
  await prisma.dvsfPool.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: '2026 Q2 分红池',
      totalAmount: 1000000,
      distributed: 0,
      period: '2026Q2',
      status: 'active',
      distributeAt: new Date('2026-06-30'),
      description: '2026 年第二季度 DVC 分红池',
    },
  });

  // ============================================================
  // 5. 支付渠道
  // ============================================================
  const paymentChannels = [
    { name: 'Stripe', type: 'card', icon: '💳', currencies: JSON.stringify(['USD', 'EUR', 'GBP']), feeRate: 0.029, minAmount: 1, maxAmount: 100000, processingTime: '即时', settlementTime: 'T+2', supportedCountries: JSON.stringify(['US', 'GB', 'DE', 'FR', 'CA', 'AU', 'JP']), sortOrder: 1 },
    { name: '支付宝国际', type: 'ewallet', icon: '🅰️', currencies: JSON.stringify(['CNY', 'USD', 'HKD']), feeRate: 0.018, minAmount: 10, maxAmount: 50000, processingTime: '即时', settlementTime: 'T+1', supportedCountries: JSON.stringify(['CN', 'HK', 'SG']), sortOrder: 2 },
    { name: 'PayPal', type: 'ewallet', icon: '🅿️', currencies: JSON.stringify(['USD', 'EUR', 'GBP', 'JPY']), feeRate: 0.0349, minAmount: 1, maxAmount: 60000, processingTime: '即时', settlementTime: 'T+3', supportedCountries: JSON.stringify(['US', 'GB', 'DE', 'JP', 'AU']), sortOrder: 3 },
    { name: 'USDT-TRC20', type: 'crypto', icon: '₮', currencies: JSON.stringify(['USDT']), feeRate: 0.001, minAmount: 10, maxAmount: 1000000, processingTime: '1分钟', settlementTime: '即时', supportedCountries: JSON.stringify(['*']), sortOrder: 4 },
    { name: 'SWIFT 电汇', type: 'bank_transfer', icon: '🏦', currencies: JSON.stringify(['USD', 'EUR', 'GBP', 'HKD', 'JPY', 'CNY']), feeRate: 0.005, minAmount: 1000, maxAmount: 10000000, processingTime: '1-3工作日', settlementTime: 'T+3', supportedCountries: JSON.stringify(['*']), sortOrder: 5 },
    { name: 'Wise', type: 'bank_transfer', icon: '🌐', currencies: JSON.stringify(['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD']), feeRate: 0.007, minAmount: 1, maxAmount: 1000000, processingTime: '数小时', settlementTime: 'T+1', supportedCountries: JSON.stringify(['US', 'GB', 'DE', 'AU', 'CA', 'SG', 'JP']), sortOrder: 6 },
  ];
  for (const ch of paymentChannels) {
    const existing = await prisma.paymentChannel.findFirst({ where: { name: ch.name } });
    if (!existing) {
      await prisma.paymentChannel.create({ data: ch });
    }
  }

  // ============================================================
  // 6. 汇率
  // ============================================================
  const rates = [
    { from: 'USD', to: 'CNY', rate: 7.18 },
    { from: 'USD', to: 'HKD', rate: 7.82 },
    { from: 'USD', to: 'EUR', rate: 0.92 },
    { from: 'USD', to: 'GBP', rate: 0.79 },
    { from: 'USD', to: 'JPY', rate: 152.5 },
    { from: 'USD', to: 'SGD', rate: 1.34 },
    { from: 'USD', to: 'USDT', rate: 1.0 },
  ];
  for (const r of rates) {
    await prisma.exchangeRate.upsert({
      where: { from_to: { from: r.from, to: r.to } },
      update: { rate: r.rate },
      create: { ...r, change24h: 0, source: 'seed' },
    });
  }

  // ============================================================
  // 7. 税率
  // ============================================================
  const taxRates = [
    { country: '萨摩亚', countryCode: 'WS', structureType: 'samoa_spv', corporateTax: 0, vatGst: 15, withholdingTax: 0, capitalGainsTax: 0, doubleTaxationTreaties: JSON.stringify([]), notes: '无企业所得税,SPV 结构优选' },
    { country: '中国香港', countryCode: 'HK', structureType: 'hong_kong', corporateTax: 8.25, vatGst: 0, withholdingTax: 0, capitalGainsTax: 0, doubleTaxationTreaties: JSON.stringify(['CN', 'GB', 'SG']), notes: '首 200 万港币 8.25%,其后 16.5%' },
    { country: '新加坡', countryCode: 'SG', structureType: 'singapore', corporateTax: 17, vatGst: 9, withholdingTax: 0, capitalGainsTax: 0, doubleTaxationTreaties: JSON.stringify(['CN', 'HK', 'US', 'GB']), notes: '新成立公司前 3 年可享免税' },
    { country: 'BVI', countryCode: 'VG', structureType: 'bvi', corporateTax: 0, vatGst: 0, withholdingTax: 0, capitalGainsTax: 0, doubleTaxationTreaties: JSON.stringify([]), notes: '完全免税,隐私保护好' },
    { country: '开曼', countryCode: 'KY', structureType: 'cayman', corporateTax: 0, vatGst: 0, withholdingTax: 0, capitalGainsTax: 0, doubleTaxationTreaties: JSON.stringify([]), notes: '上市架构首选' },
    { country: '美国', countryCode: 'US', structureType: 'delaware', corporateTax: 21, vatGst: 0, withholdingTax: 30, capitalGainsTax: 20, doubleTaxationTreaties: JSON.stringify(['CN', 'GB', 'JP', 'DE']), notes: '联邦税 21%,州税另计' },
  ];
  for (const t of taxRates) {
    await prisma.taxRate.upsert({
      where: { countryCode_structureType: { countryCode: t.countryCode, structureType: t.structureType } },
      update: t,
      create: { ...t, effectiveDate: new Date('2026-01-01') },
    });
  }

  // ============================================================
  // 8. 法务合规
  // ============================================================
  const legalItems = [
    { country: '新加坡', countryCode: 'SG', category: 'KYC', requirement: '客户身份识别', description: '所有客户必须完成 KYC 验证', penalty: '罚款 100 万新币', status: 'required' },
    { country: '中国香港', countryCode: 'HK', category: 'AML', requirement: '可疑交易报告 STR', description: '可疑交易 24 小时内报告 JFIU', penalty: '罚款 100 万港币 + 监禁', status: 'required' },
    { country: '美国', countryCode: 'US', category: 'Tax', requirement: 'FBAR 申报', description: '美国纳税人海外账户超 1 万美元需申报', penalty: '罚款 1 万美元/次', status: 'required' },
    { country: 'BVI', countryCode: 'VG', category: '数据', requirement: '经济实质申报', description: '在经济实质要求下完成申报', penalty: '罚款 + 注销', status: 'required' },
  ];
  for (const item of legalItems) {
    const existing = await prisma.legalCompliance.findFirst({ where: { countryCode: item.countryCode, requirement: item.requirement } });
    if (!existing) {
      await prisma.legalCompliance.create({ data: item });
    }
  }

  // ============================================================
  // 9. AI Agents
  // ============================================================
  const aiAgents = [
    { name: '财务顾问', role: '财务顾问', description: '专业税务规划、跨境资金管理', icon: '💰', color: '#10B981', capabilities: JSON.stringify(['税务规划', '资金管理', '财务分析']), systemPrompt: '你是一位资深财务顾问...', sortOrder: 1 },
    { name: '法务顾问', role: '法务顾问', description: '公司注册、合同审查、合规咨询', icon: '⚖️', color: '#3B82F6', capabilities: JSON.stringify(['合同审查', '合规咨询', '诉讼支持']), systemPrompt: '你是一位资深法务顾问...', sortOrder: 2 },
    { name: '税务专家', role: '税务专家', description: '全球税务规划、节税方案', icon: '🧾', color: '#F59E0B', capabilities: JSON.stringify(['税务计算', '节税方案', '申报指导']), systemPrompt: '你是一位资深税务专家...', sortOrder: 3 },
    { name: '公司秘书', role: '公司秘书', description: '公司注册、年审、文档管理', icon: '📋', color: '#8B5CF6', capabilities: JSON.stringify(['公司注册', '年审申报', '文档管理']), systemPrompt: '你是一位专业公司秘书...', sortOrder: 4 },
    { name: '移民顾问', role: '移民顾问', description: '全球身份规划、签证、税务居民', icon: '🌍', color: '#EF4444', capabilities: JSON.stringify(['身份规划', '签证申请', '税务居民']), systemPrompt: '你是一位资深移民顾问...', sortOrder: 5 },
    { name: '银行顾问', role: '银行顾问', description: '海外开户、银行选择、KYC 准备', icon: '🏦', color: '#06B6D4', capabilities: JSON.stringify(['开户咨询', 'KYC 准备', '账户管理']), systemPrompt: '你是一位资深银行顾问...', sortOrder: 6 },
  ];
  for (const a of aiAgents) {
    const existing = await prisma.aiAgent.findUnique({ where: { name: a.name } });
    if (!existing) {
      await prisma.aiAgent.create({ data: a });
    }
  }

  // ============================================================
  // 10. H5 演示用户
  // ============================================================
  const demoUsers = [
    { openId: 'demo-user-001', phone: '13800138001', email: 'zhang@example.com', name: '张创业', dlcLevel: 3, dvcBalance: 8500, kycStatus: 'verified', kycName: '张创业', kycIdNo: '110101199001011234', kycCountry: 'CN' },
    { openId: 'demo-user-002', phone: '13800138002', email: 'li@example.com', name: '李总', dlcLevel: 4, dvcBalance: 35000, kycStatus: 'verified', kycName: '李总', kycIdNo: '310101198501012345', kycCountry: 'CN' },
    { openId: 'demo-user-003', phone: '13800138003', email: 'wang@example.com', name: 'Wang', dlcLevel: 2, dvcBalance: 2500, kycStatus: 'pending', kycName: 'Wang Wei', kycCountry: 'SG' },
    { openId: 'demo-user-004', phone: '13800138004', email: 'chen@example.com', name: '陈小姐', dlcLevel: 1, dvcBalance: 500, kycStatus: 'unverified', kycCountry: 'HK' },
    { openId: 'demo-user-005', phone: '13800138005', email: 'liu@example.com', name: '刘老板', dlcLevel: 5, dvcBalance: 88000, kycStatus: 'verified', kycName: '刘老板', kycIdNo: '440101197001011234', kycCountry: 'CN' },
  ];
  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: { openId: u.openId },
      update: u,
      create: u as any,
    });
  }

  // ============================================================
  // 11. 演示公司
  // ============================================================
  const zhang = await prisma.user.findUnique({ where: { openId: 'demo-user-001' } });
  if (zhang) {
    const existingCompany = await prisma.company.findFirst({ where: { userId: zhang.id, name: 'Zhang Tech SPV Ltd' } });
    if (!existingCompany) {
      const company = await prisma.company.create({
        data: {
          userId: zhang.id,
          name: 'Zhang Tech SPV Ltd',
          type: 'samoa_spv',
          jurisdiction: 'Samoa',
          registrationNumber: 'WS-2026-001',
          incorporationDate: new Date('2026-01-15'),
          status: 'active',
          complianceStatus: 'good',
          annualReturnDue: new Date('2027-01-15'),
          registeredAddress: 'Apia, Samoa',
          businessScope: '跨境电商、技术服务',
          directors: { create: [{ name: '张创业', nationality: 'CN', appointedDate: new Date('2026-01-15') }] },
          shareholders: { create: [{ name: '张创业', type: 'individual', shares: 10000, percentage: 100 }] },
        },
      });

      await prisma.order.create({
        data: {
          orderNo: 'WO-2026-0001',
          userId: zhang.id,
          companyId: company.id,
          type: 'company_registration',
          title: '萨摩亚 SPV 公司注册',
          amount: 2800,
          currency: 'USD',
          status: 'completed',
          progress: 100,
          assignedTo: 'operator',
          notes: '客户非常满意,已推荐 2 位朋友',
        },
      });
    }
  }

  // ============================================================
  // 12. 演示视频
  // ============================================================
  const videos = [
    { title: 'WOPC 创业家平台介绍', description: '5 分钟了解 WOPC 全球创业家服务平台', thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=WOPC%20platform%20intro%20video%20thumbnail&image_size=landscape_16_9', videoUrl: 'https://example.com/video1.mp4', duration: 312, category: '平台介绍', tags: JSON.stringify(['WOPC', '介绍', '创业']), author: 'WOPC 官方', views: 12580, likes: 320, isFeatured: true },
    { title: '萨摩亚 SPV 注册全流程', description: '详细讲解萨摩亚 SPV 注册步骤与注意事项', thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Samoa%20SPV%20registration%20tutorial%20thumbnail&image_size=landscape_16_9', videoUrl: 'https://example.com/video2.mp4', duration: 845, category: '公司注册', tags: JSON.stringify(['萨摩亚', 'SPV', '注册']), author: '法务顾问', views: 8920, likes: 245, isFeatured: true },
    { title: '如何用 Stripe 收款', description: '跨境电商 Stripe 收款全攻略', thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Stripe%20payment%20tutorial%20thumbnail&image_size=landscape_16_9', videoUrl: 'https://example.com/video3.mp4', duration: 567, category: '支付', tags: JSON.stringify(['Stripe', '收款']), author: '支付专家', views: 5430, likes: 156 },
    { title: 'AI 财务顾问实战', description: '用 AI 顾问做税务规划', thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=AI%20tax%20advisor%20demo%20thumbnail&image_size=landscape_16_9', videoUrl: 'https://example.com/video4.mp4', duration: 423, category: 'AI 应用', tags: JSON.stringify(['AI', '税务']), author: 'AI 产品团队', views: 3210, likes: 89 },
    { title: 'DLC 等级体系详解', description: 'DLC 等级权益与 DVC 积分获取', thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=DLC%20level%20system%20tutorial&image_size=landscape_16_9', videoUrl: 'https://example.com/video5.mp4', duration: 287, category: '平台介绍', tags: JSON.stringify(['DLC', '等级']), author: '运营团队', views: 4520, likes: 124 },
  ];
  for (const v of videos) {
    const existing = await prisma.video.findFirst({ where: { title: v.title } });
    if (!existing) {
      await prisma.video.create({ data: v as any });
    }
  }

  // ============================================================
  // 13. 演示通知
  // ============================================================
  await prisma.notification.createMany({
    data: [
      { title: '系统升级通知', message: 'WOPC 平台将于本周日凌晨 2:00-4:00 进行系统升级', type: 'info' },
      { title: '新功能上线', message: 'AI 财务顾问 V2 版本正式上线', type: 'success' },
      { title: '合规提醒', message: '请及时完成 2026 年度合规自查', type: 'warning' },
    ],
  });

  // ============================================================
  // 14. 系统配置
  // ============================================================
  const configs = [
    { key: 'site.name', value: 'WOPC 创业家', group: 'general', label: '站点名称', type: 'string' },
    { key: 'site.version', value: '1.0.0', group: 'general', label: '版本号', type: 'string' },
    { key: 'site.copyright', value: '© 2026 WOPC. All rights reserved.', group: 'general', label: '版权信息', type: 'string' },
    { key: 'security.login_max_retry', value: '5', group: 'security', label: '登录失败最大重试次数', type: 'number' },
    { key: 'security.jwt_expires_in', value: '7d', group: 'security', label: 'JWT 过期时间', type: 'string' },
    { key: 'notification.email_enabled', value: 'true', group: 'notification', label: '启用邮件通知', type: 'boolean' },
    { key: 'notification.sms_enabled', value: 'true', group: 'notification', label: '启用短信通知', type: 'boolean' },
    { key: 'feature.ai_enabled', value: 'true', group: 'feature', label: '启用 AI 功能', type: 'boolean' },
    { key: 'feature.dvsf_enabled', value: 'true', group: 'feature', label: '启用 DVSF 分红', type: 'boolean' },
  ];
  for (const c of configs) {
    await prisma.systemConfig.upsert({
      where: { key: c.key },
      update: c,
      create: c,
    });
  }

  // ============================================================
  // 15. OpenClaw 智能体 Seed 数据
  // ============================================================
  console.log('   🤖 Seeding OpenClaw Agents...');

  // 4 个智能体
  const openClawAgents = await Promise.all([
    prisma.openClawAgent.create({
      data: {
        name: '智能客服助手',
        type: 'chatbot',
        description: '基于大语言模型的智能客服机器人,支持多轮对话和意图识别',
        icon: '🤖',
        config: JSON.stringify({ promptTemplate: '你是 WOPC 平台的智能客服助手...', temperature: 0.7, maxTokens: 2048 }),
        tools: JSON.stringify(['web_search', 'knowledge_base', 'order_query', 'faq_match']),
        memoryType: 'hybrid',
        status: 'active',
        runCount: 1520,
        successRate: 96.5,
        avgLatencyMs: 850,
        createdBy: 'admin',
        tags: JSON.stringify(['客服', '对话', 'FAQ']),
      },
    }),
    prisma.openClawAgent.create({
      data: {
        name: 'RPA 财务自动化',
        type: 'rpa_agent',
        description: '自动处理发票录入、对账、报表生成等重复性财务工作',
        icon: '📊',
        config: JSON.stringify({ workflowEngine: 'n8n', retryPolicy: { maxRetries: 3, backoffMs: 1000 } }),
        tools: JSON.stringify(['excel_reader', 'email_sender', 'erp_connector', 'pdf_parser']),
        memoryType: 'short_term',
        status: 'active',
        runCount: 3420,
        successRate: 98.2,
        avgLatencyMs: 3200,
        createdBy: 'admin',
        tags: JSON.stringify(['RPA', '财务', '自动化']),
      },
    }),
    prisma.openClawAgent.create({
      data: {
        name: '数据分析专家',
        type: 'data_analyst',
        description: '自动生成业务分析报告、趋势预测和数据可视化图表',
        icon: '📈',
        config: JSON.stringify({ defaultChartType: 'line', aggregationWindow: '7d', forecastModel: 'prophet' }),
        tools: JSON.stringify(['sql_executor', 'chart_generator', 'statistical_analysis', 'anomaly_detector']),
        memoryType: 'long_term',
        status: 'active',
        runCount: 890,
        successRate: 94.1,
        avgLatencyMs: 4500,
        createdBy: 'admin',
        tags: JSON.stringify(['数据分析', 'BI', '报表']),
      },
    }),
    prisma.openClawAgent.create({
      data: {
        name: '代码助手',
        type: 'code_assistant',
        description: '辅助开发人员编写代码、代码审查、Bug 修复和技术文档生成',
        icon: '💻',
        config: JSON.stringify({ languages: ['typescript', 'python', 'go', 'rust'], lintEnabled: true, testGeneration: true }),
        tools: JSON.stringify(['code_runner', 'git_client', 'linter', 'test_framework']),
        memoryType: 'hybrid',
        status: 'testing',
        runCount: 210,
        successRate: 91.3,
        avgLatencyMs: 2800,
        createdBy: 'developer',
        tags: JSON.stringify(['编程', '开发', 'IDE']),
      },
    }),
  ]);

  // 3 个市场 Item
  const marketplaceItems = [
    { name: '邮件自动分类器', category: 'productivity', description: 'AI 驱动的邮件智能分类和优先级排序工具', icon: '📧', version: '2.1.0', author: 'OpenClaw Team', rating: 4.7, downloadCount: 3580, price: 0, config: JSON.stringify({ categories: ['重要', '普通', '推广', '垃圾'] }), features: JSON.stringify(['自动分类', '优先级标记', '批量操作']), requirements: JSON.stringify({ apiKeys: ['openai'] }) },
    { name: '合同风险扫描器', category: 'security', description: '自动识别合同中的法律风险条款并给出修改建议', icon: '🛡️', version: '1.5.0', author: 'LegalAI Lab', rating: 4.5, downloadCount: 1890, price: 29.9, currency: 'USD', config: JSON.stringify({ riskLevels: ['高', '中', '低'], jurisdictions: ['CN', 'US', 'SG', 'HK'] }), features: JSON.stringify(['风险标注', '条款对比', '合规检查']) },
    { name: '社交媒体内容工厂', category: 'content_creation', description: '一键生成多平台适配的营销文案和配图建议', icon: '✨', version: '3.0.0', author: 'ContentBot', rating: 4.8, downloadCount: 5200, price: 19.9, currency: 'USD', config: JSON.stringify({ platforms: ['wechat', 'weibo', 'xiaohongshu', 'tiktok'], toneOptions: ['正式', '轻松', '幽默', '专业'] }), screenshots: JSON.stringify(['https://example.com/screenshot1.png', 'https://example.com/screenshot2.png']), features: JSON.stringify(['多平台适配', 'A/B 测试', '定时发布', '效果追踪']) },
  ];
  for (const item of marketplaceItems) {
    const existing = await prisma.openClawMarketplaceItem.findFirst({ where: { name: item.name } });
    if (!existing) {
      await prisma.openClawMarketplaceItem.create({ data: item });
    }
  }

  // 2 条微调记录
  for (const ft of [
    { agentId: openClawAgents[0].id, name: '客服对话风格微调', baseModel: 'gpt-4o', datasetName: 'customer_service_v2', datasetSize: 15000, epochs: 5, learningRate: 0.00005, batchSize: 16, status: 'completed', progress: 100, trainedAt: new Date('2026-05-15'), modelOutput: 'ft:gpt-4o-cs-v2-20260515', metrics: JSON.stringify({ loss: 0.123, accuracy: 0.967, f1: 0.954 }) },
    { agentId: openClawAgents[1].id, name: '财务术语理解增强', baseModel: 'qwen2.5-72b', datasetName: 'finance_domain_knowledge', datasetSize: 8000, epochs: 3, learningRate: 0.0001, batchSize: 8, status: 'training', progress: 65, metrics: JSON.stringify({ currentLoss: 0.234, epoch: 2 }) },
  ]) {
    try { await prisma.openClawFineTune.create({ data: ft }); } catch {}
  }

  // 5 条监控日志
  for (const log of [
    { agentId: openClawAgents[0].id, sessionId: 'sess-001', userInput: '如何查询我的订单状态?', agentOutput: '您可以通过以下方式查询订单状态：1. 登录后台查看订单列表...', tokensUsed: 256, latencyMs: 720, status: 'success' },
    { agentId: openClawAgents[0].id, sessionId: 'sess-002', userInput: '萨摩亚公司注册需要什么材料?', agentOutput: '萨摩亚 SPV 注册需要以下材料：1. 股东身份证明 2. 注册地址证明...', tokensUsed: 389, latencyMs: 950, status: 'success' },
    { agentId: openClawAgents[1].id, sessionId: 'sess-003', userInput: '处理 2026年5月 发票文件', agentOutput: null, latencyMs: 3200, status: 'success', metadata: JSON.stringify({ filesProcessed: 47, totalAmount: 125800 }) },
    { agentId: openClawAgents[2].id, sessionId: 'sess-004', userInput: '生成本季度销售趋势报告', agentOutput: '已生成 Q2 销售趋势报告，主要发现：环比增长 23%，东南亚市场贡献最大...', tokensUsed: 1024, latencyMs: 4200, status: 'success' },
    { agentId: openClawAgents[0].id, sessionId: 'sess-005', userInput: '', agentOutput: null, tokensUsed: 0, latencyMs: 30000, status: 'timeout', errorCode: 'TIMEOUT', errorMessage: '请求超时，模型响应时间超过 30 秒' },
  ]) {
    try { await prisma.openClawMonitorLog.create({ data: log }); } catch {}
  }

  // ============================================================
  // 16. n8n 工作流 Seed 数据
  // ============================================================
  console.log('   ⚙️ Seeding n8n Workflows...');

  // 3 个工作流
  const n8nWorkflows = await Promise.all([
    prisma.n8nWorkflow.create({
      data: {
        name: '新用户入职自动化',
        description: '当新用户注册后,自动发送欢迎邮件、创建初始任务清单、分配客服跟进',
        nodes: JSON.stringify([{ id: '1', type: 'webhook', name: '用户注册触发' }, { id: '2', type: 'sendEmail', name: '发送欢迎邮件' }, { id: '3', type: 'createTask', name: '创建任务' }, { id: '4', type: 'notifySlack', name: '通知客服' }]),
        connections: JSON.stringify([['1->2'], ['2->3'], ['3->4']]),
        settings: JSON.stringify({ timeoutMs: 30000, retryCount: 3, errorHandling: 'continue' }),
        status: 'active',
        version: 3,
        runCount: 245,
        lastRunAt: new Date('2026-06-07T08:30:00Z'),
        lastStatus: 'success',
        tags: JSON.stringify(['onboarding', 'automation', 'email']),
        createdBy: 'admin',
      },
    }),
    prisma.n8nWorkflow.create({
      data: {
        name: '支付回调处理流水线',
        description: '接收各支付渠道的异步通知,验证签名,更新订单状态,发送确认通知',
        nodes: JSON.stringify([{ id: '1', type: 'webhook', name: '支付回调接收' }, { id: '2', type: 'verifySignature', name: '验签' }, { id: '3', type: 'updateOrder', name: '更新订单' }, { id: '4', type: 'sendNotification', name: '通知用户' }, { id: '5', type: 'logAudit', name: '审计日志' }]),
        connections: JSON.stringify([['1->2'], ['2->3'], ['2->err->5'], ['3->4']]),
        settings: JSON.stringify({ timeoutMs: 15000, retryCount: 1, errorHandling: 'stop' }),
        status: 'active',
        version: 5,
        runCount: 1890,
        lastRunAt: new Date('2026-06-07T10:15:00Z'),
        lastStatus: 'success',
        tags: JSON.stringify(['payment', 'callback', 'finance']),
        createdBy: 'admin',
      },
    }),
    prisma.n8nWorkflow.create({
      data: {
        name: '定期合规巡检',
        description: '每日凌晨检查所有公司的合规状态,发现异常自动告警',
        nodes: JSON.stringify([{ id: '1', type: 'cronTrigger', name: '每日定时触发' }, { id: '2', type: 'queryCompanies', name: '查询公司列表' }, { id: '3', type: 'checkCompliance', name: '合规检查' }, { id: '4', type: 'filterAlert', name: '过滤异常' }, { id: '5', type: 'sendAlert', name: '发送告警' }]),
        connections: JSON.stringify([['1->2'], ['2->3'], ['3->4'], ['4->5']]),
        settings: JSON.stringify({ timeoutMs: 60000, retryCount: 2, errorHandling: 'continue' }),
        status: 'active',
        version: 2,
        runCount: 156,
        lastRunAt: new Date('2026-06-07T02:00:00Z'),
        lastStatus: 'success',
        tags: JSON.stringify(['compliance', 'cron', 'monitoring']),
        createdBy: 'admin',
      },
    }),
  ]);

  // 4 个触发器
  for (const trigger of [
    { workflowId: n8nWorkflows[0].id, type: 'webhook', name: '用户注册 Webhook', config: JSON.stringify({ path: '/webhook/user-registered', method: 'POST', authentication: 'none' }), isActive: true, lastTriggered: new Date('2026-06-07T08:30:00Z'), triggerCount: 245, errorCount: 2 },
    { workflowId: n8nWorkflows[0].id, type: 'schedule', name: '每日新用户汇总', config: JSON.stringify({ cron: '0 9 * * *', timezone: 'Asia/Shanghai' }), isActive: true, lastTriggered: new Date('2026-06-07T09:00:00Z'), triggerCount: 30 },
    { workflowId: n8nWorkflows[1].id, type: 'webhook', name: 'Stripe 回调', config: JSON.stringify({ path: '/webhook/stripe-callback', method: 'POST', authentication: 'signature' }), isActive: true, lastTriggered: new Date('2026-06-07T10:15:00Z'), triggerCount: 1200, errorCount: 5, lastError: '签名验证失败: timestamp too old' },
    { workflowId: n8nWorkflows[2].id, type: 'cron', name: '每日合规巡检 Cron', config: JSON.stringify({ expression: '0 2 * * *', timezone: 'UTC' }), isActive: true, lastTriggered: new Date('2026-06-07T02:00:00Z'), triggerCount: 156 },
  ]) {
    try { await prisma.n8nTrigger.create({ data: trigger }); } catch {}
  }

  // 5 条执行记录
  for (const exec of [
    { workflowId: n8nWorkflows[0].id, triggerType: 'webhook', status: 'success', startedAt: new Date('2026-06-07T08:30:00Z'), finishedAt: new Date('2026-06-07T08:30:03Z'), durationMs: 3200, outputPayload: JSON.stringify({ emailSent: true, taskCreated: true, slackNotified: true }) },
    { workflowId: n8nWorkflows[1].id, triggerType: 'webhook', status: 'success', startedAt: new Date('2026-06-07T10:15:00Z'), finishedAt: new Date('2026-06-07T10:15:01Z'), durationMs: 1100, inputPayload: JSON.stringify({ eventType: 'payment.success', orderId: 'WO-2026-0156', amount: 2800 }), outputPayload: JSON.stringify({ orderUpdated: true, notificationSent: true }) },
    { workflowId: n8nWorkflows[1].id, triggerType: 'webhook', status: 'error', startedAt: new Date('2026-06-07T09:45:00Z'), finishedAt: new Date('2026-06-07T09:45:02Z'), durationMs: 2300, errorMessage: '签名验证失败', retryCount: 1 },
    { workflowId: n8nWorkflows[2].id, triggerType: 'cron', status: 'success', startedAt: new Date('2026-06-07T02:00:00Z'), finishedAt: new Date('2026-06-07T02:00:45Z'), durationMs: 45000, nodeResults: JSON.stringify({ companiesChecked: 128, alertsGenerated: 3, emailsSent: 3 }) },
    { workflowId: n8nWorkflows[0].id, triggerType: 'schedule', status: 'running', startedAt: new Date('2026-06-07T09:00:00Z') },
  ]) {
    try { await prisma.n8nExecution.create({ data: exec }); } catch {}
  }

  // 4 个模板
  const n8nTemplates = [
    { name: '邮件营销自动化', category: 'marketing', description: '从 CSV 导入联系人列表,通过邮件模板群发营销邮件并跟踪打开率', nodes: JSON.stringify([{ type: 'csvReader' }, { type: 'templateRenderer' }, { type: 'batchEmailSender' }, { type: 'tracker' }]), connections: JSON.stringify([['0->1'], ['1->2'], ['2->3']]), useCount: 892, rating: 4.6, difficulty: 'beginner', tags: JSON.stringify(['邮件', '营销', 'CRM']), author: 'n8n Community', isOfficial: true },
    { name: '数据库同步管道', category: 'integration', description: '定时从 MySQL 同步数据到 PostgreSQL,支持增量同步和冲突解决', nodes: JSON.stringify([{ type: 'cronTrigger' }, { type: 'mysqlQuery' }, { type: 'dataTransform' }, { type: 'postgresUpsert' }, { type: 'conflictResolver' }]), connections: JSON.stringify([['0->1'], ['1->2'], ['2->3'], ['3->4']]), useCount: 456, rating: 4.3, difficulty: 'intermediate', tags: JSON.stringify(['数据库', 'ETL', '同步']), author: 'DataOps Team' },
    { name: 'AI 文档摘要生成', category: 'ai', description: '上传 PDF/Word 文档,调用 AI 大模型自动生成结构化摘要和关键信息提取', nodes: JSON.stringify([{ type: 'fileUpload' }, { type: 'documentParser' }, { type: 'llmCall' }, { type: 'summaryFormatter' }, { type: 'saveResult' }]), connections: JSON.stringify([['0->1'], ['1->2'], ['2->3'], ['3->4']]), useCount: 1203, rating: 4.8, difficulty: 'advanced', tags: JSON.stringify(['AI', '文档', 'NLP']), author: 'OpenClaw Team', isOfficial: true },
    { name: '工单 SLA 告警', category: 'automation', description: '监控工单处理时间,接近 SLA 阈值时自动升级通知负责人', nodes: JSON.stringify([{ type: 'cronTrigger' }, { type: 'queryTickets' }, { type: 'slaCalculator' }, { type: 'escalationCheck' }, { type: 'notifyManager' }]), connections: JSON.stringify([['0->1'], ['1->2'], ['2->3'], ['3->4']]), useCount: 334, rating: 4.4, difficulty: 'beginner', tags: JSON.stringify(['工单', 'SLA', '告警']), author: 'Ops Team' },
  ];
  for (const tpl of n8nTemplates) {
    const existing = await prisma.n8nTemplate.findFirst({ where: { name: tpl.name } });
    if (!existing) {
      await prisma.n8nTemplate.create({ data: tpl });
    }
  }

  // ============================================================
  // 17. AI 大模型集成 Seed 数据
  // ============================================================
  console.log('   🧠 Seeding AI Model Providers...');

  // 6 个 Provider
  const aiProviders = await Promise.all([
    prisma.aiModelProvider.create({ data: { name: 'OpenAI', code: 'openai', type: 'cloud', apiUrl: 'https://api.openai.com/v1', apiKey: 'sk-openai-seed-key-xxx', status: 'active', maxRpm: 500, maxTpm: 150000, description: 'GPT 系列模型提供商,业界领先的大语言模型' } }),
    prisma.aiModelProvider.create({ data: { name: 'Anthropic', code: 'anthropic', type: 'cloud', apiUrl: 'https://api.anthropic.com/v1', apiKey: 'sk-ant-seed-key-xxx', status: 'active', maxRpm: 300, maxTpm: 1000000, description: 'Claude 系列,擅长长文本分析和复杂推理' } }),
    prisma.aiModelProvider.create({ data: { name: 'Google', code: 'google', type: 'cloud', apiUrl: 'https://generativelanguage.googleapis.com/v1beta', apiKey: 'AIza-seed-google-xxx', status: 'active', maxRpm: 400, maxTpm: 2000000, description: 'Gemini 系列,多模态能力强' } }),
    prisma.aiModelProvider.create({ data: { name: 'DeepSeek', code: 'deepseek', type: 'cloud', apiUrl: 'https://api.deepseek.com/v1', apiKey: 'sk-ds-seed-key-xxx', status: 'active', maxRpm: 200, maxTpm: 500000, description: 'DeepSeek 系列,性价比极高的中文优化模型' } }),
    prisma.aiModelProvider.create({ data: { name: 'Qwen (通义千问)', code: 'qwen', type: 'cloud', apiUrl: 'https://dashscope.aliyuncs.com/api/v1', apiKey: 'sk-qwen-seed-key-xxx', status: 'active', maxRpm: 300, maxTpm: 800000, description: '阿里通义千问系列,中文场景表现优异' } }),
    prisma.aiModelProvider.create({ data: { name: 'Ollama', code: 'ollama', type: 'self_hosted', apiUrl: 'http://localhost:11434/v1', status: 'active', maxRpm: 60, maxTpm: 200000, description: '本地部署的开源模型运行环境,支持 Llama/Qwen/Mistral 等' } }),
  ]);

  // 12 个 Model 实例
  const aiInstances = await Promise.all([
    prisma.aiModelInstance.create({ data: { providerId: aiProviders[0].id, modelId: 'gpt-4o', name: 'GPT-4o', alias: 'GPT-4 Omni', contextWindow: 128000, maxOutput: 16384, inputPrice: 2.5, outputPrice: 10, capabilities: JSON.stringify(['vision', 'function_calling', 'json_mode', 'streaming']), supportsVision: true, supportsTools: true, status: 'available', sortOrder: 1, isRecommended: true } }),
    prisma.aiModelInstance.create({ data: { providerId: aiProviders[0].id, modelId: 'gpt-4o-mini', name: 'GPT-4o Mini', alias: '轻量 GPT-4o', contextWindow: 128000, maxOutput: 16384, inputPrice: 0.15, outputPrice: 0.6, capabilities: JSON.stringify(['vision', 'function_calling', 'json_mode', 'streaming']), supportsVision: true, supportsTools: true, status: 'available', sortOrder: 2, isRecommended: false } }),
    prisma.aiModelInstance.create({ data: { providerId: aiProviders[1].id, modelId: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', alias: null, contextWindow: 200000, maxOutput: 8192, inputPrice: 3, outputPrice: 15, capabilities: JSON.stringify(['vision', 'function_calling', 'json_mode', 'streaming']), supportsVision: true, supportsTools: true, status: 'available', sortOrder: 1, isRecommended: true } }),
    prisma.aiModelInstance.create({ data: { providerId: aiProviders[1].id, modelId: 'claude-3-haiku', name: 'Claude 3 Haiku', alias: '快速 Claude', contextWindow: 200000, maxOutput: 4096, inputPrice: 0.25, outputPrice: 1.25, capabilities: JSON.stringify(['vision', 'function_calling', 'streaming']), supportsVision: true, supportsTools: true, status: 'available', sortOrder: 2, isRecommended: false } }),
    prisma.aiModelInstance.create({ data: { providerId: aiProviders[2].id, modelId: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', alias: null, contextWindow: 1000000, maxOutput: 8192, inputPrice: 1.25, outputPrice: 5, capabilities: JSON.stringify(['vision', 'function_calling', 'json_mode', 'streaming', 'long_context']), supportsVision: true, supportsTools: true, status: 'available', sortOrder: 1, isRecommended: true } }),
    prisma.aiModelInstance.create({ data: { providerId: aiProviders[2].id, modelId: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', alias: '快速 Gemini', contextWindow: 1000000, maxOutput: 8192, inputPrice: 0.075, outputPrice: 0.3, capabilities: JSON.stringify(['vision', 'function_calling', 'streaming', 'long_context']), supportsVision: true, supportsTools: true, status: 'available', sortOrder: 2, isRecommended: false } }),
    prisma.aiModelInstance.create({ data: { providerId: aiProviders[3].id, modelId: 'deepseek-chat', name: 'DeepSeek V3', alias: null, contextWindow: 64000, maxOutput: 8192, inputPrice: 0.27, outputPrice: 1.1, capabilities: JSON.stringify(['function_calling', 'json_mode', 'streaming']), supportsVision: false, supportsTools: true, status: 'available', sortOrder: 1, isRecommended: true } }),
    prisma.aiModelInstance.create({ data: { providerId: aiProviders[3].id, modelId: 'deepseek-reasoner', name: 'DeepSeek R1', alias: '推理增强版', contextWindow: 64000, maxOutput: 8192, inputPrice: 0.55, outputPrice: 2.19, capabilities: JSON.stringify(['reasoning', 'json_mode', 'streaming']), supportsVision: false, supportsTools: false, status: 'available', sortOrder: 2, isRecommended: false } }),
    prisma.aiModelInstance.create({ data: { providerId: aiProviders[4].id, modelId: 'qwen-plus', name: 'Qwen Plus', alias: null, contextWindow: 131072, maxOutput: 8192, inputPrice: 0.4, outputPrice: 1.2, capabilities: JSON.stringify(['function_calling', 'json_mode', 'streaming']), supportsVision: false, supportsTools: true, status: 'available', sortOrder: 1, isRecommended: true } }),
    prisma.aiModelInstance.create({ data: { providerId: aiProviders[4].id, modelId: 'qwen-turbo', name: 'Qwen Turbo', alias: '高速通义', contextWindow: 131072, maxOutput: 8192, inputPrice: 0.12, outputPrice: 0.36, capabilities: JSON.stringify(['function_calling', 'streaming']), supportsVision: false, supportsTools: true, status: 'available', sortOrder: 2, isRecommended: false } }),
    prisma.aiModelInstance.create({ data: { providerId: aiProviders[5].id, modelId: 'llama3.1-70b', name: 'Llama 3.1 70B', alias: null, contextWindow: 128000, maxOutput: 8192, inputPrice: 0, outputPrice: 0, capabilities: JSON.stringify(['function_calling', 'json_mode', 'streaming']), supportsVision: false, supportsTools: true, status: 'available', sortOrder: 1, isRecommended: false } }),
    prisma.aiModelInstance.create({ data: { providerId: aiProviders[5].id, modelId: 'qwen2.5-72b', name: 'Qwen2.5 72B', alias: '本地 Qwen', contextWindow: 128000, maxOutput: 8192, inputPrice: 0, outputPrice: 0, capabilities: JSON.stringify(['function_calling', 'json_mode', 'streaming']), supportsVision: false, supportsTools: true, status: 'available', sortOrder: 2, isRecommended: false } }),
  ]);

  // 6 条识别配置
  for (const rec of [
    { instanceId: aiInstances[0].id, taskType: 'ocr', name: '通用 OCR 识别', inputSample: '上传图片 URL 或 Base64', outputFormat: JSON.stringify({ text: '提取的文本内容', confidence: '置信度 0-1', blocks: '文本块数组' }), accuracy: 97.8, avgLatencyMs: 1200, callCount: 3450, status: 'active', config: JSON.stringify({ languages: ['zh', 'en', 'ja', 'ko'] }) },
    { instanceId: aiInstances[2].id, taskType: 'sentiment', name: '情感分析引擎', inputSample: '待分析的文本段落', outputFormat: JSON.stringify({ sentiment: 'positive/negative/neutral', score: '-1 到 1', aspects: '方面情感数组' }), accuracy: 94.5, avgLatencyMs: 450, callCount: 12800, status: 'active' },
    { instanceId: aiInstances[4].id, taskType: 'entity_extraction', name: '实体抽取(长文档)', inputSample: '合同或法律文档全文', outputFormat: JSON.stringify({ entities: [{ type: '实体类型', text: '原文', position: '位置' }] }), accuracy: 93.2, avgLatencyMs: 2800, callCount: 890, status: 'active', config: JSON.stringify({ entityTypes: ['PERSON', 'ORG', 'DATE', 'MONEY', 'LOCATION'] }) },
    { instanceId: aiInstances[6].id, taskType: 'summarization', name: '中文文档摘要', inputSample: '文章或报告正文', outputFormat: JSON.stringify({ summary: '摘要文本', keywords: '关键词数组', length: '原文比例' }), accuracy: 91.0, avgLatencyMs: 1800, callCount: 5670, status: 'active' },
    { instanceId: aiInstances[0].id, taskType: 'image_classify', name: '图像分类', inputSample: '图片 URL', outputFormat: JSON.stringify({ labels: [{ label: '类别名', score: '置信度' }] }), accuracy: 95.3, avgLatencyMs: 900, callCount: 2130, status: 'active' },
    { instanceId: aiInstances[8].id, taskType: 'translation', name: '中英互译', inputSample: '源语言文本', outputFormat: JSON.stringify({ translatedText: '译文', sourceLang: '检测到的源语言', targetLang: '目标语言' }), accuracy: 96.1, avgLatencyMs: 600, callCount: 18900, status: 'active' },
  ]) {
    try { await prisma.aiSmartRecognition.create({ data: rec }); } catch {}
  }

  // 8 条推荐规则
  for (const rec of [
    { instanceId: aiInstances[0].id, scenario: 'coding', score: 92, reason: 'GPT-4o 在代码生成和调试方面表现出色,支持多种编程语言', pros: JSON.stringify(['代码质量高', '多语言支持', '函数调用强']), cons: JSON.stringify(['价格较高', '上下文不如 Claude 长']), useCases: JSON.stringify(['代码补全', 'Bug 修复', '代码审查', '重构建议']), benchmarkData: JSON.stringify({ HumanEval: 92.0, MBPP: 89.5 }), sortOrder: 1, isActive: true },
    { instanceId: aiInstances[2].id, scenario: 'coding', score: 88, reason: 'Claude 3.5 Sonnet 在复杂代码理解和长项目分析上优势明显', pros: JSON.stringify(['超长上下文', '推理能力强', '安全对齐好']), cons: JSON.stringify(['速度略慢', '价格偏高']), useCases: JSON.stringify(['架构设计', '代码审查', '技术文档']), benchmarkData: JSON.stringify({ HumanEval: 88.5, MBPP: 86.0 }), sortOrder: 2, isActive: true },
    { instanceId: aiInstances[2].id, scenario: 'writing', score: 95, reason: 'Claude 在写作任务上公认最佳,文笔自然流畅', pros: JSON.stringify(['文笔优秀', '长文一致性好', '风格可调']), cons: JSON.stringify(['价格较高']), useCases: JSON.stringify(['文章撰写', '邮件撰写', '营销文案', '翻译润色']), benchmarkData: JSON.stringify({ writingScore: 95 }), sortOrder: 1, isActive: true },
    { instanceId: aiInstances[0].id, scenario: 'writing', score: 87, reason: 'GPT-4o 写作能力均衡,适合大多数日常写作场景', pros: JSON.stringify(['速度快', '性价比合理', '多语言']), cons: JSON.stringify(['长文一致性一般']), useCases: JSON.stringify(['日常沟通', '简报', '社交媒体']), benchmarkData: JSON.stringify({ writingScore: 87 }), sortOrder: 2, isActive: true },
    { instanceId: aiInstances[4].id, scenario: 'long_context', score: 98, reason: 'Gemini 1.5 Pro 支持 100万 token 上下文,长文档处理无敌', pros: JSON.stringify(['百万 token 上下文', '多模态原生', '价格低']), cons: JSON.stringify(['工具调用较弱', '部分功能不稳定']), useCases: JSON.stringify(['整本书分析', '大型代码库理解', '长报告处理']), benchmarkData: JSON.stringify({ maxContext: 1000000 }), sortOrder: 1, isActive: true },
    { instanceId: aiInstances[6].id, scenario: 'analysis', score: 85, reason: 'DeepSeek V3 性价比极高,适合大规模数据分析任务', pros: JSON.stringify(['价格极低', '中文能力强', '速度快']), cons: JSON.stringify(['英文能力一般', '工具调用有限']), useCases: JSON.stringify(['数据分析', '报表生成', '信息抽取']), benchmarkData: JSON.stringify({ costPerMToken: 0.27 }), sortOrder: 1, isActive: true },
    { instanceId: aiInstances[8].id, scenario: 'chat', score: 82, reason: 'Qwen Plus 中文对话体验佳,适合国内用户场景', pros: JSON.stringify(['中文优秀', '阿里生态整合', '稳定可靠']), cons: JSON.stringify(['英文能力一般', '创意能力有限']), useCases: JSON.stringify(['客服聊天', '问答系统', '知识库对话']), benchmarkData: JSON.stringify({ cmmluScore: 88.2 }), sortOrder: 1, isActive: true },
    { instanceId: aiInstances[2].id, scenario: 'reasoning', score: 90, reason: 'Claude 3.5 Sonnet 在逻辑推理和数学问题上表现突出', pros: JSON.stringify(['逻辑严谨', '步骤清晰', '错误率低']), cons: JSON.stringify(['计算速度较慢']), useCases: JSON.stringify(['数学求解', '逻辑推理', '决策分析']), benchmarkData: JSON.stringify({ mathScore: 90.1, logicScore: 91.5 }), sortOrder: 1, isActive: true },
  ]) {
    try { await prisma.aiRecommendation.create({ data: rec }); } catch {}
  }

  // 5 个 Prompt 模板
  const promptTemplates = [
    { name: '专业商务邮件', category: 'user', description: '根据主题和要点生成专业的商务邮件', template: '请写一封{{tone}}语气的商务邮件,收件人是{{recipient}},主题是{{subject}},需要包含以下要点:\n{{keyPoints}}\n\n要求:简洁专业,不超过{{wordLimit}}字。', variables: JSON.stringify([{ name: 'tone', type: 'string', required: true, default: '正式', description: '语气风格' }, { name: 'recipient', type: 'string', required: true, description: '收件人' }, { name: 'subject', type: 'string', required: true, description: '邮件主题' }, { name: 'keyPoints', type: 'text', required: true, description: '要点列表' }, { name: 'wordLimit', type: 'number', required: false, default: '500', description: '字数限制' }]), modelHint: 'claude-3.5-sonnet', outputExample: '尊敬的张先生,\n\n关于贵司提出的合作意向...', tags: JSON.stringify(['邮件', '商务', '写作']), useCount: 2340, rating: 4.7, createdBy: 'admin' },
    { name: '代码审查助手', category: 'function_calling', description: '系统性审查代码质量、安全和性能问题', template: '请审查以下{{language}}代码,重点关注:\n1. 代码质量和可维护性\n2. 安全漏洞\n3. 性能优化空间\n4. 最佳实践遵循\n\n代码:\n```\n{{code}}\n```\n\n请以结构化格式输出审查结果。', variables: JSON.stringify([{ name: 'language', type: 'string', required: true, description: '编程语言' }, { name: 'code', type: 'text', required: true, description: '待审查代码' }]), modelHint: 'gpt-4o or claude-3.5-sonnet', outputExample: JSON.stringify({ overallScore: 'B+', issues: [], suggestions: [] }), tags: JSON.stringify(['代码', '审查', 'DevOps']), useCount: 1890, rating: 4.8, createdBy: 'developer' },
    { name: '合同风险评估', category: 'system', description: '分析合同条款中的潜在法律风险', template: '你是一位资深法务专家。请分析以下合同中的法律风险点:\n\n{{contractText}}\n\n请按以下维度评估:\n- 高风险条款(红色)\n- 中等风险条款(黄色)\n- 建议修改的内容\n- 整体风险等级(1-10)', variables: JSON.stringify([{ name: 'contractText', type: 'text', required: true, description: '合同文本' }]), modelHint: 'claude-3.5-sonnet', outputExample: JSON.stringify({ riskLevel: 6, highRisk: [], mediumRisk: [], recommendations: [] }), tags: JSON.stringify(['法务', '合同', '风控']), useCount: 890, rating: 4.5, createdBy: 'legal' },
    { name: '思维链推理模板', category: 'chain_of_thought', description: '引导 AI 进行逐步推理,提高复杂问题的回答准确率', template: '请使用思维链(Chain of Thought)方法逐步分析以下问题:\n\n{{question}}\n\n要求:\n1. 先明确问题的核心要素\n2. 逐步拆解子问题\n3. 对每个子问题进行推理\n4. 综合得出最终答案\n5. 标注每一步的置信度', variables: JSON.stringify([{ name: 'question', type: 'text', required: true, description: '需要推理的问题' }]), modelHint: 'claude-3.5-sonnet or deepseek-reasoner', outputExample: '## 问题分析\n### 步骤1: ...\n### 步骤2: ...\n## 最终结论', tags: JSON.stringify(['CoT', '推理', '复杂问题']), useCount: 3450, rating: 4.9, createdBy: 'admin' },
    { name: '数据报表生成器', category: 'few_shot', description: '根据数据指标自动生成结构化业务分析报表', template: '根据以下数据生成{{reportType}}报告:\n\n数据概览:\n{{dataOverview}}\n\n关键指标:\n{{metrics}}\n\n参考格式:\n{{exampleReport}}\n\n请按照类似格式生成报告,包含数据洞察和建议。', variables: JSON.stringify([{ name: 'reportType', type: 'select', required: true, options: ['周报', '月报', '季报', '年报'] }, { name: 'dataOverview', type: 'json', required: true, description: '数据概览 JSON' }, { name: 'metrics', type: 'json', required: true, description: '关键指标 JSON' }, { name: 'exampleReport', type: 'text', required: false, description: '示例报告(可选)' }]), modelHint: 'gpt-4o or gemini-1.5-pro', outputExample: '# {{reportType}} 业务报告\n\n## 执行摘要\n\n## 关键指标分析\n\n## 趋势洞察\n\n## 行动建议', tags: JSON.stringify(['报表', 'BI', '数据分析']), useCount: 1560, rating: 4.6, createdBy: 'analyst' },
  ];
  for (const pt of promptTemplates) {
    const existing = await prisma.aiPromptTemplate.findFirst({ where: { name: pt.name } });
    if (!existing) {
      await prisma.aiPromptTemplate.create({ data: pt });
    }
  }

  // 7 条成本记录
  for (const cost of [
    { providerId: aiProviders[0].id, date: new Date('2026-06-01'), modelId: 'gpt-4o', requestCount: 1250, inputTokens: BigInt(2500000), outputTokens: BigInt(500000), inputCost: 6.25, outputCost: 5, totalCost: 11.25, cacheHitRate: 0.32, avgLatencyMs: 850 },
    { providerId: aiProviders[0].id, date: new Date('2026-06-02'), modelId: 'gpt-4o-mini', requestCount: 3400, inputTokens: BigInt(17000000), outputTokens: BigInt(3400000), inputCost: 2.55, outputCost: 2.04, totalCost: 4.59, cacheHitRate: 0.45, avgLatencyMs: 420 },
    { providerId: aiProviders[1].id, date: new Date('2026-06-01'), modelId: 'claude-3.5-sonnet', requestCount: 890, inputTokens: BigInt(1780000), outputTokens: BigInt(445000), inputCost: 5.34, outputCost: 6.675, totalCost: 12.015, cacheHitRate: 0.18, avgLatencyMs: 1100 },
    { providerId: aiProviders[3].id, date: new Date('2026-06-01'), modelId: 'deepseek-chat', requestCount: 5600, inputTokens: BigInt(28000000), outputTokens: BigInt(5600000), inputCost: 7.56, outputCost: 6.16, totalCost: 13.72, cacheHitRate: 0.12, avgLatencyMs: 380 },
    { providerId: aiProviders[4].id, date: new Date('2026-06-03'), modelId: 'qwen-plus', requestCount: 2300, inputTokens: BigInt(11500000), outputTokens: BigInt(2300000), inputCost: 4.6, outputCost: 2.76, totalCost: 7.36, cacheHitRate: 0.25, avgLatencyMs: 520 },
    { providerId: aiProviders[2].id, date: new Date('2026-06-02'), modelId: 'gemini-1.5-pro', requestCount: 450, inputTokens: BigInt(22500000), outputTokens: BigInt(2250000), inputCost: 2.8125, outputCost: 1.125, totalCost: 3.9375, cacheHitRate: 0.55, avgLatencyMs: 980 },
    { providerId: aiProviders[0].id, date: new Date('2026-06-05'), modelId: 'gpt-4o', requestCount: 1580, inputTokens: BigInt(3160000), outputTokens: BigInt(632000), inputCost: 7.9, outputCost: 6.32, totalCost: 14.22, cacheHitRate: 0.38, avgLatencyMs: 920 },
  ]) {
    try { await prisma.aiModelCostRecord.create({ data: cost }); } catch {}
  }

  // ============================================================
  // 18. BPM 工作流引擎 Seed 数据
  // ============================================================
  console.log('   🔄 Seeding BPM Process Engine...');

  // 4 个流程定义
  const bpmDefs = await Promise.all([
    prisma.bpmProcessDef.create({
      data: {
        name: '公司注册审批流程',
        code: 'COMPANY_REG_APPROVAL',
        category: 'approval',
        description: '新公司注册申请的多级审批流程,包含初审、法务审核、终审环节',
        version: 3,
        definition: JSON.stringify({ nodes: ['start', 'submit', 'legalReview', 'financeApproval', 'register', 'end'], gates: ['legalPass', 'financePass'] }),
        formConfig: JSON.stringify([{ field: 'companyName', label: '公司名称', type: 'text', required: true }, { field: 'jurisdiction', label: '注册地', type: 'select', options: ['Samoa', 'Hong Kong', 'Singapore', 'BVI'] }, { field: 'businessScope', label: '经营范围', type: 'textarea' }]),
        variables: JSON.stringify([{ name: 'totalAmount', type: 'number' }, { name: 'priority', type: 'string' }, { name: 'notes', type: 'text' }]),
        status: 'active',
        priority: 'high',
        createdBy: 'admin',
      },
    }),
    prisma.bpmProcessDef.create({
      data: {
        name: '员工入职 Onboarding',
        code: 'EMPLOYEE_ONBOARDING',
        category: 'hr',
        description: '新员工入职全流程:资料提交 → IT 配置 → 培训安排 → 入职确认',
        version: 2,
        definition: JSON.stringify({ nodes: ['start', 'docSubmit', 'itSetup', 'training', 'confirm', 'end'], gates: ['docsComplete', 'itReady'] }),
        formConfig: JSON.stringify([{ field: 'employeeName', label: '姓名', type: 'text' }, { field: 'department', label: '部门', type: 'select' }, { field: 'startDate', label: '入职日期', type: 'date' }]),
        status: 'active',
        priority: 'normal',
        createdBy: 'hr_admin',
      },
    }),
    prisma.bpmProcessDef.create({
      data: {
        name: '采购申请审批',
        code: 'PROCUREMENT_APPROVAL',
        category: 'procurement',
        description: '采购需求申请审批流程,根据金额自动路由到不同审批层级',
        version: 1,
        definition: JSON.stringify({ nodes: ['start', 'submit', 'managerApprove', 'directorApprove', 'financeApprove', 'purchase', 'end'], gates: ['amountGate'] }),
        formConfig: JSON.stringify([{ field: 'itemName', label: '采购项', type: 'text' }, { field: 'amount', label: '金额', type: 'number' }, { field: 'vendor', label: '供应商', type: 'text' }]),
        variables: JSON.stringify([{ name: 'amount', type: 'number' }, { name: 'urgency', type: 'string' }]),
        status: 'active',
        priority: 'normal',
        createdBy: 'admin',
      },
    }),
    prisma.bpmProcessDef.create({
      data: {
        name: '退款审批流程',
        code: 'REFUND_APPROVAL',
        category: 'finance',
        description: '客户退款申请审批,涉及客服核实、财务审核、打款执行',
        version: 1,
        definition: JSON.stringify({ nodes: ['start', 'apply', 'csVerify', 'financeAudit', 'approve', 'executeRefund', 'end'], gates: ['validRefund', 'approved'] }),
        formConfig: JSON.stringify([{ field: 'orderNo', label: '订单号', type: 'text' }, { field: 'refundAmount', label: '退款金额', type: 'number' }, { field: 'reason', label: '原因', type: 'textarea' }]),
        variables: JSON.stringify([{ name: 'orderNo', type: 'string' }, { name: 'refundAmount', type: 'number' }, { name: 'reason', type: 'text' }]),
        status: 'active',
        priority: 'high',
        createdBy: 'finance_admin',
      },
    }),
  ]);

  // 3 个运行实例
  const bpmInstances = await Promise.all([
    prisma.bpmProcessInstance.create({
      data: {
        defId: bpmDefs[0].id,
        instanceNo: 'BPM-2026-0001',
        title: '张创业 - 萨摩亚 SPV 公司注册',
        initiator: 'zhang',
        status: 'running',
        priority: 'high',
        currentNodes: JSON.stringify(['financeApproval']),
        formData: JSON.stringify({ companyName: 'Zhang Tech SPV Ltd', jurisdiction: 'Samoa', businessScope: '跨境电商、技术服务' }),
        startedAt: new Date('2026-06-05T09:00:00Z'),
      },
    }),
    prisma.bpmProcessInstance.create({
      data: {
        defId: bpmDefs[1].id,
        instanceNo: 'BPM-2026-0002',
        title: '王明 - 新员工入职',
        initiator: 'hr_admin',
        status: 'completed',
        priority: 'normal',
        currentNodes: JSON.stringify([]),
        formData: JSON.stringify({ employeeName: '王明', department: '技术研发部', startDate: '2026-06-10' }),
        startedAt: new Date('2026-06-01T10:00:00Z'),
        completedAt: new Date('2026-06-03T16:00:00Z'),
        durationHours: 54,
      },
    }),
    prisma.bpmProcessInstance.create({
      data: {
        defId: bpmDefs[2].id,
        instanceNo: 'BPM-2026-0003',
        title: '采购 MacBook Pro 16寸 x2',
        initiator: 'tech_lead',
        status: 'running',
        priority: 'normal',
        currentNodes: JSON.stringify(['directorApprove']),
        formData: JSON.stringify({ itemName: 'MacBook Pro 16寸 M3 Max', amount: 7998, vendor: 'Apple 官方' }),
        variables: JSON.stringify({ amount: 7998, urgency: 'normal' }),
        startedAt: new Date('2026-06-06T14:00:00Z'),
      },
    }),
  ]);

  // 6+1 个任务
  for (const task of [
    { instanceId: bpmInstances[0].id, nodeId: 'legalReview', nodeName: '法务审核', assignee: 'legal_officer', assigneeRole: '法务专员', type: 'approval', status: 'completed', priority: 'high', completedAt: new Date('2026-06-05T15:00:00Z'), comment: '资料齐全,无异常' },
    { instanceId: bpmInstances[0].id, nodeId: 'financeApproval', nodeName: '财务审批', assignee: 'finance_manager', assigneeRole: '财务经理', type: 'approval', status: 'in_progress', priority: 'high', dueDate: new Date('2026-06-09T18:00:00Z') },
    { instanceId: bpmInstances[1].id, nodeId: 'docSubmit', nodeName: '资料提交', assignee: 'wang_ming', type: 'input', status: 'completed', completedAt: new Date('2026-06-01T10:30:00Z') },
    { instanceId: bpmInstances[1].id, nodeId: 'itSetup', nodeName: 'IT 配置', assignee: 'it_support', type: 'approval', status: 'completed', completedAt: new Date('2026-06-02T11:00:00Z'), comment: '账号和设备已就绪' },
    { instanceId: bpmInstances[1].id, nodeId: 'confirm', nodeName: '入职确认', assignee: 'wang_ming', type: 'sign', status: 'completed', completedAt: new Date('2026-06-03T16:00:00Z') },
    { instanceId: bpmInstances[2].id, nodeId: 'managerApprove', nodeName: '主管审批', assignee: 'cto', assigneeRole: 'CTO', type: 'approval', status: 'completed', priority: 'normal', completedAt: new Date('2026-06-06T16:00:00Z'), comment: '同意采购,走总监审批' },
    { instanceId: bpmInstances[2].id, nodeId: 'directorApprove', nodeName: '总监审批', assignee: 'coo', assigneeRole: 'COO', type: 'approval', status: 'pending', priority: 'normal', dueDate: new Date('2026-06-08T18:00:00Z') },
  ]) {
    try { await prisma.bpmTask.create({ data: task }); } catch {}
  }

  // 5 条监控指标
  for (const metric of [
    { defId: bpmDefs[0].id, date: new Date('2026-06-01'), totalInstances: 12, completedCnt: 8, cancelledCnt: 1, rejectedCnt: 1, avgDurationHrs: 48, overdueCnt: 2, activeCnt: 2, bottleneckNode: 'financeApproval' },
    { defId: bpmDefs[0].id, date: new Date('2026-06-02'), totalInstances: 8, completedCnt: 6, cancelledCnt: 0, rejectedCnt: 1, avgDurationHrs: 36, overdueCnt: 1, activeCnt: 1, bottleneckNode: 'legalReview' },
    { defId: bpmDefs[1].id, date: new Date('2026-06-01'), totalInstances: 5, completedCnt: 4, cancelledCnt: 0, rejectedCnt: 0, avgDurationHrs: 52, overdueCnt: 1, activeCnt: 1, bottleneckNode: 'itSetup' },
    { defId: bpmDefs[1].id, date: new Date('2026-06-02'), totalInstances: 3, completedCnt: 3, cancelledCnt: 0, rejectedCnt: 0, avgDurationHrs: 44, overdueCnt: 0, activeCnt: 0 },
    { defId: bpmDefs[2].id, date: new Date('2026-06-01'), totalInstances: 15, completedCnt: 12, cancelledCnt: 1, rejectedCnt: 1, avgDurationHrs: 24, overdueCnt: 1, activeCnt: 1, bottleneckNode: 'directorApprove' },
  ]) {
    try { await prisma.bpmMonitorMetric.create({ data: metric }); } catch {}
  }

  // ============================================================
  // 19. 直播管理模块 Seed 数据
  // ============================================================
  console.log('   📺 Seeding Live Streaming Module...');

  // 5 个直播平台 (使用 upsert)
  const livePlatforms = await Promise.all([
    prisma.livePlatform.upsert({ where: { name: 'weixin_video' }, update: {}, create: { name: 'weixin_video', displayName: '视频号直播', type: 'domestic', category: 'short_video', icon: '📱', description: '微信视频号直播,支持公众号引流', appId: 'wx_video_001', pushUrl: 'rtmp://live-push.weixin.qq.com/live', pullUrl: 'https://live-play.weixin.qq.com', apiEndpoint: 'https://api.weixin.qq.com/wxa/business/getliveinfo', status: 'active', sortOrder: 1 } }),
    prisma.livePlatform.upsert({ where: { name: 'douyin' }, update: {}, create: { name: 'douyin', displayName: '抖音直播', type: 'domestic', category: 'short_video', icon: '🎵', description: '抖音直播间,电商带货首选', appId: 'dy_live_002', pushUrl: 'rtmp://push.douyin.com/live', pullUrl: 'https://pull.douyin.com', apiEndpoint: 'https://open.douyin.com/api', status: 'active', sortOrder: 2 } }),
    prisma.livePlatform.upsert({ where: { name: 'kuaishou' }, update: {}, create: { name: 'kuaishou', displayName: '快手直播', type: 'domestic', category: 'short_video', icon: '⚡', description: '快手直播间,老铁经济', appId: 'ks_live_003', pushUrl: 'rtmp://push.kuaishou.com/live', pullUrl: 'https://pull.kuaishou.com', apiEndpoint: 'https://open.kuaishou.com/api', status: 'active', sortOrder: 3 } }),
    prisma.livePlatform.upsert({ where: { name: 'youzan' }, update: {}, create: { name: 'youzan', displayName: '有赞直播', type: 'domestic', category: 'ecommerce', icon: '🛒', description: '有赞微商城直播,私域运营', pushUrl: 'rtmp://push.youzan.com/live', pullUrl: 'https://play.youzan.com', status: 'active', sortOrder: 4 } }),
    prisma.livePlatform.upsert({ where: { name: 'weihou' }, update: {}, create: { name: 'weihou', displayName: '微吼直播', type: 'domestic', category: 'professional', icon: '🎤', description: '企业级专业直播平台,支持万人并发', pushUrl: 'rtmp://push.weihou.com/live', pullUrl: 'https://play.weihou.com', apiEndpoint: 'https://api.weihou.com/v1', status: 'maintenance', sortOrder: 5 } }),
  ]);

  // 3 个直播间 (使用 try-catch)
  const liveRooms = [];
  for (const room of [
    { platformId: livePlatforms[0].id, roomId: 'wx_room_finance_001', title: '财经直播间 - 全球投资策略', coverUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=finance%20live%20stream%20cover&image_size=landscape_16_9', description: '每周三晚8点,深度解析全球市场动态,分享跨境投资机会', anchorName: '张创业', anchorAvatar: '', category: '财经', tags: JSON.stringify(['投资', '财经', '跨境']), rtmpPushUrl: 'rtmp://live-push.weixin.qq.com/live/room-finance-001?txSecret=xxx&txTime=xxx', hlsPullUrl: 'https://live-play.weixin.qq.com/live/room-finance-001.m3u8', status: 'living', maxViewers: 5820, likeCount: 12800, commentCount: 3200, shareCount: 890, giftAmount: 15680, settings: JSON.stringify({ danmaku: true, gift: true, cohost: true, maxDuration: 14400 }), streamKey: 'sk_live_finance_001', startedAt: new Date('2026-06-07T20:00:00Z'), createdBy: 'admin' },
    { platformId: livePlatforms[1].id, roomId: 'dy_room_edu_001', title: '教育直播间 - AI 工具实战教学', coverUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=education%20AI%20tutorial%20live%20stream&image_size=landscape_16_9', description: '手把手教你使用 AI 工具提升工作效率,从入门到精通', anchorName: '李老师', category: '教育', tags: JSON.stringify(['AI', '教学', '效率工具']), status: 'offline', maxViewers: 3500, likeCount: 8500, commentCount: 2100, shareCount: 450, giftAmount: 8900, startedAt: new Date('2026-06-05T19:30:00Z'), endedAt: new Date('2026-06-05T21:45:00Z'), createdBy: 'admin' },
    { platformId: livePlatforms[2].id, roomId: 'ks_room_product_001', title: '产品发布会 - WOPC 3.0 新功能揭秘', coverUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=product%20launch%20event%20live%20stream&image_size=landscape_16_9', description: 'WOPC 创业家平台 3.0 版本全新发布,重磅功能逐一揭晓', anchorName: 'WOPC 官方', category: '科技', tags: JSON.stringify(['发布', '产品', 'WOPC']), status: 'offline', maxViewers: 12000, likeCount: 45000, commentCount: 8900, shareCount: 5600, giftAmount: 52000, startedAt: new Date('2026-06-01T14:00:00Z'), endedAt: new Date('2026-06-01T16:30:00Z'), createdBy: 'admin' },
  ]) {
    try { liveRooms.push(await prisma.liveRoom.create({ data: room })); } catch {}
  }
  if (liveRooms.length === 0) {
    const existing = await prisma.liveRoom.findMany({ take: 3 });
    liveRooms.push(...existing);
  }

  // 5 条直播记录
  for (const stream of [
    { roomId: liveRooms[0]?.id || 1, platformId: livePlatforms[0].id, streamId: 'stream_wx_001', title: '全球投资策略 - 第32期', startedAt: new Date('2026-06-07T20:00:00Z'), endedAt: null, durationSec: 0, peakViewers: 5820, totalViews: 12580, totalLikes: 12800, totalComments: 3200, totalShares: 890, totalGifts: 15680, newFollowers: 356, status: 'living', resolution: '1080p', bitrate: 4000 },
    { roomId: liveRooms[1]?.id || 2, platformId: livePlatforms[1].id, streamId: 'stream_dy_001', title: 'AI 工具实战 - ChatGPT 高级技巧', startedAt: new Date('2026-06-05T19:30:00Z'), endedAt: new Date('2026-06-05T21:45:00Z'), durationSec: 8100, peakViewers: 3500, totalViews: 18200, totalLikes: 8500, totalComments: 2100, totalShares: 450, totalGifts: 8900, newFollowers: 218, status: 'ended', resolution: '1080p', bitrate: 3500 },
    { roomId: liveRooms[2]?.id || 3, platformId: livePlatforms[2].id, streamId: 'stream_ks_001', title: 'WOPC 3.0 产品发布会', startedAt: new Date('2026-06-01T14:00:00Z'), endedAt: new Date('2026-06-01T16:30:00Z'), durationSec: 9000, peakViewers: 12000, totalViews: 56000, totalLikes: 45000, totalComments: 8900, totalShares: 5600, totalGifts: 52000, newFollowers: 1890, status: 'ended', resolution: '1080p', bitrate: 5000 },
    { roomId: liveRooms[0]?.id || 1, platformId: livePlatforms[0].id, streamId: 'stream_wx_002', title: '全球投资策略 - 第31期', startedAt: new Date('2026-05-28T20:00:00Z'), endedAt: new Date('2026-05-28T22:15:00Z'), durationSec: 8100, peakViewers: 4980, totalViews: 10200, totalLikes: 10500, totalComments: 2800, totalShares: 720, totalGifts: 12350, newFollowers: 298, status: 'ended', resolution: '720p', bitrate: 3000 },
    { roomId: liveRooms[1]?.id || 2, platformId: livePlatforms[1].id, streamId: 'stream_dy_002', title: 'AI 工具实战 - Midjourney 绘画课', startedAt: new Date('2026-05-29T19:00:00Z'), endedAt: new Date('2026-05-29T21:00:00Z'), durationSec: 7200, peakViewers: 2800, totalViews: 14500, totalLikes: 6800, totalComments: 1800, totalShares: 380, totalGifts: 6500, newFollowers: 156, status: 'ended', resolution: '1080p', bitrate: 3500 },
  ]) {
    try { await prisma.liveStream.create({ data: stream }); } catch {}
  }

  // 3 条排期
  for (const sched of [
    { roomId: liveRooms[0]?.id || 1, title: '全球投资策略 - 第33期(特别篇)', plannedStart: new Date('2026-06-11T20:00:00Z'), plannedEnd: new Date('2026-06-11T22:30:00Z'), description: '年中投资策略回顾与下半年展望', repeatRule: JSON.stringify({ type: 'weekly', dayOfWeek: 3 }), reminderMins: 30, status: 'scheduled', notifyChannels: JSON.stringify(['wechat', 'sms']), notes: '准备 PPT 和数据图表' },
    { roomId: liveRooms[1]?.id || 2, title: 'AI 工具实战 - Claude 编程助手', plannedStart: new Date('2026-06-12T19:30:00Z'), plannedEnd: new Date('2026-06-12T21:30:00Z'), description: 'Claude Code 实战: 从零构建全栈应用', reminderMins: 60, status: 'scheduled', notifyChannels: JSON.stringify(['wechat']) },
    { roomId: liveRooms[2]?.id || 3, title: 'WOPC 3.1 版本预告直播', plannedStart: new Date('2026-06-15T14:00:00Z'), plannedEnd: new Date('2026-06-15T16:00:00Z'), description: '提前剧透 3.1 新功能,收集用户反馈', reminderMins: 120, status: 'scheduled', notifyChannels: JSON.stringify(['wechat', 'email', 'sms']), notes: '需要产品团队配合演示' },
  ]) {
    try { await prisma.liveSchedule.create({ data: sched }); } catch {}
  }

  // 8 条弹幕评论
  for (const comment of [
    { roomId: liveRooms[0]?.id || 1, userId: 'user_001', userName: '创业小白', content: '老师讲得太好了！美股这波怎么看？', commentType: 'text', sentiment: 'positive' },
    { roomId: liveRooms[0]?.id || 1, userId: 'user_002', userName: '投资达人', content: '已关注，期待下期内容！', commentType: 'follow', sentiment: 'positive' },
    { roomId: liveRooms[0]?.id || 1, userId: 'user_003', userName: '财迷心窍', content: '送了一个火箭 🚀', commentType: 'gift', isPinned: true },
    { roomId: liveRooms[0]?.id || 1, userId: 'user_004', userName: '理性分析', content: '港股最近波动很大，建议谨慎', commentType: 'text', sentiment: 'neutral' },
    { roomId: liveRooms[1]?.id || 2, userId: 'user_005', userName: '技术宅', content: 'Claude 确实比 GPT-4o 好用，代码质量高很多', commentType: 'text', sentiment: 'positive' },
    { roomId: liveRooms[1]?.id || 2, userId: 'user_006', userName: '前端新手', content: '请问这个教程有回放吗？', commentType: 'text' },
    { roomId: liveRooms[2]?.id || 3, userId: 'user_007', userName: '老用户', content: 'WOPC 越来越强了！', commentType: 'text', isPinned: true, sentiment: 'positive' },
    { roomId: liveRooms[2]?.id || 3, userId: 'user_008', userName: '好奇宝宝', content: '新版本什么时候正式上线？', commentType: 'text' },
  ]) {
    try { await prisma.liveComment.create({ data: comment }); } catch {}
  }

  // 7 条近7天每日分析数据
  for (let i = 6; i >= 0; i--) {
    const date = new Date('2026-06-07');
    date.setDate(date.getDate() - i);
    const baseViews = [3800, 4200, 5100, 4800, 5600, 6200, 7100][6 - i];
    const baseLikes = [15000, 18000, 22000, 19500, 28000, 35000, 42000][6 - i];
    const baseFollowers = [120, 145, 180, 165, 230, 290, 356][6 - i];
    for (const pIdx of [0, 1, 2]) {
      try {
        await prisma.liveAnalytics.create({
          data: {
            platformId: livePlatforms[pIdx].id,
            date,
            roomCount: pIdx === 0 ? (i < 2 ? 2 : 1) : 1,
            totalDurationMin: Math.floor(Math.random() * 300 + 60),
            totalViews: BigInt(Math.floor(baseViews * (0.5 + Math.random()))),
            totalLikes: BigInt(Math.floor(baseLikes * (0.4 + Math.random() * 0.6))),
            newFollowers: Math.floor(baseFollowers * (0.3 + Math.random() * 0.7)),
            totalRevenue: parseFloat((Math.random() * 5000 + 500).toFixed(2)),
            avgViewers: parseFloat((Math.random() * 2000 + 200).toFixed(1)),
            peakViewers: Math.floor(Math.random() * 3000 + 500),
            commentRate: parseFloat((Math.random() * 0.15 + 0.02).toFixed(3)),
            shareRate: parseFloat((Math.random() * 0.08 + 0.01).toFixed(3)),
            followRate: parseFloat((Math.random() * 0.06 + 0.01).toFixed(3)),
          },
        });
      } catch {}
    }
  }

  console.log('     - 📺 直播管理: 5 平台 + 3 直播间 + 5 直播记录 + 3 排期 + 8 弹幕评论 + 7日分析(21条)');

  // ============================================================
  console.log('✅ WOPC 创业家 seed completed!');
  console.log('   管理员账号:');
    prisma.livePlatform.create({ data: { name: 'weihou', displayName: '微吼直播', type: 'domestic', category: 'professional', icon: '🎤', description: '企业级专业直播平台,支持万人并发', pushUrl: 'rtmp://push.weihou.com/live', pullUrl: 'https://play.weihou.com', apiEndpoint: 'https://api.weihou.com/v1', status: 'maintenance', sortOrder: 5 } }),
  console.log('   管理员账号:');
  console.log('     - admin / admin123456 (超级管理员)');
  console.log('     - operator / admin123456 (运营员)');
  console.log('     - auditor / admin123456 (审计员)');
  console.log('   新增模块:');
  console.log('     - OpenClaw 智能体: 4 agents + 3 marketplace + 2 finetunes + 5 monitor logs');
  console.log('     - n8n 工作流: 3 workflows + 4 triggers + 5 executions + 4 templates');
  console.log('     - AI 大模型: 6 providers + 12 instances + 6 recognitions + 8 recommendations + 5 prompts + 7 cost records');
  console.log('     - BPM 流程引擎: 4 process defs + 3 instances + 7 tasks + 5 monitor metrics');

  // ============================================================
  // 19. AI电视新闻模块 Seed 数据
  // ============================================================
  console.log('   📺 Seeding AI TV News module...');

  // ===== 3 个数字人 (使用 upsert) =====
  const [human1] = await Promise.all([
    prisma.aiTvDigitalHuman.upsert({
      where: { code: 'n-xiaobai' },
      update: {},
      create: {
        name: 'N小白', code: 'n-xiaobai', gender: 'female', style: 'news_anchor',
        avatarUrl: 'https://example.com/avatars/n-xiaobai.png', modelType: 'saas',
        modelProvider: 'silicon_base', ttsEngine: 'volcengine',
        ttsVoiceId: 'zh_female_xiaoya_moon_bigtts',
        backgroundUrl: 'https://example.com/bg/studio-blue.png',
        status: 'active', version: 2, useCount: 128,
      },
    }),
    prisma.aiTvDigitalHuman.upsert({
      where: { code: 'n-xiaohei' },
      update: {},
      create: {
        name: 'N小黑', code: 'n-xiaohei', gender: 'male', style: 'professional',
        avatarUrl: 'https://example.com/avatars/n-xiaohei.png', modelType: 'saas',
        modelProvider: 'tencent_cloud', ttsEngine: 'aliyun_tts',
        ttsVoiceId: 'zh_male_yunfeng',
        backgroundUrl: 'https://example.com/bg/studio-dark.png',
        status: 'active', version: 1, useCount: 95,
      },
    }),
    prisma.aiTvDigitalHuman.upsert({
      where: { code: 'ai-xiaohan' },
      update: {},
      create: {
        name: 'AI晓涵', code: 'ai-xiaohan', gender: 'female', style: 'casual',
        avatarUrl: 'https://example.com/avatars/ai-xiaohan.png', modelType: 'self_made',
        modelProvider: 'meta_human', ttsEngine: 'xunfei', ttsVoiceId: 'xiaoyan',
        backgroundUrl: 'https://example.com/bg/studio-light.png',
        status: 'active', version: 3, useCount: 67,
      },
    }),
  ]);

  const digitalHumans = await prisma.aiTvDigitalHuman.findMany({ where: { code: { in: ['n-xiaobai', 'n-xiaohei', 'ai-xiaohan'] } } });

  // ===== 5 个资讯源 (使用 try-catch) =====
  const newsSources = [];
  for (const src of [
    { name: '上交所公告', sourceType: 'api_crawler', category: 'company_announcement', apiUrl: 'https://www.sse.com.cn/api/disclosure/list', apiKey: 'sk-sse-seed-xxx', crawlRule: JSON.stringify({ selector: '.list-item', interval: 300, fields: ['title', 'date', 'code'] }), refreshFreq: 300, isActive: true, fetchCount: 2450, status: 'active' as const },
    { name: '财联社快讯', sourceType: 'api_crawler', category: 'stock_market', apiUrl: 'https://www.cls.cn/api/sw', apiKey: 'sk-cls-seed-xxx', crawlRule: JSON.stringify({ selector: '.news-item', interval: 60, fields: ['title', 'time', 'importance'] }), refreshFreq: 60, isActive: true, fetchCount: 18900, status: 'active' as const },
    { name: '新浪财经', sourceType: 'rss', category: 'macro_economy', apiUrl: 'https://finance.sina.com.cn/rss.xml', refreshFreq: 600, isActive: true, fetchCount: 3200, status: 'active' as const },
    { name: '东方财富', sourceType: 'api_crawler', category: 'industry', apiUrl: 'https://data.eastmoney.com/api/', apiKey: 'sk-ef-seed-xxx', crawlRule: JSON.stringify({ selector: '.data-row', interval: 180, fields: ['name', 'change', 'volume'] }), refreshFreq: 180, isActive: true, fetchCount: 5670, status: 'active' as const },
    { name: '同花顺', sourceType: 'api_crawler', category: 'stock_market', apiUrl: 'https://basic.10jqka.com.cn/api/', refreshFreq: 120, isActive: false, fetchCount: 980, status: 'inactive' as const },
  ]) {
    try {
      const s = await prisma.aiTvNewsSource.create({ data: src });
      newsSources.push(s);
    } catch { /* 已存在则忽略 */ }
  }
  if (newsSources.length === 0) {
    const existing = await prisma.aiTvNewsSource.findMany({ take: 5 });
    newsSources.push(...existing);
  }

  // ===== 8 条稿件 (使用 try-catch) =====
  const articleDataList = [
    { sourceId: newsSources[0]?.id || 1, humanId: digitalHumans[0]?.id, title: '上交所发布科创板新规:优化上市审核流程', originalContent: '上海证券交易所今日发布《关于进一步优化科创板发行上市审核规则的通知》...', draftContent: '各位观众好,这里是每经AI电视。今天上交所发布重磅消息,科创板迎来重大改革...', finalContent: '【每经AI电视·早盘播报】上交所今日正式发布科创板新规...', summary: '上交所发布科创板新规,缩短审核周期至4个月,降低盈利门槛', category: 'morning_report', priority: 'high' as const, readTimeSec: 90, aiModel: 'qwen-plus', status: 'approved' as const, reviewedBy: 'editor_zhang', wordCount: 456, tags: JSON.stringify(['科创板', 'IPO', '监管政策']) },
    { sourceId: newsSources[1]?.id || 2, humanId: digitalHumans[1]?.id, title: 'A股三大指数集体高开,沪指涨0.5%', originalContent: '今日开盘,A股三大指数集体高开...', draftContent: '早上好!今天A股市场表现强劲...', finalContent: null, summary: 'A股三大指数高开,沪指涨0.5%', category: 'industry_news', priority: 'urgent' as const, readTimeSec: 60, aiModel: 'deepseek-chat', status: 'reviewing' as const, wordCount: 234, tags: JSON.stringify(['A股', '开盘', '行情']) },
    { sourceId: newsSources[2]?.id || 3, humanId: digitalHumans[2]?.id, title: '央行宣布降准0.5个百分点,释放长期资金约1万亿元', originalContent: '中国人民银行决定于2026年7月15日下调金融机构存款准备金率...', draftContent: '重磅消息!央行刚刚宣布降准...', finalContent: '【每经AI电视·突发新闻】中国人民银行刚刚宣布...', summary: '央行降准0.5个百分点,释放资金约1万亿元', category: 'breaking_news', priority: 'urgent' as const, readTimeSec: 75, aiModel: 'tongyi-qwen', status: 'scheduled' as const, reviewedBy: 'editor_li', wordCount: 389, tags: JSON.stringify(['央行', '降准', '货币政策']) },
    { sourceId: newsSources[3]?.id || 4, title: '新能源汽车销量创新高,比亚迪月销突破50万辆', originalContent: '据乘联会数据,5月份新能源汽车零售销量达到98万辆...', draftContent: null, finalContent: null, summary: '新能源车销量大涨,比亚迪月销超50万辆', category: 'industry_news', priority: 'normal' as const, readTimeSec: 80, status: 'draft' as const, wordCount: 0, tags: JSON.stringify(['新能源汽车', '比亚迪', '销量']) },
    { sourceId: newsSources[0]?.id || 1, humanId: digitalHumans[0]?.id, title: '收盘点评:创业板指涨1.2%,半导体板块领涨', originalContent: '今日收盘,创业板指数上涨1.2%...', draftContent: '收盘了!今天创业板表现亮眼...', finalContent: '【每经AI电视·收盘播报】今日收盘,创业板指上涨1.2%...', summary: '创业板涨1.2%,半导体板块领涨,成交1.2万亿', category: 'market_close', priority: 'high' as const, readTimeSec: 85, aiModel: 'qwen-plus', status: 'broadcasted' as const, reviewedBy: 'editor_wang', wordCount: 412, tags: JSON.stringify(['收盘', '创业板', '半导体']) },
    { sourceId: newsSources[1]?.id || 2, title: '比特币突破15万美元,创历史新高', originalContent: '比特币价格在北京时间今日凌晨突破150000美元关口...', draftContent: '加密货币市场传来大消息!...', finalContent: null, summary: '比特币突破15万美元,创历史新高', category: 'breaking_news', priority: 'urgent' as const, readTimeSec: 55, aiModel: 'deepseek-chat', status: 'rejected' as const, reviewedBy: 'editor_zhang', wordCount: 178, tags: JSON.stringify(['比特币', '加密货币', '区块链']) },
    { sourceId: newsSources[4]?.id || 5, title: '美联储会议纪要:多数委员支持年内再加息一次', originalContent: '美联储公布最新会议纪要显示...', draftContent: null, finalContent: null, summary: '美联储纪要显示多数委员支持再加息', category: 'macro_economy', priority: 'normal' as const, readTimeSec: 70, status: 'draft' as const, wordCount: 0, tags: JSON.stringify(['美联储', '利率', '通胀']) },
    { sourceId: newsSources[2]?.id || 3, humanId: digitalHumans[1]?.id, title: '国务院常务会议:研究促进消费恢复政策措施', originalContent: '国务院总理主持召开国务院常务会议...', draftContent: '国常会最新消息!国家将出台一系列促消费政策...', finalContent: '【每经AI电视·午间速递】国务院总理今日主持召开常务会议...', summary: '国常会研究促消费政策,推动以旧换新和新型消费', category: 'company_announce', priority: 'high' as const, readTimeSec: 95, aiModel: 'tongyi-qwen', status: 'approved' as const, reviewedBy: 'editor_li', wordCount: 478, tags: JSON.stringify(['国常会', '消费', '政策']) },
  ];
  const articles = [];
  for (const a of articleDataList) {
    try { articles.push(await prisma.aiTvArticle.create({ data: a })); } catch {}
  }
  if (articles.length === 0) {
    const existing = await prisma.aiTvArticle.findMany({ take: 8 });
    articles.push(...existing);
  }

  // ===== 6 条排班 =====
  for (let i = 0; i < Math.min(6, articles.length); i++) {
    const scheduleData = [
      { articleId: articles[0]?.id, programSlot: 'morning_09', slotLabel: '早盘播报(9:00-11:30)', scheduledFor: new Date(), durationMin: 10, orderIndex: 1, status: 'completed' as const, actualStart: new Date(Date.now() - 7200000), actualEnd: new Date(Date.now() - 7080000) },
      { articleId: articles[1]?.id, programSlot: 'morning_09', slotLabel: '早盘播报(9:00-11:30)', scheduledFor: new Date(), durationMin: 5, orderIndex: 2, status: 'pending' as const },
      { articleId: articles[2]?.id, programSlot: 'noon_12', slotLabel: '午间速递(12:00-13:00)', scheduledFor: new Date(Date.now() + 3600000), durationMin: 8, orderIndex: 1, status: 'pending' as const },
      { articleId: articles[7]?.id || articles[articles.length-1]?.id, programSlot: 'noon_12', slotLabel: '午间速递(12:00-13:00)', scheduledFor: new Date(Date.now() + 4000000), durationMin: 10, orderIndex: 2, status: 'pending' as const },
      { articleId: articles[4]?.id, programSlot: 'evening_18', slotLabel: '晚间报道(18:00-20:00)', scheduledFor: new Date(Date.now() + 21600000), durationMin: 12, orderIndex: 1, status: 'pending' as const },
      { articleId: articles[3]?.id, programSlot: 'night_20', slotLabel: '深度观察(20:00-22:00)', scheduledFor: new Date(Date.now() + 28800000), durationMin: 15, orderIndex: 1, status: 'pending' as const },
    ][i];
    if (scheduleData.articleId) {
      try { await prisma.aiTvSchedule.create({ data: scheduleData }); } catch {}
    }
  }

  // ===== 3 个 TTS 配置 (try-catch) =====
  for (const tts of [
    { engine: 'volcengine', name: '火山引擎-晓雅', voiceId: 'zh_female_xiaoya_moon_bigtts', voiceName: '新闻女声-晓雅', language: 'zh-CN', sampleRate: 16000, format: 'mp3', speed: 1.0, pitch: 1.0, volume: 1.0, emotion: 'neutral', sampleAudioUrl: 'https://example.com/tts/xiaoya-sample.mp3', pricePerChar: 0.002, status: 'active' as const, sortOrder: 1 },
    { engine: 'aliyun_tts', name: '阿里云-云峰', voiceId: 'zh_male_yunfeng', voiceName: '新闻男声-云峰', language: 'zh-CN', sampleRate: 16000, format: 'mp3', speed: 1.05, pitch: 0.95, volume: 1.0, emotion: 'serious', sampleAudioUrl: 'https://example.com/tts/yunfeng-sample.mp3', pricePerChar: 0.0015, status: 'active' as const, sortOrder: 2 },
    { engine: 'xunfei', name: '讯飞-小燕', voiceId: 'xiaoyan', voiceName: '甜美女声-小燕', language: 'zh-CN', sampleRate: 16000, format: 'mp3', speed: 0.95, pitch: 1.05, volume: 0.9, emotion: 'happy', sampleAudioUrl: 'https://example.com/tts/xiaoyan-sample.mp3', pricePerChar: 0.0018, status: 'active' as const, sortOrder: 3 },
  ]) {
    try { await prisma.aiTvTtsConfig.create({ data: tts }); } catch {}
  }

  // ===== 2 个推流配置 (try-catch) =====
  const streamPushes = [];
  for (const push of [
    { name: '主推流通道', pushType: 'rtmp', rtmpUrl: 'rtmp://push.example.com/live', streamKey: 'stream_main_aivtv?token=xxx', targetPlatforms: JSON.stringify(['douyin', 'video_account', 'kuaishou', 'website', 'app']), resolution: '1080p', fps: 30, bitrate: 4000, codec: 'h264', gpuServer: 'gpu-server-01.internal:9000', status: 'pushing' as const, currentProgram: '早盘播报', startedAt: new Date(Date.now() - 7200000), uptimeSec: 7200, totalPushBytes: BigInt(25920000000), autoRestart: true, healthCheckUrl: 'https://monitor.example.com/health/main' },
    { name: '备用推流通道', pushType: 'rtmps', rtmpUrl: 'rtmps://push-backup.example.com/live', streamKey: 'stream_backup_aivtv?token=yyy', targetPlatforms: JSON.stringify(['website', 'app']), resolution: '1080p', fps: 30, bitrate: 3500, codec: 'h264', gpuServer: 'gpu-server-02.internal:9000', status: 'idle' as const, autoRestart: true },
  ]) {
    try { streamPushes.push(await prisma.aiTvStreamPush.create({ data: push })); } catch {}
  }
  if (streamPushes.length === 0) {
    const existing = await prisma.aiTvStreamPush.findMany({ take: 2 });
    streamPushes.push(...existing);
  }

  // ===== 5 个媒资素材 (try-catch) =====
  for (const asset of [
    { name: '蓝色演播厅背景', assetType: 'image', category: 'anchor_bg', url: 'https://example.com/assets/studio-bg-blue.jpg', thumbnailUrl: 'https://example.com/assets/studio-bg-blue-thumb.jpg', format: 'jpg', fileSize: 2560000, resolution: '1920x1080', usageCount: 89, status: 'available' as const },
    { name: '新闻字幕条模板', assetType: 'subtitle_template', category: 'lower_third', url: 'https://example.com/assets/lower-third-template.png', thumbnailUrl: 'https://example.com/assets/lower-third-thumb.png', format: 'png', resolution: '1920x150', usageCount: 156, status: 'available' as const },
    { name: 'AI电视Logo动画', assetType: 'video', category: 'logo', url: 'https://example.com/assets/logo-anim.mp4', thumbnailUrl: 'https://example.com/assets/logo-anim-thumb.jpg', format: 'mp4', durationSec: 5, fileSize: 8500000, resolution: '1920x1080', usageCount: 234, status: 'available' as const },
    { name: '转场特效-新闻切换', assetType: 'video', category: 'transition', url: 'https://example.com/assets/transition-news.mp4', thumbnailUrl: 'https://example.com/assets/transition-news-thumb.jpg', format: 'mp4', durationSec: 2, fileSize: 3200000, resolution: '1920x1080', usageCount: 445, status: 'available' as const },
    { name: 'B-roll-股市K线图', assetType: 'video', category: 'b_roll', url: 'https://example.com/assets/broll-stock-kline.mp4', thumbnailUrl: 'https://example.com/assets/broll-kline-thumb.jpg', format: 'mp4', durationSec: 15, fileSize: 25000000, resolution: '1920x1080', usageCount: 67, status: 'available' as const },
  ]) {
    try { await prisma.aiTvMediaAsset.create({ data: asset }); } catch {}
  }

  // ===== 5 条播出日志 (try-catch) =====
  for (const log of [
    { articleId: articles[4]?.id, humanId: digitalHumans[0]?.id, pushId: streamPushes[0]?.id, programTitle: '收盘点评:创业板指涨1.2%', startedAt: new Date(Date.now() - 86400000), endedAt: new Date(Date.now() - 86340000), durationSec: 120, status: 'success' as const, viewerPeak: 12500, viewerAvg: 8900 },
    { articleId: articles[0]?.id, humanId: digitalHumans[0]?.id, pushId: streamPushes[0]?.id, programTitle: '早盘播报-上交所新规', startedAt: new Date(Date.now() - 7200000), endedAt: new Date(Date.now() - 7080000), durationSec: 600, status: 'success' as const, viewerPeak: 8900, viewerAvg: 6500 },
    { humanId: digitalHumans[1]?.id, pushId: streamPushes[0]?.id, programTitle: '午间天气预报', startedAt: new Date(Date.now() - 3600000), endedAt: new Date(Date.now() - 3540000), durationSec: 360, status: 'success' as const, viewerPeak: 5600, viewerAvg: 4200 },
    { articleId: articles[0]?.id, humanId: digitalHumans[0]?.id, pushId: streamPushes[0]?.id, programTitle: '晚间重播-科创板新规', startedAt: new Date(Date.now() - 172800000), endedAt: new Date(Date.now() - 172740000), durationSec: 540, status: 'partial' as const, viewerPeak: 3400, viewerAvg: 2800, errorMsg: '部分时段音画不同步' },
    { humanId: digitalHumans[2]?.id, pushId: streamPushes[0]?.id, programTitle: '深夜档-科技前沿', startedAt: new Date(Date.now() - 259200000), endedAt: null, durationSec: 0, status: 'error' as const, viewerPeak: 0, viewerAvg: 0, errorMsg: 'GPU服务器连接超时' },
  ]) {
    try { await prisma.aiTvBroadcastLog.create({ data: log }); } catch {}
  }

  console.log('     - AI电视新闻: 3 数字人 + 5 资讯源 + 8 稿件 + 6 排班 + 3 TTS配置 + 2 推流 + 5 媒资 + 5 播出日志');

  // ============================================================
  // 20. AI 全球获客模块 Seed 数据
  // ============================================================
  console.log('   🎯 Seeding AI Global Acquisition...');

  // 12 个平台
  const acqPlatforms = await Promise.all([
    prisma.acquisitionPlatform.create({ data: { name: 'douyin', displayName: '抖音', region: 'domestic', category: 'short_video', icon: '🎵', apiProvider: 'official_api', rateLimit: 1000, dailyUsed: 234, features: JSON.stringify(['post','comment','dm','ads','analytics','live','shop']), status: 'active' } }),
    prisma.acquisitionPlatform.create({ data: { name: 'kuaishou', displayName: '快手', region: 'domestic', category: 'short_video', icon: '⚡', apiProvider: 'official_api', rateLimit: 800, dailyUsed: 156, features: JSON.stringify(['post','comment','dm','ads','analytics','live','shop']), status: 'active' } }),
    prisma.acquisitionPlatform.create({ data: { name: 'xiaohongshu', displayName: '小红书', region: 'domestic', category: 'social', icon: '📕', apiProvider: 'official_api', rateLimit: 500, dailyUsed: 89, features: JSON.stringify(['post','comment','ads','analytics']), status: 'active' } }),
    prisma.acquisitionPlatform.create({ data: { name: 'weixin_video', displayName: '视频号', region: 'domestic', category: 'short_video', icon: '📹', apiProvider: 'sdk', rateLimit: 300, dailyUsed: 67, features: JSON.stringify(['post','analytics','live']), status: 'active' } }),
    prisma.acquisitionPlatform.create({ data: { name: 'facebook', displayName: 'Facebook', region: 'overseas', category: 'social', icon: '👤', apiProvider: 'official_api', rateLimit: 2000, dailyUsed: 567, features: JSON.stringify(['post','comment','dm','ads','analytics','live','shop']), status: 'active' } }),
    prisma.acquisitionPlatform.create({ data: { name: 'linkedin', displayName: 'LinkedIn', region: 'overseas', category: 'professional', icon: '💼', apiProvider: 'official_api', rateLimit: 1000, dailyUsed: 234, features: JSON.stringify(['post','comment','dm','ads','analytics']), status: 'active' } }),
    prisma.acquisitionPlatform.create({ data: { name: 'google', displayName: 'Google', region: 'global', category: 'search', icon: '🔍', apiProvider: 'official_api', rateLimit: 5000, dailyUsed: 1234, features: JSON.stringify(['ads','analytics','search_console']), status: 'active' } }),
    prisma.acquisitionPlatform.create({ data: { name: 'whatsapp', displayName: 'WhatsApp', region: 'global', category: 'messaging', icon: '💬', apiProvider: 'official_api', rateLimit: 10000, dailyUsed: 3456, features: JSON.stringify(['dm','templates','analytics']), status: 'active' } }),
    prisma.acquisitionPlatform.create({ data: { name: 'tiktok', displayName: 'TikTok', region: 'global', category: 'short_video', icon: '🎵', apiProvider: 'official_api', rateLimit: 1500, dailyUsed: 789, features: JSON.stringify(['post','comment','dm','ads','analytics','live','shop']), status: 'active' } }),
    prisma.acquisitionPlatform.create({ data: { name: 'line', displayName: 'LINE', region: 'overseas', category: 'messaging', icon: '💚', apiProvider: 'official_api', rateLimit: 5000, dailyUsed: 456, features: JSON.stringify(['dm','templates','analytics']), status: 'active' } }),
    prisma.acquisitionPlatform.create({ data: { name: 'twitter', displayName: 'Twitter/X', region: 'global', category: 'social', icon: '🐦', apiProvider: 'official_api', rateLimit: 800, dailyUsed: 345, features: JSON.stringify(['post','comment','dm','ads','analytics']), status: 'limited' } }),
    prisma.acquisitionPlatform.create({ data: { name: 'instagram', displayName: 'Instagram', region: 'global', category: 'social', icon: '📷', apiProvider: 'official_api', rateLimit: 1200, dailyUsed: 678, features: JSON.stringify(['post','comment','dm','ads','analytics','live','shop']), status: 'active' } }),
  ]);

  // 4 个活动
  const acqCampaigns = await Promise.all([
    prisma.acquisitionCampaign.create({ data: { platformId: acqPlatforms[0].id, name: 'Q2 抖音品牌曝光计划', objective: 'awareness', strategy: JSON.stringify({ targetAudience: '25-35岁女性', budget: 50000 }), contentType: 'video', status: 'running', budgetDaily: 2000, budgetTotal: 60000, spentTotal: 28000, impressions: BigInt(2500000), clicks: BigInt(125000), ctr: 5.0, conversions: 890, cpa: 31.46, roas: 3.2, startDate: new Date('2026-04-01'), endDate: new Date('2026-06-30'), createdBy: 'admin' } }),
    prisma.acquisitionCampaign.create({ data: { platformId: acqPlatforms[4].id, name: 'Facebook B2B 线索获取', objective: 'leads', strategy: JSON.stringify({ targetAudience: '企业决策者', budget: 30000 }), contentType: 'carousel', status: 'running', budgetDaily: 1000, budgetTotal: 30000, spentTotal: 15200, impressions: BigInt(800000), clicks: BigInt(24000), ctr: 3.0, conversions: 320, cpa: 47.5, roas: 4.8, startDate: new Date('2026-05-01'), endDate: new Date('2026-07-31'), createdBy: 'admin' } }),
    prisma.acquisitionCampaign.create({ data: { platformId: acqPlatforms[8].id, name: 'TikTok 东南亚电商引流', objective: 'conversion', strategy: JSON.stringify({ targetAudience: '18-28岁东南亚用户', budget: 40000 }), contentType: 'video', status: 'paused', budgetDaily: 1500, budgetTotal: 45000, spentTotal: 22000, impressions: BigInt(1800000), clicks: BigInt(72000), ctr: 4.0, conversions: 1560, cpa: 14.1, roas: 6.5, startDate: new Date('2026-03-15'), endDate: new Date('2026-06-15'), createdBy: 'marketing' } }),
    prisma.acquisitionCampaign.create({ data: { platformId: acqPlatforms[7].id, name: 'WhatsApp 私域运营', objective: 'engagement', strategy: JSON.stringify({ targetAudience: '已有客户', budget: 10000 }), contentType: 'text', status: 'completed', budgetDaily: 500, budgetTotal: 15000, spentTotal: 14800, impressions: BigInt(50000), clicks: BigInt(35000), ctr: 70.0, conversions: 2100, cpa: 7.05, roas: 12.3, startDate: new Date('2026-02-01'), endDate: new Date('2026-05-31'), createdBy: 'sales' } }),
  ]);

  // 6 条内容素材
  for (const content of [
    { campaignId: acqCampaigns[0].id, title: '创业故事系列 - 第1集', body: '从0到1的创业历程，看张总如何用3年时间打造百万级品牌...', mediaUrls: JSON.stringify(['https://example.com/video1.mp4']), ctaText: '了解更多', ctaLink: 'https://wopc.io', hashtags: JSON.stringify(['#创业', '#品牌故事', '#WOPC']), status: 'published', reach: BigInt(520000), likes: BigInt(12000), comments: BigInt(890), shares: BigInt(450), saves: BigInt(2300), aiGenerated: true, aiPrompt: '生成一个感人的创业故事短视频脚本' },
    { campaignId: acqCampaigns[0].id, title: '产品功能演示 - AI财税顾问', body: '3分钟了解WOPC AI财税顾问如何帮你节省50%税务成本...', mediaUrls: JSON.stringify(['https://example.com/video2.mp4']), ctaText: '免费试用', ctaLink: 'https://wopc.io/try', hashtags: JSON.stringify(['#AI', '#财税', '#效率提升']), status: 'published', reach: BigInt(380000), likes: BigInt(8500), comments: BigInt(560), shares: BigInt(320), saves: BigInt(1800) },
    { campaignId: acqCampaigns[1].id, title: 'B2B企业服务解决方案白皮书', body: '为中小企业提供一站式跨境服务解决方案...', mediaUrls: JSON.stringify(['https://example.com/img1.jpg', 'https://example.com/img2.jpg']), ctaText: '下载白皮书', ctaLink: 'https://wopc.io/whitepaper', hashtags: JSON.stringify(['#B2B', '#企业服务', '#跨境']), status: 'published', reach: BigInt(210000), likes: BigInt(3400), comments: BigInt(280), shares: BigInt(190), saves: BigInt(980) },
    { campaignId: acqCampaigns[2].id, title: '东南亚爆款选品指南', body: '2026年最火的10个跨境电商品类，数据说话...', mediaUrls: JSON.stringify(['https://example.com/tiktok1.mp4']), ctaText: '查看详情', ctaLink: 'https://wopc.io/guide', hashtags: JSON.stringify(['#跨境电商', '#东南亚', '#选品']), status: 'paused', reach: BigInt(650000), likes: BigInt(25000), comments: BigInt(1800), shares: BigInt(1200), saves: BigInt(5600), aiGenerated: true },
    { campaignId: acqCampaigns[3].id, title: '客户专属优惠通知', body: '尊敬的客户，您有一份专属优惠待领取...', ctaText: '立即领取', hashtags: JSON.stringify(['#优惠', '#VIP']), status: 'published', reach: BigInt(48000), likes: BigInt(2000), comments: BigInt(450), shares: BigInt(120), saves: BigInt(890) },
    { campaignId: acqCampaigns[0].id, title: '用户见证 - 李总的创业心得', body: '使用WOPC平台半年，公司注册到合规全搞定...', mediaUrls: JSON.stringify(['https://example.com/testimonial.mp4']), ctaText: '开始使用', hashtags: JSON.stringify(['#用户见证', '#好评']), status: 'draft', aiGenerated: false },
  ]) {
    try { await prisma.acquisitionContent.create({ data: content }); } catch {}
  }

  // 10 条线索
  for (const lead of [
    { platformId: acqPlatforms[0].id, campaignId: acqCampaigns[0].id, externalId: 'DY001', name: '王女士', phone: '13900139001', source: 'dm', stage: 'qualified', score: 85, tags: JSON.stringify(['高意向', '女性创业者']), assignedTo: 'sales_zhang', valueEstimate: 25000, lastActivity: new Date('2026-06-07T10:00:00Z') },
    { platformId: acqPlatforms[4].id, campaignId: acqCampaigns[1].id, externalId: 'FB002', name: 'Mike Chen', email: 'mike@company.com', source: 'form', stage: 'proposal', score: 92, tags: JSON.stringify(['B2B', '企业服务', '美国']), assignedTo: 'sales_li', valueEstimate: 50000, lastActivity: new Date('2026-06-07T09:30:00Z') },
    { platformId: acqPlatforms[8].id, campaignId: acqCampaigns[2].id, externalId: 'TT003', name: 'Sarah Wong', phone: '+65-81234567', source: 'ad_click', stage: 'contacted', score: 68, tags: JSON.stringify(['新加坡', '电商']), notes: '对东南亚市场感兴趣', assignedTo: 'sales_wang', valueEstimate: 15000, lastActivity: new Date('2026-06-06T15:00:00Z') },
    { platformId: acqPlatforms[7].id, campaignId: acqCampaigns[3].id, externalId: 'WA004', name: '陈先生', phone: '13800138008', wechatId: 'chen_boss', source: 'dm', stage: 'negotiation', score: 95, tags: JSON.stringify(['VIP', '老客户']), assignedTo: 'sales_manager', valueEstimate: 80000, lastActivity: new Date('2026-06-07T11:00:00Z') },
    { platformId: acqPlatforms[0].id, campaignId: acqCampaigns[0].id, externalId: 'DY005', name: null, phone: '13700137005', source: 'comment', stage: 'new', score: 35, lastActivity: new Date('2026-06-07T08:00:00Z') },
    { platformId: acqPlatforms[4].id, campaignId: acqCampaigns[1].id, externalId: 'FB006', name: 'David Liu', email: 'david@startup.io', source: 'live', stage: 'new', score: 42, tags: JSON.stringify(['初创公司']) },
    { platformId: acqPlatforms[8].id, campaignId: acqCampaigns[2].id, externalId: 'TT007', name: 'Anya', source: 'referral', stage: 'won', score: 88, tags: JSON.stringify(['泰国', '推荐转化']), valueEstimate: 12000, convertedAt: new Date('2026-06-05') },
    { platformId: acqPlatforms[5].id, externalId: 'LI008', name: 'James Wilson', email: 'james@corp.com', source: 'ad_click', stage: 'contacted', score: 72, tags: JSON.stringify(['LinkedIn', 'C级别']), assignedTo: 'sales_zhang', valueEstimate: 35000 },
    { platformId: acqPlatforms[1].id, externalId: 'KS009', name: '赵姐', phone: '13600136009', source: 'live', stage: 'new', score: 55, tags: JSON.stringify(['快手', '直播']) },
    { platformId: acqPlatforms[2].id, externalId: 'XHS010', name: '小美同学', source: 'comment', stage: 'lost', score: 20, notes: '预算不足' },
  ]) {
    try { await prisma.acquisitionLead.create({ data: lead }); } catch {}
  }

  // 8 个达人
  for (const inf of [
    { platformId: acqPlatforms[0].id, externalId: 'dy_inf_001', nickname: '创业导师老王', avatarUrl: 'https://example.com/avatar1.jpg', bio: '10年创业经验，帮助1000+创业者实现梦想', followers: BigInt(2500000), following: 320, postsCount: 890, avgLikes: 45000, avgComments: 1200, engagementRate: 1.82, erTier: 'macro', categories: JSON.stringify(['创业', '商业', '财经']), location: '北京', language: 'zh-CN', priceRange: '5-15万/条', collaborationStatus: 'collaborating', performanceScore: 92, lastSyncAt: new Date('2026-06-07'), status: 'active' },
    { platformId: acqPlatforms[0].id, externalId: 'dy_inf_002', nickname: '美妆博主Luna', avatarUrl: 'https://example.com/avatar2.jpg', bio: '分享美妆护肤心得，让每个女生都变美', followers: BigInt(580000), following: 256, postsCount: 420, avgLikes: 22000, avgComments: 680, engagementRate: 3.93, erTier: 'mid', categories: JSON.stringify(['美妆', '时尚', '生活方式']), location: '上海', language: 'zh-CN', priceRange: '2-5万/条', collaborationStatus: 'none', performanceScore: 78, status: 'active' },
    { platformId: acqPlatforms[4].id, externalId: 'fb_inf_001', nickname: 'Tech Insider Asia', avatarUrl: 'https://example.com/avatar3.jpg', bio: 'Asia tech news and startup insights', followers: BigInt(120000), following: 89, postsCount: 560, avgLikes: 3400, avgComments: 180, engagementRate: 2.98, erTier: 'micro', categories: JSON.stringify(['科技', '创业', 'AI']), location: 'Singapore', language: 'en-US', priceRange: '$500-$2000/post', collaborationStatus: 'contacted', performanceScore: 75, status: 'active' },
    { platformId: acqPlatforms[8].id, externalId: 'tt_inf_001', nickname: 'ThaiFoodie', avatarUrl: 'https://example.com/avatar4.jpg', bio: 'Best Thai food reviews & cooking tips!', followers: BigInt(3200000), following: 450, postsCount: 1200, avgLikes: 89000, avgComments: 2300, engagementRate: 2.84, erTier: 'macro', categories: JSON.stringify(['美食', '生活', '泰国']), location: 'Bangkok', language: 'th-TH', priceRange: '฿50,000-฿150,000/video', collaborationStatus: 'negotiating', performanceScore: 88, status: 'active' },
    { platformId: acqPlatforms[5].id, externalId: 'li_inf_001', nickname: 'Sarah Chen - B2B Marketing', avatarUrl: 'https://example.com/avatar5.jpg', bio: 'Helping B2B companies grow through digital marketing | Ex-Google', followers: BigInt(45000), following: 1200, postsCount: 340, avgLikes: 890, avgComments: 65, engagementRate: 2.13, erTier: 'micro', categories: JSON.stringify(['B2B营销', '数字营销', 'SaaS']), location: 'San Francisco', language: 'en-US', priceRange: '$1000-$3000/post', collaborationStatus: 'collaborating', performanceScore: 85, status: 'active' },
    { platformId: acqPlatforms[1].id, externalId: 'ks_inf_001', nickname: '三农达人小强', avatarUrl: 'https://example.com/avatar6.jpg', bio: '记录农村生活，分享农业技术', followers: BigInt(180000), following: 98, postsCount: 670, avgLikes: 15000, avgComments: 890, engagementRate: 8.83, erTier: 'mid', categories: JSON.stringify(['三农', '美食', '生活']), location: '河南', language: 'zh-CN', priceRange: '1-3万/条', collaborationStatus: 'none', performanceScore: 71, status: 'active' },
    { platformId: acqPlatforms[10].id, externalId: 'tw_inf_001', nickname: 'CryptoWatch', avatarUrl: 'https://example.com/avatar7.jpg', bio: 'Web3 & Crypto news, analysis & alpha', followers: BigInt(89000), following: 560, postsCount: 2300, avgLikes: 1200, avgComments: 89, engagementRate: 1.45, erTier: 'micro', categories: JSON.stringify(['Crypto', 'Web3', '区块链']), location: 'Global', language: 'en-US', priceRange: '$200-$800/tweet', collaborationStatus: 'completed', performanceScore: 68, status: 'active' },
    { platformId: acqPlatforms[2].id, externalId: 'xhs_inf_001', nickname: '留学学姐Amy', avatarUrl: 'https://example.com/avatar8.jpg', bio: '英国留学5年经验，分享留学申请干货', followers: BigInt(95000), following: 234, postsCount: 380, avgLikes: 5600, avgComments: 430, engagementRate: 6.32, erTier: 'micro', categories: JSON.stringify(['留学', '教育', '英国']), location: '伦敦', language: 'zh-CN', priceRange: '5000-15000/篇', collaborationStatus: 'contacted', performanceScore: 80, status: 'active' },
  ]) {
    try { await prisma.acquisitionInfluencer.create({ data: inf }); } catch {}
  }

  // 5 个任务
  for (const task of [
    { campaignId: acqCampaigns[0].id, type: 'post_publish', title: '发布抖音视频 - 创业故事第2集', config: JSON.stringify({ contentId: 1, publishTime: '2026-06-08T10:00:00Z' }), status: 'pending', priority: 'high', scheduledAt: new Date('2026-06-08T10:00:00Z') },
    { leadId: 3, type: 'follow_up', title: '跟进 Sarah Wong - 发送产品介绍', config: JSON.stringify({ templateId: 1, channel: 'email' }), status: 'pending', priority: 'normal', scheduledAt: new Date('2026-06-08T14:00:00Z') },
    { campaignId: acqCampaigns[1].id, type: 'ai_engage', title: 'AI自动回复Facebook评论', config: JSON.stringify({ keywords: ['价格', '费用', 'how much'], autoReply: true }), status: 'running', priority: 'normal', executedBy: 'ai_agent' },
    { type: 'sync_data', title: '同步TikTok昨日数据', config: JSON.stringify({ platform: 'tiktok', dateRange: 'yesterday' }), status: 'success', priority: 'low', completedAt: new Date('2026-06-07T02:00:00Z'), result: JSON.stringify({ syncedRecords: 156 }) },
    { campaignId: acqCampaigns[3].id, type: 'report_gen', title: '生成WhatsApp周报', config: JSON.stringify({ reportType: 'weekly', dateFrom: '2026-06-01', dateTo: '2026-06-07' }), status: 'failed', priority: 'normal', errorMessage: 'API调用超时', retryCount: 2 },
  ]) {
    try { await prisma.acquisitionTask.create({ data: task }); } catch {}
  }

  // 7 条报告
  for (const report of [
    { platformId: acqPlatforms[0].id, campaignId: acqCampaigns[0].id, reportDate: new Date('2026-06-07'), reportType: 'daily', metrics: JSON.stringify({ impressions: 85000, clicks: 4200, cost: 1680, conversions: 32, cpa: 52.5 }), summary: '今日抖音投放效果良好，CPA较昨日下降12%', insights: JSON.stringify([{ type: 'positive', message: '晚间时段(20-22点)转化率最高' }, { type: 'warning', message: '建议增加女性用户定向' }]), generatedBy: 'ai' },
    { platformId: acqPlatforms[4].id, campaignId: acqCampaigns[1].id, reportDate: new Date('2026-06-07'), reportType: 'daily', metrics: JSON.stringify({ impressions: 28000, clicks: 840, cost: 1050, conversions: 24, cpa: 43.75 }), summary: 'Facebook B2B线索获取稳定，MQL质量较高', generatedBy: 'system' },
    { platformId: acqPlatforms[8].id, campaignId: acqCampaigns[2].id, reportDate: new Date('2026-06-06'), reportType: 'daily', metrics: JSON.stringify({ impressions: 0, clicks: 0, cost: 0, conversions: 0 }), summary: '活动已暂停，无新数据', generatedBy: 'system' },
    { platformId: acqPlatforms[7].id, campaignId: acqCampaigns[3].id, reportDate: new Date('2026-06-07'), reportType: 'weekly', metrics: JSON.stringify({ messagesSent: 3500, deliveryRate: 96.5, replyRate: 23.8, optOutRate: 0.8 }), summary: '本周WhatsApp运营数据优秀，回复率达23.8%', insights: JSON.stringify([{ type: 'insight', message: '周五下午消息打开率最高' }]), generatedBy: 'ai' },
    { platformId: acqPlatforms[0].id, reportDate: new Date('2026-06-01'), reportType: 'weekly', metrics: JSON.stringify({ totalImpressions: 520000, totalClicks: 26000, totalCost: 10400, totalConversions: 198, avgCpa: 52.53 }), summary: '抖音平台周报：整体ROI稳定在3.2x', generatedBy: 'ai' },
    { platformId: acqPlatforms[4].id, reportDate: new Date('2026-06-01'), reportType: 'monthly', metrics: JSON.stringify({ mql: 89, sql: 34, pipelineValue: 1250000, wonDeals: 12, revenue: 380000 }), summary: 'Facebook月报：B2B获客渠道价值凸显', generatedBy: 'ai' },
    { platformId: acqPlatforms[8].id, campaignId: acqCampaigns[2].id, reportDate: new Date('2026-05-01'), reportType: 'campaign', metrics: JSON.stringify({ totalImpressions: 1800000, totalClicks: 72000, totalCost: 22000, totalConversions: 1560, roas: 6.5 }), summary: 'TikTok东南亚活动结案报告：ROAS达6.5x，超额完成目标', generatedBy: 'ai' },
  ]) {
    try { await prisma.acquisitionReport.create({ data: report }); } catch {}
  }

  // 3 个漏斗
  for (const funnel of [
    { campaignId: acqCampaigns[0].id, funnelName: '抖音品牌漏斗', stages: JSON.stringify([{ name: '曝光', value: 2500000 }, { name: '点击', value: 125000 }, { name: '留资', value: 3200 }, { name: '跟进', value: 890 }, { name: '成交', value: 156 }]), conversionRates: JSON.stringify({ exposure_to_click: 5.0, click_to_lead: 2.56, lead_to_follow: 27.8, follow_to_deal: 17.5 }), benchmarks: JSON.stringify({ industry_avg_exposure_to_click: 3.5, industry_avg_click_to_lead: 2.0 }), dropPoints: JSON.stringify([{ stage: '点击→留资', drop_rate: 97.44, reason: '落地页加载慢' }]) },
    { campaignId: acqCampaigns[1].id, funnelName: 'Facebook B2B漏斗', stages: JSON.stringify([{ name: '曝光', value: 800000 }, { name: '点击', value: 24000 }, { name: '表单提交', value: 1200 }, { name: 'MQL确认', value: 560 }, { name: 'SQL转化', value: 180 }]), conversionRates: JSON.stringify({ exposure_to_click: 3.0, click_to_form: 5.0, form_to_mql: 46.7, mql_to_sql: 32.1 }), dropPoints: JSON.stringify([]) },
    { campaignId: acqCampaigns[3].id, funnelName: 'WhatsApp私域漏斗', stages: JSON.stringify([{ name: '触达', value: 50000 }, { name: '已读', value: 42000 }, { name: '回复', value: 9980 }, { name: '意向确认', value: 3500 }, { name: '成交', value: 2100 }]), conversionRates: JSON.stringify({ reach_to_read: 84.0, read_to_reply: 23.76, reply_to_intent: 35.07, intent_to_deal: 60.0 }), dropPoints: JSON.stringify([{ stage: '已读→回复', drop_rate: 76.24, reason: '消息内容吸引力不足' }]) },
  ]) {
    try { await prisma.acquisitionFunnel.create({ data: funnel }); } catch {}
  }

  // 5 个模板
  for (const tpl of [
    { name: '欢迎私信模板', category: 'welcome_dm', platformHint: '抖音/TikTok/Instagram', subject: 'Hi {{nickname}} 👋', body: '你好{{nickname}}！感谢关注我们！我是{{brand_name}}的专属顾问。我们专注帮助创业者解决{{pain_point}}问题。\n\n想了解更多？回复"1"即可获取免费咨询机会！\n\n🔗 {{link}}', variables: JSON.stringify([{ name: 'nickname', type: 'string', required: true, description: '对方昵称' }, { name: 'brand_name', type: 'string', required: true, default: 'WOPC' }, { name: 'pain_point', type: 'string', required: false, default: '跨境财税' }, { name: 'link', type: 'url', required: true }]), style: 'casual', effectiveness: 4.6, useCount: 2340, isPublic: true, createdBy: 'admin' },
    { name: '评论回复模板', category: 'comment_reply', platformHint: '通用', body: '感谢您的关注❤️ 关于{{topic}}的问题，我们整理了一份详细资料，您可以在这里查看：{{link}} \n\n如有其他疑问，欢迎随时私信我们~', variables: JSON.stringify([{ name: 'topic', type: 'string', required: true, description: '评论主题' }, { name: 'link', type: 'url', required: true }]), style: 'professional', effectiveness: 4.2, useCount: 1890, isPublic: true },
    { name: '产品推广帖子模板', category: 'post_template', platformHint: '小红书/Instagram', subject: '', body: '{{emoji}} {{title}}\n\n{{body}}\n\n✅ 亮点1：{{point1}}\n✅ 亮点2：{{point2}}\n✅ 亮点3：{{point3}}\n\n{{cta_text}} {{cta_link}}\n\n{{hashtags}}', variables: JSON.stringify([{ name: 'emoji', type: 'string', required: true, default: '🔥' }, { name: 'title', type: 'string', required: true }, { name: 'body', type: 'text', required: true }, { name: 'point1', type: 'string', required: true }, { name: 'point2', type: 'string', required: true }, { name: 'point3', type: 'string', required: true }, { name: 'cta_text', type: 'string', required: false, default: '戳这里' }, { name: 'cta_link', type: 'url', required: false }, { name: 'hashtags', type: 'string', required: false }]), style: 'emoji_heavy', effectiveness: 4.8, useCount: 3560, isPublic: true },
    { name: '广告文案模板', category: 'ad_copy', platformHint: 'Facebook/Google Ads', subject: '{{headline}}', body: '{{subhead}}\n\n{{body_text}}\n\n💡 {{benefit1}}\n💡 {{benefit2}}\n💡 {{benefit3}}\n\n{{cta_button}} → {{landing_url}}', variables: JSON.stringify([{ name: 'headline', type: 'string', required: true }, { name: 'subhead', type: 'string', required: true }, { name: 'body_text', type: 'text', required: true }, { name: 'benefit1', type: 'string', required: true }, { name: 'benefit2', type: 'string', required: true }, { name: 'benefit3', type: 'string', required: true }, { name: 'cta_button', type: 'string', required: false, default: '立即获取' }, { name: 'landing_url', type: 'url', required: true }]), style: 'formal', effectiveness: 4.0, useCount: 890, isPublic: true, createdBy: 'marketing' },
    { name: '跟进邮件模板', category: 'follow_up', platformHint: 'Email/LinkedIn InMail', subject: '关于{{company_name}}的{{solution}}方案', body: '尊敬的{{name}}，\n\n您好！我们是{{company_name}}，专注于为{{target_audience}}提供{{solution}}服务。\n\n注意到贵司在{{industry}}领域有深厚积累，我们的方案可以帮助您：\n- {{value_prop_1}}\n- {{value_prop_2}}\n- {{value_prop_3}}\n\n是否方便安排一个15分钟的简短通话？我们可以根据您的具体需求提供定制化建议。\n\n期待您的回复！\n\n{{signature}}', variables: JSON.stringify([{ name: 'name', type: 'string', required: true }, { name: 'company_name', type: 'string', required: true, default: 'WOPC' }, { name: 'solution', type: 'string', required: true }, { name: 'target_audience', type: 'string', required: false, default: '全球创业者' }, { name: 'industry', type: 'string', required: true }, { name: 'value_prop_1', type: 'string', required: true }, { name: 'value_prop_2', type: 'string', required: true }, { name: 'value_prop_3', type: 'string', required: true }, { name: 'signature', type: 'text', required: false, default: 'WOPC团队敬上' }]), style: 'formal', effectiveness: 4.4, useCount: 1240, isPublic: true, createdBy: 'sales' },
  ]) {
    try { await prisma.acquisitionTemplate.create({ data: tpl }); } catch {}
  }

  // 10 条API日志
  for (const log of [
    { platformId: acqPlatforms[0].id, method: 'POST', endpoint: '/v1/video/publish', statusCode: 200, latencyMs: 2350, isSuccess: true, costUsd: 0.02 },
    { platformId: acqPlatforms[0].id, method: 'GET', endpoint: '/v1/video/data', statusCode: 200, latencyMs: 450, isSuccess: true, costUsd: 0.001 },
    { platformId: acqPlatforms[4].id, method: 'POST', endpoint: '/v19.0/ads', statusCode: 200, latencyMs: 1200, isSuccess: true, costUsd: 0.05 },
    { platformId: acqPlatforms[4].id, method: 'GET', endpoint: '/v19.0/insights', statusCode: 200, latencyMs: 890, isSuccess: true, costUsd: 0.01 },
    { platformId: acqPlatforms[8].id, method: 'POST', endpoint: '/v1/content/publish', statusCode: 429, latencyMs: 150, isSuccess: false, errorCode: 'RATE_LIMIT_EXCEEDED', errorMessage: 'API调用频率超限', costUsd: 0 },
    { platformId: acqPlatforms[7].id, method: 'POST', endpoint: '/v1/messages', statusCode: 200, latencyMs: 320, isSuccess: true, costUsd: 0.005 },
    { platformId: acqPlatforms[7].id, method: 'GET', endpoint: '/v1/message-status', statusCode: 200, latencyMs: 180, isSuccess: true, costUsd: 0.002 },
    { platformId: acqPlatforms[5].id, method: 'GET', endpoint: '/v2/people/profile', statusCode: 401, latencyMs: 230, isSuccess: false, errorCode: 'UNAUTHORIZED', errorMessage: 'Token expired', costUsd: 0 },
    { platformId: acqPlatforms[6].id, method: 'POST', endpoint: '/googleads/v11/customerQueryReports', statusCode: 200, latencyMs: 2800, isSuccess: true, costUsd: 0.1 },
    { platformId: acqPlatforms[0].id, method: 'POST', endpoint: '/v1/comment/reply', statusCode: 500, latencyMs: 5000, isSuccess: false, errorCode: 'INTERNAL_ERROR', errorMessage: '服务器内部错误', costUsd: 0 },
  ]) {
    try { await prisma.acquisitionApiLog.create({ data: log }); } catch {}
  }

  console.log('     - 🎯 AI全球获客: 12 platforms + 4 campaigns + 6 contents + 10 leads + 8 influencers + 5 tasks + 7 reports + 3 funnels + 5 templates + 10 api_logs');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
