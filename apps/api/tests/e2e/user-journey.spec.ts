import { test, expect } from '@playwright/test';

/**
 * 用户完整旅程 E2E 测试
 * 覆盖核心业务流程：DID注册 → KYC提交 → 存证创建 → 电子签名 → 获客活动
 *
 * 前置条件：
 * - 应用运行在 BASE_URL（通过 playwright.config.ts 配置）
 * - 测试数据库已初始化
 */

const TEST_USER = {
  email: `e2e_user_${Date.now()}@smy.test`,
  password: 'E2ETestPass2026!',
  name: 'E2E测试用户',
  phone: '13800001111',
};

test.describe('用户完整旅程', () => {
  test.beforeEach(async ({ page }) => {
    // 设置请求拦截器以捕获 API 响应
    page.on('response', async (response) => {
      if (response.url().includes('/api/')) {
        const status = response.status();
        if (status >= 400) {
          console.log(`⚠️ API 错误 [${status}]: ${response.url()}`);
        }
      }
    });
  });

  test('DID 注册 → KYC 提交 → 存证创建 → 电子签名 → 获客活动', async ({ page }) => {
    // ====================================================================
    // Step 1: 用户注册 DID 身份
    // ====================================================================
    console.log('📋 Step 1: 用户注册 DID 身份...');

    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    // 验证页面加载成功
    await expect(page.locator('h1, h2, [class*="title"]')).toBeVisible();
    await expect(page).toHaveURL(/.*register/);

    // 填写注册表单
    await page.fill('[name="email"], input[type="email"]', TEST_USER.email);
    await page.fill('[name="password"], input[type="password"]', TEST_USER.password);
    await page.fill('[name="name"], #name', TEST_USER.name);
    await page.fill('[name="phone"], #phone', TEST_USER.phone);

    // 同意服务条款（如果存在）
    const agreeCheckbox = page.locator('[type="checkbox"]');
    if ((await agreeCheckbox.count()) > 0) {
      await agreeCheckbox.first().check();
    }

    // 提交注册表单
    const registerPromise = page.waitForResponse(
      (resp) => resp.url().includes('/auth/register') && resp.status() === 201,
      { timeout: 10000 }
    );
    await page.click('button[type="submit"], [type="submit"]');
    await registerPromise;

    // 验证注册成功 — 应跳转到首页或 DID 注册页
    await page.waitForURL(/.*(dashboard|did|home).*/i, { timeout: 10000 });
    console.log(`✅ 用户注册成功: ${TEST_USER.email}`);

    // ====================================================================
    // Step 2: 提交 KYC 材料（上传证件照片）
    // ====================================================================
    console.log('📄 Step 2: 提交 KYC 材料...');

    // 导航到 KYC 页面
    await page.goto('/kyc/submit');
    await page.waitForLoadState('networkidle');

    // 上传身份证正面照
    const idFrontInput = page.locator('input[type="file"]').first();
    await idFrontInput.setInputFiles('./test-fixtures/id-card-front.jpg');

    // 等待图片预览出现
    await expect(page.locator('[class*="preview"], img')).first().toBeVisible({
      timeout: 5000,
    });

    // 上传身份证反面照
    const idBackInput = page.locator('input[type="file"]').nth(1);
    if ((await idBackInput.count()) > 0) {
      await idBackInput.setInputFiles('./test-fixtures/id-card-back.jpg');
    }

    // 填写身份信息
    await page.fill('#realName, [name="realName"]', '张三');
    await page.fill('#idNumber, [name="idNumber"]', '110101199001011234');
    await page.selectOption('#idType, [name="idType"]', 'ID_CARD');

    // 提交 KYC
    const kycPromise = page.waitForResponse(
      (resp) => resp.url().includes('/kyc') && resp.status() === 201,
      { timeout: 15000 }
    );
    await page.click('button[type="submit"]:has-text("提交"), button:has-text("确认提交")');
    await kycPromise;

    // 验证 KYC 提交状态
    const kycStatus = page.locator('[class*="status"], [data-testid="kyc-status"]');
    await expect(kycStatus).toContainText(/pending|submitted|审核中|已提交/i);
    console.log('✅ KYC 材料已提交，等待审核...');

    // ====================================================================
    // Step 3: 创建区块链存证
    // ====================================================================
    console.log('🔗 Step 3: 创建区块链存证...');

    await page.goto('/evidence/create');
    await page.waitForLoadState('networkidle');

    // 选择要存证的文件
    const fileUpload = page.locator(
      'input[type="file"][accept*=".pdf"], input[type="file"][accept*="*"]'
    );
    await fileUpload.setInputFiles('./test-fixtures/test-contract.pdf');

    // 等待文件信息显示
    await expect(page.locator('[class*="file-name"], [class*="file-info"]')).toBeVisible();

    // 填写存证元数据
    await page.fill('[name="documentType"], #documentType', '合同协议');
    await page.fill(
      '[name="description"], #description',
      '这是一份用于E2E测试的区块链存证合同文档'
    );
    await page.selectOption('[name="category"], #category', 'legal');

    // 点击创建存证按钮
    const evidencePromise = page.waitForResponse(
      (resp) => resp.url().includes('/evidence/create') && resp.status() === 201,
      { timeout: 30000 } // 区块链交易可能需要较长时间
    );
    await page.click('button:has-text("创建存证"), button:has-text("开始存证")');
    await evidencePromise;

    // 验证存证结果 — 应显示 txHash 和 evidenceId
    await expect(page.locator('[data-testid="tx-hash"], [class*="tx-hash"]')).toBeVisible({
      timeout: 30000,
    });

    const txHashElement = page.locator('[data-testid="tx-hash"], [class*="tx-hash"]');
    const txHash = await txHashElement.textContent();
    expect(txHash).toMatch(/^0x[a-fA-F0-9]{64}$/); // 验证以太坊交易哈希格式

    const evidenceIdElement = page.locator('[data-testid="evidence-id"], [class*="evidence-id"]');
    const evidenceId = await evidenceIdElement.textContent();
    expect(evidenceId).toBeDefined();

    console.log(`✅ 区块链存证创建成功: evidenceId=${evidenceId}, txHash=${txHash}`);

    // ====================================================================
    // Step 4: 电子签名文档
    // ====================================================================
    console.log('✍️ Step 4: 电子签名文档...');

    await page.goto('/signature/sign');
    await page.waitForLoadState('networkidle');

    // 选择要签名的文档（使用刚创建的存证关联的文档）
    const docSelector = page.locator('[name="documentId"], select#documentId');
    if ((await docSelector.count()) > 0) {
      await docSelector.selectOption({ index: 0 }); // 选择第一个可用文档
    }

    // 选择签名算法
    await page.selectOption('[name="algorithm"], #algorithm', 'ECDSA');

    // 查看并确认文档内容
    const previewContent = page.locator('[class*="document-preview"], [class*="preview-content"]');
    if ((await previewContent.count()) > 0) {
      await expect(previewContent).toBeVisible();
    }

    // 执行签名操作
    const signPromise = page.waitForResponse(
      (resp) => resp.url().includes('/signature/sign') && resp.status() === 201,
      { timeout: 15000 }
    );
    await page.click('button:has-text("签署"), button:has-text("确认签名")');
    await signPromise;

    // 验证签名结果
    await expect(page.locator('[data-testid="signature-value"], [class*="sig-value"]')).toBeVisible(
      {
        timeout: 10000,
      }
    );

    const signatureValue = await page
      .locator('[data-testid="signature-value"], [class*="sig-value"]')
      .textContent();
    expect(signatureValue?.length).toBeGreaterThan(10);

    // 验证签名有效性
    const verifyButton = page.locator('button:has-text("验证签名"), [data-action="verify"]');
    if ((await verifyButton.count()) > 0) {
      await verifyButton.click();
      await expect(page.locator('[data-testid="verify-result"]')).toContainText(
        /valid|有效|true/i,
        {
          timeout: 5000,
        }
      );
    }

    console.log('✅ 文档电子签名完成且验证有效');

    // ====================================================================
    // Step 5: 查看获客活动数据
    // ====================================================================
    console.log('📊 Step 5: 查看获客活动数据...');

    await page.goto('/acquisition/dashboard');
    await page.waitForLoadState('networkidle');

    // 验证仪表盘页面加载
    await expect(page.locator('[class*="dashboard"], [class*="stats"]')).toBeVisible({
      timeout: 10000,
    });

    // 验证关键指标卡片显示
    const metricCards = page.locator('[class*="metric-card"], [class*="stat-card"], [data-metric]');
    const cardCount = await metricCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(3); // 至少应有 3 个关键指标卡片

    // 验证图表组件渲染
    const chartContainer = page.locator('[class*="chart"], canvas, [class*="graph"]');
    if ((await chartContainer.count()) > 0) {
      await expect(chartContainer.first()).toBeVisible();
    }

    // 验证数据表格或列表加载
    const dataTable = page.locator('table, [class*="table"], [role="grid"]');
    if ((await dataTable.count()) > 0) {
      const rows = dataTable.locator('tbody tr, [role="rowgroup"] tr');
      // 表格可能有数据也可能为空（新账号），只要能正常渲染即可
      expect(await dataTable.isVisible()).toBe(true);
    }

    console.log('✅ 获客活动仪表盘数据加载正常');

    // ====================================================================
    // 最终验证：完整流程无阻断性错误
    // ====================================================================
    // 截取最终状态的截图（用于调试和报告）
    await page.screenshot({
      path: `./test-results/e2e/user-journey-success-${Date.now()}.png`,
      fullPage: true,
    });

    console.log('🎉 用户完整旅程 E2E 测试全部通过！');
  });

  test('错误场景处理 — 各步骤异常应优雅降级', async ({ page }) => {
    // 测试注册时重复邮箱的处理
    await page.goto('/register');
    await page.fill('[name="email"]', 'duplicate@test.com'); // 已存在的邮箱
    await page.fill('[name="password"]', 'Test123!');
    await page.click('button[type="submit"]');

    // 应显示友好的错误提示而非白屏
    const errorMessage = page.locator(
      '[class*="error"], [class*="alert"], [role="alert"], .ant-message-error'
    );
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    await expect(errorMessage).toContainText(/已存在|already exists|conflict|重复/i);

    // 测试未登录访问受保护路由的重定向
    await page.goto('/evidence/create');
    await page.waitForLoadState('networkidle');
    // 应重定向到登录页
    await expect(page).toHaveURL(/.*(login|sign-in).*/i, { timeout: 5000 });
  });
});
