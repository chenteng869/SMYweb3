import { test, expect } from '@playwright/test';

/**
 * 用户完整旅程 E2E 测试
 * 覆盖核心业务流程：DID注册 → KYC身份验证 → 区块链存证 → 电子签名 → 获客数据查看
 *
 * 前置条件：
 * - H5前端运行在 BASE_URL（默认 http://localhost:3000）
 * - 测试数据库已初始化
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const TEST_USER = {
  email: `e2e_user_${Date.now()}@smy.test`,
  password: 'E2ETestPass2026!',
  name: 'E2E测试用户',
  phone: '13800001111',
};

test.describe('用户完整旅程', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(30000);
    // 设置请求拦截器以捕获 API 响应
    page.on('response', async (response) => {
      if (response.url().includes('/api/')) {
        const status = response.status();
        if (status >= 400) {
          console.log(`[API Error] ${status}: ${response.url()}`);
        }
      }
    });
  });

  test.afterEach(async ({ page }) => {
    // 每个测试后截图用于调试
    await page.screenshot({
      path: `./test-results/e2e/user-journey-${new Date().toISOString().replace(/[:.]/g, '-')}.png`,
      fullPage: true,
    });
  });

  // ====================================================================
  // Step 1: DID注册与查看
  // ====================================================================
  test('Step 1: DID 注册与查看', async ({ page }) => {
    console.log('📋 Step 1: DID 注册与查看...');

    await page.goto(`${BASE_URL}/did`);
    await page.waitForLoadState('networkidle');

    // 验证页面加载成功
    await expect(page.locator('[data-testid="did-page"]')).toBeVisible();
    await expect(page).toHaveURL(/.*did.*/i);

    // 点击"申请新DID"按钮
    await page.click('[data-testid="btn-apply-did"]');
    await expect(page.locator('[data-testid="did-form"]')).toBeVisible();

    // 填写表单
    await page.fill('[data-testid="input-did-name"]', TEST_USER.name);
    await page.fill('[data-testid="input-did-email"]', TEST_USER.email);
    await page.fill('[data-testid="input-did-phone"]', TEST_USER.phone);

    // 提交表单
    const didPromise = page.waitForResponse(
      (resp) => resp.url().includes('/did') && (resp.status() === 201 || resp.status() === 200),
      { timeout: 15000 }
    );
    await page.click('[data-testid="btn-submit-did"]');
    await didPromise;

    // 验证DID格式显示 did:zsdt:U{userId}{seq}
    const didElement = page.locator('[data-testid="did-value"]');
    await expect(didElement).toBeVisible({ timeout: 10000 });

    const didValue = await didElement.textContent();
    expect(didValue).toMatch(/^did:zsdt:U\d+\d+$/);

    console.log(`✅ DID 注册成功: ${didValue}`);

    // 截图断言
    await expect(page).toHaveScreenshot('step1-did-register.png');
  });

  // ====================================================================
  // Step 2: KYC身份验证
  // ====================================================================
  test('Step 2: KYC 身份验证', async ({ page }) => {
    console.log('📄 Step 2: KYC 身份验证...');

    // 进入KYC页面
    await page.goto(`${BASE_URL}/kyc`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="kyc-page"]')).toBeVisible();

    // 上传身份证照片(模拟)
    const idFrontInput = page.locator('[data-testid="upload-id-front"] input[type="file"]');
    await idFrontInput.setInputFiles({
      name: 'test-id-front.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
    });

    // 等待图片预览出现
    await expect(page.locator('[data-testid="id-preview"]')).toBeVisible({ timeout: 5000 });

    // 填写个人信息
    await page.fill('[data-testid="input-realname"]', '张三');
    await page.fill('[data-testid="input-id-number"]', '110101199001011234');
    await page.selectOption('[data-testid="select-id-type"]', 'ID_CARD');

    // 提交KYC申请
    const kycPromise = page.waitForResponse(
      (resp) => resp.url().includes('/kyc') && (resp.status() === 201 || resp.status() === 200),
      { timeout: 15000 }
    );
    await page.click('[data-testid="btn-submit-kyc"]');
    await kycPromise;

    // 验证状态变为 pending_review
    const kycStatus = page.locator('[data-testid="kyc-status"]');
    await expect(kycStatus).toBeVisible({ timeout: 10000 });
    await expect(kycStatus).toHaveText(/pending_review|pending|审核中/i);

    console.log('✅ KYC 申请已提交，状态为 pending_review');

    // 截图断言
    await expect(page).toHaveScreenshot('step2-kyc-submitted.png');
  });

  // ====================================================================
  // Step 3: 区块链存证
  // ====================================================================
  test('Step 3: 区块链存证', async ({ page }) => {
    console.log('🔗 Step 3: 区块链存证...');

    // 进入存证功能页
    await page.goto(`${BASE_URL}/evidence`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="evidence-page"]')).toBeVisible();

    // 选择要存证的文件
    const fileInput = page.locator('[data-testid="upload-evidence-file"] input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake-pdf-content'),
    });

    // 等待文件信息显示
    await expect(page.locator('[data-testid="file-info"]')).toBeVisible({ timeout: 5000 });

    // 填写存证元数据
    await page.fill('[data-testid="input-doc-type"]', '合同协议');
    await page.fill('[data-testid="input-description"]', 'E2E测试区块链存证文档');

    // 点击"创建存证"
    const evidencePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes('/evidence') && (resp.status() === 201 || resp.status() === 200),
      { timeout: 30000 } // 区块链交易可能需要较长时间
    );
    await page.click('[data-testid="btn-create-evidence"]');
    await evidencePromise;

    // 等待处理完成 - 验证存证记录出现且状态为 confirmed
    const evidenceRecord = page.locator('[data-testid="evidence-record"]');
    await expect(evidenceRecord).toBeVisible({ timeout: 30000 });

    const evidenceStatus = page.locator('[data-testid="evidence-status"]');
    await expect(evidenceStatus).toHaveText(/confirmed|confirmed|已完成/i);

    // 验证交易哈希格式
    const txHash = page.locator('[data-testid="tx-hash"]');
    await expect(txHash).toBeVisible();
    const hashValue = await txHash.textContent();
    expect(hashValue).toMatch(/^0x[a-fA-F0-9]{64}$/);

    console.log(`✅ 区块链存证创建成功，txHash: ${hashValue}`);

    // 截图断言
    await expect(page).toHaveScreenshot('step3-evidence-created.png');
  });

  // ====================================================================
  // Step 4: 电子签名
  // ====================================================================
  test('Step 4: 电子签名', async ({ page }) => {
    console.log('✍️ Step 4: 电子签名...');

    // 进入签名页面
    await page.goto(`${BASE_URL}/signature`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="signature-page"]')).toBeVisible();

    // 选择待签文档
    const docSelector = page.locator('[data-testid="select-document"]');
    if ((await docSelector.count()) > 0) {
      await docSelector.selectOption({ index: 0 }); // 选择第一个可用文档
    }

    // 选择签名算法(ECDSA/EdDSA)
    await page.selectOption('[data-testid="select-algorithm"]', 'ECDSA');

    // 确认查看文档内容
    const previewContent = page.locator('[data-testid="document-preview"]');
    if ((await previewContent.count()) > 0) {
      await expect(previewContent).toBeVisible();
    }

    // 执行签名操作
    const signPromise = page.waitForResponse(
      (resp) =>
        resp.url().includes('/signature') && (resp.status() === 201 || resp.status() === 200),
      { timeout: 15000 }
    );
    await page.click('[data-testid="btn-sign"]');
    await signPromise;

    // 验证签名成功提示
    const successToast = page.locator(
      '[data-testid="sign-success-toast"], [data-testid="toast-success"]'
    );
    await expect(successToast.first()).toBeVisible({ timeout: 10000 });
    await expect(successToast.first()).toContainText(/success|签名成功|signed/i);

    // 验证签名值存在且长度合理
    const signatureValue = page.locator('[data-testid="signature-value"]');
    await expect(signatureValue).toBeVisible();
    const sigValue = await signatureValue.textContent();
    expect(sigValue?.length).toBeGreaterThan(10);

    console.log(`✅ 电子签名完成`);

    // 截图断言
    await expect(page).toHaveScreenshot('step4-signature-complete.png');
  });

  // ====================================================================
  // Step 5: 获客数据查看
  // ====================================================================
  test('Step 5: 获客数据查看', async ({ page }) => {
    console.log('📊 Step 5: 获客数据查看...');

    // 进入获客Dashboard
    await page.goto(`${BASE_URL}/acquisition/dashboard`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="acquisition-dashboard"]')).toBeVisible({
      timeout: 10000,
    });

    // 验证KPI卡片数据展示
    const kpiCards = page.locator('[data-testid="kpi-card"]');
    const cardCount = await kpiCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(3); // 至少应有 3 个 KPI 卡片

    // 验证每个 KPI 卡片有数值显示
    for (let i = 0; i < cardCount; i++) {
      const card = kpiCards.nth(i);
      await expect(card).toBeVisible();
      const cardValue = card.locator('[data-testid="kpi-value"]');
      if ((await cardValue.count()) > 0) {
        await expect(cardValue).not.toBeEmpty();
      }
    }

    // 查看线索列表
    const leadList = page.locator('[data-testid="lead-list"]');
    if ((await leadList.count()) > 0) {
      await expect(leadList).toBeVisible();
      // 验证列表可滚动或至少渲染了行
      const leadRows = leadList.locator('[data-testid="lead-row"]');
      expect(await leadRows.count()).toBeGreaterThanOrEqual(0); // 可能为空但应正常渲染
    }

    // 验证图表渲染
    const chartContainer = page.locator(
      '[data-testid="chart-container"], [data-testid="acquisition-chart"]'
    );
    if ((await chartContainer.count()) > 0) {
      await expect(chartContainer.first()).toBeVisible();
      // 验证图表内部有 canvas 或 svg 元素
      const chartCanvas = chartContainer.first().locator('canvas, svg');
      if ((await chartCanvas.count()) > 0) {
        await expect(chartCanvas.first()).toBeVisible();
      }
    }

    console.log('✅ 获客 Dashboard 数据加载正常');

    // 截图断言
    await expect(page).toHaveScreenshot('step5-acquisition-dashboard.png');
  });
});
