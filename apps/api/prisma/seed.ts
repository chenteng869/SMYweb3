import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始播种测试数据...');

  // ===== 1. 管理员角色 =====
  const roles = await Promise.all([
    prisma.adminRole.upsert({
      where: { code: 'super_admin' },
      update: {},
      create: { name: '超级管理员', code: 'super_admin', permissions: '["*"]' },
    }),
    prisma.adminRole.upsert({
      where: { code: 'operator' },
      update: {},
      create: { name: '运营人员', code: 'operator', permissions: '["did:*","kyc:*","sbt:read"]' },
    }),
    prisma.adminRole.upsert({
      where: { code: 'auditor' },
      update: {},
      create: { name: '审计员', code: 'auditor', permissions: '["did:read","audit:read"]' },
    }),
  ]);

  // ===== 2. 管理员账号 =====
  const adminUsers = await Promise.all([
    prisma.adminUser.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        email: 'admin@smyweb3.com',
        password: '$2b$10$CHANGE_ME_IN_PRODUCTION',
        name: '系统管理员',
        roleId: roles[0].id,
        isActive: true,
      },
    }),
    prisma.adminUser.upsert({
      where: { username: 'operator' },
      update: {},
      create: {
        username: 'operator',
        email: 'operator@smyweb3.com',
        password: '$2b$10$CHANGE_ME_IN_PRODUCTION',
        name: '运营人员',
        roleId: roles[1].id,
        isActive: true,
      },
    }),
    prisma.adminUser.upsert({
      where: { username: 'auditor' },
      update: {},
      create: {
        username: 'auditor',
        email: 'auditor@smyweb3.com',
        password: '$2b$10$CHANGE_ME_IN_PRODUCTION',
        name: '审计员',
        roleId: roles[2].id,
        isActive: true,
      },
    }),
  ]);
  console.log(`✅ 管理员角色: ${roles.length}, 账号: 3`);

  // ===== 3. 用户账号 =====
  const users = await Promise.all([
    prisma.user.upsert({
      where: { openId: 'ou_001' },
      update: {},
      create: {
        id: 1,
        openId: 'ou_001',
        name: '张三',
        email: 'zhangsan@example.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangsan',
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { openId: 'ou_002' },
      update: {},
      create: {
        id: 2,
        openId: 'ou_002',
        name: '李四',
        email: 'lisi@example.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisi',
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { openId: 'ou_003' },
      update: {},
      create: {
        id: 3,
        openId: 'ou_003',
        name: '王五',
        email: 'wangwu@example.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wangwu',
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { openId: 'ou_004' },
      update: {},
      create: {
        id: 4,
        openId: 'ou_004',
        name: '赵六',
        email: 'zhaoliu@example.com',
        isBanned: true,
        bannedReason: '违规操作',
      },
    }),
    prisma.user.upsert({
      where: { openId: 'ou_005' },
      update: {},
      create: { id: 5, openId: 'ou_005', name: '孙七', email: 'sunqi@example.com', isActive: true },
    }),
  ]);
  console.log(`✅ 用户: ${users.length} 条`);

  // ===== 4. DID 身份 =====
  const dids = await Promise.all([
    prisma.didIdentity.upsert({
      where: { userId: 1 },
      update: {},
      create: {
        userId: 1,
        did: 'did:zsdt:U202600000001',
        status: 'active',
        kycStatus: 'verified',
        riskLevel: 'low',
        primaryWallet: '0x1234567890abcdef1234567890abcdef12345678',
        activatedAt: new Date('2026-06-02'),
      },
    }),
    prisma.didIdentity.upsert({
      where: { userId: 2 },
      update: {},
      create: {
        userId: 2,
        did: 'did:zsdt:U202600000002',
        status: 'created',
        kycStatus: 'unverified',
        riskLevel: 'low',
        primaryWallet: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      },
    }),
    prisma.didIdentity.upsert({
      where: { userId: 3 },
      update: {},
      create: {
        userId: 3,
        did: 'did:zsdt:U202600000003',
        status: 'frozen',
        kycStatus: 'pending',
        riskLevel: 'high',
        primaryWallet: '0x9876543210fedcba9876543210fedcba98765432',
        frozenAt: new Date('2026-06-08'),
      },
    }),
    prisma.didIdentity.upsert({
      where: { userId: 5 },
      update: {},
      create: {
        userId: 5,
        did: 'did:zsdt:U202600000004',
        status: 'created',
        kycStatus: 'unverified',
        riskLevel: 'medium',
      },
    }),
    prisma.didIdentity.upsert({
      where: { userId: 4 },
      update: {},
      create: {
        userId: 4,
        did: 'did:zsdt:U202600000005',
        status: 'revoked',
        kycStatus: 'rejected',
        riskLevel: 'critical',
        revokedAt: new Date('2026-06-09'),
      },
    }),
  ]);
  console.log(`✅ DID 身份: ${dids.length} 条`);

  // ===== 5. 钱包账户 =====
  const walletData = [
    {
      userId: 1,
      didId: 1,
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: '1',
      walletType: 'metamask',
      isPrimary: true,
    },
    {
      userId: 1,
      didId: 1,
      walletAddress: '0x1111111111111111111111111111111111111111',
      chainId: '137',
      walletType: 'metamask',
      isPrimary: false,
    },
    {
      userId: 2,
      didId: 2,
      walletAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      chainId: '1',
      walletType: 'metamask',
      isPrimary: true,
    },
    {
      userId: 3,
      didId: 3,
      walletAddress: '0x9876543210fedcba9876543210fedcba98765432',
      chainId: '1',
      walletType: 'metamask',
      isPrimary: true,
    },
    {
      userId: 5,
      didId: 4,
      walletAddress: '0xcafebabecafebabecafebabecafebabecafebabe',
      chainId: '56',
      walletType: 'okx',
      isPrimary: true,
    },
  ];
  for (const w of walletData) {
    await prisma.walletAccount.upsert({
      where: { id: w.didId! * 100 + 1 },
      update: {},
      create: { ...w, id: w.didId! * 100 + 1 },
    });
  }
  console.log(`✅ 钱包: ${walletData.length} 条`);

  // ===== 6. KYC 记录 =====
  const kycData = [
    { userId: 1, didId: 1, documentType: 'PASSPORT', kycStatus: 'approved' },
    { userId: 2, didId: 2, documentType: 'ID_CARD', kycStatus: 'pending' },
    { userId: 3, didId: 3, documentType: 'PASSPORT', kycStatus: 'rejected' },
    { userId: 4, didId: null, documentType: 'ID_CARD', kycStatus: 'rejected' },
  ];
  for (const k of kycData) {
    await prisma.kycRecord.upsert({
      where: { id: kycData.indexOf(k) + 1 },
      update: {},
      create: { ...k, id: kycData.indexOf(k) + 1 },
    });
  }
  console.log(`✅ KYC 记录: ${kycData.length} 条`);

  // ===== 7. SBT 凭证 =====
  const sbtData = [
    {
      userId: 1,
      didId: 1,
      credentialType: 'KYC_VERIFIED',
      status: 'active',
      credentialLevel: 'standard',
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
    },
    {
      userId: 1,
      didId: 1,
      credentialType: 'MEMBER',
      status: 'active',
      credentialLevel: 'gold',
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
    },
    {
      userId: 1,
      didId: 1,
      credentialType: 'VIP',
      status: 'active',
      credentialLevel: 'platinum',
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
    },
    {
      userId: 1,
      didId: 1,
      credentialType: 'MERCHANT',
      status: 'active',
      credentialLevel: 'standard',
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
    },
    {
      userId: 1,
      didId: 1,
      credentialType: 'ECOSYSTEM_USER',
      status: 'active',
      credentialLevel: 'standard',
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
    },
  ];
  for (const s of sbtData) {
    await prisma.sbtCredential.upsert({
      where: { id: sbtData.indexOf(s) + 1 },
      update: {},
      create: { ...s, id: sbtData.indexOf(s) + 1 },
    });
  }
  console.log(`✅ SBT 凭证: ${sbtData.length} 条`);

  // ===== 8. 平台权限 =====
  const permData = [
    { userId: 1, didId: 1, platform: 'portal', allowed: true, permissionStatus: 'approved' },
    { userId: 1, didId: 1, platform: 'ecommerce', allowed: true, permissionStatus: 'approved' },
    { userId: 1, didId: 1, platform: 'exchange', allowed: true, permissionStatus: 'approved' },
    { userId: 1, didId: 1, platform: 'gaming', allowed: false, permissionStatus: 'denied' },
    { userId: 2, didId: 2, platform: 'portal', allowed: true, permissionStatus: 'approved' },
    { userId: 2, didId: 2, platform: 'ecommerce', allowed: false, permissionStatus: 'denied' },
    { userId: 3, didId: 3, platform: 'portal', allowed: false, permissionStatus: 'pending' },
    { userId: 5, didId: 4, platform: 'portal', allowed: true, permissionStatus: 'approved' },
  ];
  for (const p of permData) {
    await prisma.platformPermission.upsert({
      where: { id: permData.indexOf(p) + 10 },
      update: {},
      create: { ...p, id: permData.indexOf(p) + 10 },
    });
  }
  console.log(`✅ 平台权限: ${permData.length} 条`);

  // ===== 9. 审计日志 =====
  const auditData = [
    {
      didId: 1,
      adminId: 1,
      action: 'did:create',
      module: 'DID',
      beforeData: JSON.stringify({ reason: '用户注册DID身份' }),
    },
    {
      didId: 1,
      adminId: 1,
      action: 'wallet:bind',
      module: 'WALLET',
      beforeData: JSON.stringify({ reason: '绑定主钱包地址' }),
    },
    {
      didId: 1,
      action: 'kyc:submit',
      module: 'KYC',
      beforeData: JSON.stringify({ reason: '提交KYC认证材料' }),
    },
    {
      didId: 1,
      adminId: 1,
      action: 'kyc:verify',
      module: 'KYC',
      beforeData: JSON.stringify({ reason: 'KYC审核通过' }),
    },
    {
      didId: 1,
      adminId: 1,
      action: 'sbt:issue',
      module: 'SBT',
      beforeData: JSON.stringify({ reason: '签发KYC验证凭证' }),
    },
    {
      didId: 1,
      adminId: 1,
      action: 'sbt:issue',
      module: 'SBT',
      beforeData: JSON.stringify({ reason: '签发会员凭证' }),
    },
    { didId: 3, action: 'did:create', module: 'DID' },
    {
      didId: 3,
      adminId: 1,
      action: 'did:freeze',
      module: 'DID',
      beforeData: JSON.stringify({ reason: '异常交易行为检测' }),
    },
    {
      didId: 4,
      adminId: 1,
      action: 'did:revoke',
      module: 'DID',
      beforeData: JSON.stringify({ reason: '用户申请注销' }),
    },
  ];
  for (const a of auditData) {
    await prisma.auditLog.upsert({
      where: { id: auditData.indexOf(a) + 20 },
      update: {},
      create: { ...a, id: auditData.indexOf(a) + 20 },
    });
  }
  console.log(`✅ 审计日志: ${auditData.length} 条`);

  // ===== 10. 文件存储记录 =====
  const fileStorageData = [
    {
      id: 1,
      fileName: 'kyc_passport_zhangsan.pdf',
      originalName: 'passport.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2048576n,
      storagePath: 'uploads/2026/06/kyc_passport_zhangsan.pdf',
      hashSha256: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567',
      bucket: 'smyweb3-files',
      uploadedBy: 1,
    },
    {
      id: 2,
      fileName: 'contract_20260601.docx',
      originalName: '服务协议.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      sizeBytes: 512000n,
      storagePath: 'documents/2026/06/contract_20260601.docx',
      hashSha256: 'b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef12345678',
      bucket: 'smyweb3-documents',
      uploadedBy: 1,
    },
    {
      id: 3,
      fileName: 'id_card_lisi.jpg',
      originalName: '身份证正面.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1024000n,
      storagePath: 'uploads/2026/06/id_card_lisi.jpg',
      hashSha256: 'c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
      bucket: 'smyweb3-files',
      uploadedBy: 2,
    },
    {
      id: 4,
      fileName: 'report_q2_2026.pdf',
      originalName: 'Q2季度报告.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 4096000n,
      storagePath: 'reports/2026/q2/report_q2_2026.pdf',
      hashSha256: 'd4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890ab',
      bucket: 'smyweb3-reports',
      uploadedBy: 1,
    },
    {
      id: 5,
      fileName: 'avatar_wangwu.png',
      originalName: '头像.png',
      mimeType: 'image/png',
      sizeBytes: 256000n,
      storagePath: 'avatars/wangwu.png',
      hashSha256: 'e5f67890abcdef1234567890abcdef1234567890abcdef1234567890abcde',
      bucket: 'smyweb3-avatars',
      uploadedBy: 3,
    },
  ];
  for (const f of fileStorageData) {
    await prisma.fileStorage.upsert({
      where: { id: f.id },
      update: {},
      create: f,
    });
  }
  console.log(`✅ 文件存储: ${fileStorageData.length} 条`);

  // ===== 11. 区块链存证记录 =====
  const evidenceData = [
    {
      id: 1,
      fileId: 1,
      fileHash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567',
      txHash: '0xabc123def45678901234567890123456789012345678901234567890abcdef12',
      blockNumber: 18500000n,
      contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 1,
      didId: 1,
      evidenceType: 'document',
      metadata: JSON.stringify({ documentType: 'KYC_PASSPORT', uploader: 'zhangsan' }),
      isVerified: true,
      verifiedAt: new Date('2026-06-03T10:30:00Z'),
    },
    {
      id: 2,
      fileId: 2,
      fileHash: 'b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef12345678',
      txHash: '0xdef456abc78901234567890123456789012345678901234567890123456ab',
      blockNumber: 18500100n,
      contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 1,
      didId: 1,
      evidenceType: 'signature',
      metadata: JSON.stringify({ signatory: 'zhangsan', documentType: 'SERVICE_CONTRACT' }),
      isVerified: true,
      verifiedAt: new Date('2026-06-03T11:00:00Z'),
    },
    {
      id: 3,
      fileId: 4,
      fileHash: 'd4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890ab',
      txHash: '0x567890abcdef1234567890123456789012345678901234567890abcdef1234',
      blockNumber: 18500200n,
      contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 137,
      didId: null,
      evidenceType: 'report',
      metadata: JSON.stringify({ reportType: 'QUARTERLY', quarter: 'Q2_2026' }),
      isVerified: false,
    },
  ];
  for (const e of evidenceData) {
    await prisma.blockchainEvidence.upsert({
      where: { id: e.id },
      update: {},
      create: e,
    });
  }
  console.log(`✅ 区块链存证: ${evidenceData.length} 条`);

  // ===== 12. 电子签名记录 =====
  // 先创建一个用于签名的文档（Document 模型字段: name/type/category/fileUrl/status）
  const signDocument = await prisma.document.upsert({
    where: { id: 100 },
    update: {},
    create: {
      id: 100,
      name: 'SMYWeb3 服务协议 - 测试签名文档',
      type: 'contract',
      category: '合同',
      fileUrl: '/documents/2026/06/contract_20260601.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileSize: 512000,
      status: 'uploaded',
      userId: 1,
    },
  });

  const signatureData = [
    {
      id: 1,
      documentId: signDocument.id,
      signerDid: 1,
      signatureValue:
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678',
      publicKey:
        '0x04abc123def4567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890124',
      algorithm: 'ECDSA',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      isValid: true,
    },
  ];
  for (const s of signatureData) {
    await prisma.eSignature.upsert({
      where: { id: s.id },
      update: {},
      create: s,
    });
  }
  console.log(`✅ 电子签名: ${signatureData.length} 条`);

  // ===== 13. Agent 会话与任务 =====
  // 先确保有 OpenClawAgent 配置记录（字段: name/type/description/config/status/createdBy为String）
  const agentConfig = await prisma.openClawAgent.upsert({
    where: { id: 10 },
    update: {},
    create: {
      id: 10,
      name: '内容采集 Agent',
      description: '负责多平台内容自动采集与标准化处理',
      type: 'rpa_agent',
      config: JSON.stringify({
        platforms: ['twitter', 'youtube', 'telegram'],
        maxConcurrentTasks: 5,
        retryPolicy: { maxRetries: 3, backoffMs: 2000 },
      }),
      tools: JSON.stringify(['web_search', 'content_parser', 'file_reader']),
      status: 'active',
      createdBy: 'admin',
    },
  });

  // 再创建 AI 模型提供商 + 实例（供 LlmCallLog 引用）
  const aiProvider = await prisma.aiModelProvider.upsert({
    where: { id: 30 },
    update: {},
    create: {
      id: 30,
      name: 'OpenAI',
      code: 'openai',
      type: 'cloud',
      apiUrl: 'https://api.openai.com/v1',
      status: 'active',
      maxRpm: 500,
      maxTpm: 150000,
      description: 'OpenAI GPT系列模型',
    },
  });

  const aiModelInstance = await prisma.aiModelInstance.upsert({
    where: { id: 20 },
    update: {},
    create: {
      id: 20,
      providerId: aiProvider.id,
      modelId: 'gpt-4o',
      name: 'GPT-4o 生产实例',
      contextWindow: 128000,
      maxOutput: 4096,
      inputPrice: 2.5,
      outputPrice: 10.0,
      capabilities: JSON.stringify(['vision', 'function_calling', 'json_mode', 'streaming']),
      supportsVision: true,
      supportsTools: true,
      status: 'available',
      isRecommended: true,
    },
  });

  const sessionData = [
    {
      id: 1,
      configId: agentConfig.id,
      userId: 1,
      status: 'completed',
      currentTask: '全部任务已完成',
      totalTasks: 10,
      completedTasks: 9,
      failedTasks: 1,
      context: JSON.stringify({ campaignId: 'camp_001', targetKeywords: ['AI', 'Web3', '区块链'] }),
      startedAt: new Date('2026-06-10T09:00:00Z'),
      completedAt: new Date('2026-06-10T11:30:00Z'),
      lastHeartbeatAt: new Date('2026-06-10T11:30:00Z'),
    },
    {
      id: 2,
      configId: agentConfig.id,
      userId: 1,
      status: 'running',
      currentTask: '正在采集 Twitter 内容',
      totalTasks: 15,
      completedTasks: 7,
      failedTasks: 0,
      context: JSON.stringify({ campaignId: 'camp_002', targetKeywords: ['DeFi', 'NFT'] }),
      startedAt: new Date('2026-06-11T08:00:00Z'),
      lastHeartbeatAt: new Date('2026-06-11T09:45:00Z'),
    },
    {
      id: 3,
      configId: agentConfig.id,
      userId: null,
      status: 'error',
      currentTask: null,
      totalTasks: 5,
      completedTasks: 2,
      failedTasks: 3,
      context: JSON.stringify({ errorReason: 'RabbitMQ 连接超时' }),
      startedAt: new Date('2026-06-09T14:00:00Z'),
      completedAt: new Date('2026-06-09T14:35:00Z'),
      lastHeartbeatAt: new Date('2026-06-09T14:30:00Z'),
    },
  ];
  for (const s of sessionData) {
    await prisma.agentSession.upsert({
      where: { id: s.id },
      update: {},
      create: s,
    });
  }

  // Agent 任务
  const taskData = [
    {
      id: 1,
      sessionId: 1,
      type: 'acquisition',
      status: 'success',
      priority: 3,
      payload: JSON.stringify({ platform: 'twitter', query: 'AI automation', limit: 50 }),
      result: JSON.stringify({ collected: 47, processed: 45 }),
      retryCount: 0,
      maxRetries: 3,
      queuedAt: new Date('2026-06-10T09:05:00Z'),
      startedAt: new Date('2026-06-10T09:05:10Z'),
      completedAt: new Date('2026-06-10T09:15:00Z'),
      createdBy: 1,
    },
    {
      id: 2,
      sessionId: 1,
      type: 'content',
      status: 'success',
      priority: 4,
      payload: JSON.stringify({ source: 'twitter', format: 'standardized' }),
      result: JSON.stringify({ generated: 30 }),
      retryCount: 0,
      maxRetries: 3,
      queuedAt: new Date('2026-06-10T09:16:00Z'),
      startedAt: new Date('2026-06-10T09:16:05Z'),
      completedAt: new Date('2026-06-10T09:25:00Z'),
      createdBy: 1,
    },
    {
      id: 3,
      sessionId: 1,
      type: 'analysis',
      status: 'failed',
      priority: 5,
      payload: JSON.stringify({ model: 'gpt-4o', prompt: '分析内容质量' }),
      errorMessage: 'LLM API 超时',
      retryCount: 3,
      maxRetries: 3,
      queuedAt: new Date('2026-06-10T09:26:00Z'),
      startedAt: new Date('2026-06-10T09:26:10Z'),
      completedAt: new Date('2026-06-10T09:40:00Z'),
      createdBy: 1,
    },
    {
      id: 4,
      sessionId: 2,
      type: 'acquisition',
      status: 'running',
      priority: 2,
      payload: JSON.stringify({ platform: 'youtube', query: 'DeFi tutorial 2026' }),
      retryCount: 0,
      maxRetries: 3,
      queuedAt: new Date('2026-06-11T08:05:00Z'),
      startedAt: new Date('2026-06-11T08:05:10Z'),
      createdBy: 1,
    },
    {
      id: 5,
      sessionId: 2,
      type: 'acquisition',
      status: 'queued',
      priority: 3,
      payload: JSON.stringify({ platform: 'telegram', query: 'NFT community' }),
      retryCount: 0,
      maxRetries: 3,
      queuedAt: new Date('2026-06-11T08:06:00Z'),
      createdBy: 1,
    },
    {
      id: 6,
      sessionId: 3,
      type: 'evidence',
      status: 'failed',
      priority: 1,
      payload: JSON.stringify({ fileId: 1 }),
      errorMessage: '区块链节点连接失败',
      retryCount: 3,
      maxRetries: 3,
      queuedAt: new Date('2026-06-09T14:05:00Z'),
      startedAt: new Date('2026-06-09T14:05:10Z'),
      completedAt: new Date('2026-06-09T14:30:00Z'),
      createdBy: 1,
    },
  ];
  for (const t of taskData) {
    await prisma.agentTask.upsert({
      where: { id: t.id },
      update: {},
      create: t,
    });
  }
  console.log(`✅ Agent 会话: ${sessionData.length} 条, 任务: ${taskData.length} 条`);

  // ===== 14. LLM 调用日志 =====
  const llmLogData = [
    {
      id: 1,
      instanceId: aiModelInstance.id,
      provider: 'openai',
      model: 'gpt-4o',
      promptTokens: 1200,
      completionTokens: 350,
      latencyMs: 1250,
      totalCost: 0.0042,
      success: true,
      cacheHit: false,
      userId: 1,
      sessionId: 1,
      requestHash: 'req_hash_acq_001',
    },
    {
      id: 2,
      instanceId: aiModelInstance.id,
      provider: 'openai',
      model: 'gpt-4o',
      promptTokens: 800,
      completionTokens: 200,
      latencyMs: 890,
      totalCost: 0.0028,
      success: true,
      cacheHit: true,
      userId: 1,
      sessionId: 1,
      requestHash: 'req_hash_cont_001',
    },
    {
      id: 3,
      instanceId: aiModelInstance.id,
      provider: 'openai',
      model: 'gpt-4o',
      promptTokens: 2000,
      completionTokens: 500,
      latencyMs: 30000,
      totalCost: 0.0085,
      success: false,
      errorCode: 'TIMEOUT',
      errorMessage: 'Request timed out after 30000ms',
      cacheHit: false,
      userId: 1,
      sessionId: 1,
      requestHash: 'req_hash_anal_001',
    },
    {
      id: 4,
      instanceId: aiModelInstance.id,
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      promptTokens: 1500,
      completionTokens: 400,
      latencyMs: 2100,
      totalCost: 0.0056,
      success: true,
      cacheHit: false,
      userId: 1,
      sessionId: 2,
      requestHash: 'req_hash_acq_002',
    },
    {
      id: 5,
      instanceId: aiModelInstance.id,
      provider: 'deepseek',
      model: 'deepseek-chat',
      promptTokens: 600,
      completionTokens: 150,
      latencyMs: 650,
      totalCost: 0.0008,
      success: true,
      cacheHit: false,
      userId: null,
      sessionId: null,
      requestHash: 'req_hash_sys_001',
    },
  ];
  for (const l of llmLogData) {
    await prisma.llmCallLog.upsert({
      where: { id: l.id },
      update: {},
      create: l,
    });
  }
  console.log(`✅ LLM 调用日志: ${llmLogData.length} 条`);

  // ===== 15. 通知告警规则 =====
  const notificationData = [
    {
      id: 1,
      name: 'API 响应时间告警',
      metricName: 'api_response_time_p99',
      condition: 'gt',
      thresholdValue: 3000.0,
      severity: 'warning',
      enabled: true,
      channels: '["dingtalk", "email"]',
      webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
      cooldownMinutes: 30,
      createdBy: 1,
    },
    {
      id: 2,
      name: 'Agent 错误率告警',
      metricName: 'agent_error_rate',
      condition: 'gt',
      thresholdValue: 10.0,
      severity: 'critical',
      enabled: true,
      channels: '["dingtalk"]',
      webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=yyy',
      cooldownMinutes: 15,
      createdBy: 1,
    },
    {
      id: 3,
      name: 'Redis 内存使用率告警',
      metricName: 'redis_memory_usage_percent',
      condition: 'gt',
      thresholdValue: 85.0,
      severity: 'warning',
      enabled: true,
      channels: '["dingtalk", "slack"]',
      cooldownMinutes: 60,
      createdBy: 1,
    },
    {
      id: 4,
      name: 'RabbitMQ 队列积压告警',
      metricName: 'rabbitmq_queue_messages_ready',
      condition: 'gt',
      thresholdValue: 1000.0,
      severity: 'critical',
      enabled: false,
      channels: '["email"]',
      cooldownMinutes: 20,
      createdBy: 1,
    },
    {
      id: 5,
      name: '区块链存证失败率告警',
      metricName: 'blockchain_evidence_failure_rate',
      condition: 'gt',
      thresholdValue: 5.0,
      severity: 'warning',
      enabled: true,
      channels: '["dingtalk"]',
      cooldownMinutes: 30,
      createdBy: 1,
    },
  ];
  for (const n of notificationData) {
    await prisma.notificationRule.upsert({
      where: { id: n.id },
      update: {},
      create: n,
    });
  }
  console.log(`✅ 通知规则: ${notificationData.length} 条`);

  console.log('\n🎉 播种完成！共 15 类测试数据。');
}

main()
  .catch((e) => {
    console.error('❌ 播种失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
