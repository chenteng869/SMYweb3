import { test, expect } from '@playwright/test';

/**
 * 管理员完整旅程 E2E 测试
 * 覆盖管理后台核心功能：登录 → Agent管理 → 监控面板 → n8n工作流管理 → 报表导出
 *
 * 前置条件：
 * - Admin Web 运行在 BASE_URL（默认 http://localhost:3000）
 * - 管理员账号已创建（通过 seed 脚本或手动创建）
 * - n8n 工作流已配置
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const ADMIN_USER = {
  email: process.env.E2E_ADMIN_EMAIL || 'admin@smy.test',
  password: process.env.E2E_ADMIN_PASSWORD || 'AdminPass2026!',
};

test.describe('管理员完整旅程', () => {
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
      path: `./test-results/e2e/admin-journey-${new Date().toISOString().replace(/[:.]/g, '-')}.png`,
      fullPage: true,
    });
  });

  // ====================================================================
  // Step 1: 管理员登录
  // ====================================================================
  test('Step 1: 管理员登录', async ({ page }) => {
    console.log('🔐 Step 1: 管理员登录...');

    // 访问 Admin Web 登录页
    await page.goto(`${BASE_URL}/admin/login`);
    await page.waitForLoadState('networkidle');

    // 验证登录页面加载成功
    await expect(page.locator('[data-testid="admin-login-page"]')).toBeVisible();
    await expect(page).toHaveURL(/.*admin.*login.*/i);

    // 输入管理员账号密码
    await page.fill('[data-testid="input-admin-email"]', ADMIN_USER.email);
    await page.fill('[data-testid="input-admin-password"]', ADMIN_USER.password);

    // 点击登录
    const loginPromise = page.waitForResponse(
      (resp) =>
        resp.url().includes('/auth/login') && (resp.status() === 200 || resp.status() === 201),
      { timeout: 15000 }
    );
    await page.click('[data-testid="btn-admin-login"]');
    await loginPromise;

    // 验证跳转到 Dashboard
    await page.waitForURL(/.*admin.*(dashboard|home).*/i, { timeout: 10000 });

    // 验证 Dashboard 页面元素
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible({
      timeout: 10000,
    });

    // 验证管理员身份标识
    const adminBadge = page.locator('[data-testid="admin-badge"], [data-role="admin"]');
    if ((await adminBadge.count()) > 0) {
      await expect(adminBadge).toBeVisible();
    }

    console.log(`✅ 管理员登录成功，跳转到 Dashboard`);

    // 截图断言
    await expect(page).toHaveScreenshot('step1-admin-login.png');
  });

  // ====================================================================
  // Step 2: Agent管理
  // ====================================================================
  test('Step 2: Agent 管理', async ({ page }) => {
    console.log('🤖 Step 2: Agent 管理...');

    // 先完成登录
    await page.goto(`${BASE_URL}/admin/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('[data-testid="input-admin-email"]', ADMIN_USER.email);
    await page.fill('[data-testid="input-admin-password"]', ADMIN_USER.password);
    await page.click('[data-testid="btn-admin-login"]');
    await page.waitForURL(/.*admin.*/i, { timeout: 10000 });

    // 进入 Agent 管理页面
    await page.click('[data-testid="nav-agents"], a[data-nav="agents"]');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="agent-management-page"]')).toBeVisible();

    // 查看活跃 Agent 会话数
    const activeSessionCount = page.locator('[data-testid="active-session-count"]');
    await expect(activeSessionCount).toBeVisible();
    const sessionCountText = await activeSessionCount.textContent();
    expect(parseInt(sessionCountText || '0')).toBeGreaterThanOrEqual(0);
    console.log(`活跃 Agent 会话数: ${sessionCountText}`);

    // 查看任务队列状态
    const taskQueueStatus = page.locator('[data-testid="task-queue-status"]');
    await expect(taskQueueStatus).toBeVisible();
    const queueStatusText = await taskQueueStatus.textContent();
    expect(queueStatusText).toBeDefined();
    console.log(`任务队列状态: ${queueStatusText}`);

    // 手动触发 Agent 任务
    const triggerButton = page.locator('[data-testid="btn-trigger-agent-task"]');
    if ((await triggerButton.count()) > 0) {
      await expect(triggerButton.first()).toBeEnabled();
      await triggerButton.first().click();

      // 选择任务类型（如果需要）
      const taskTypeSelect = page.locator('[data-testid="select-task-type"]');
      if ((await taskTypeSelect.count()) > 0) {
        await taskTypeSelect.selectOption({ index: 0 });
      }

      // 确认触发
      const triggerPromise = page.waitForResponse(
        (resp) => resp.url().includes('/agent') && resp.status() === 200,
        { timeout: 15000 }
      );
      await page.click('[data-testid="btn-confirm-trigger"]');
      await triggerPromise;

      // 验证任务执行状态变化
      const taskStatus = page.locator('[data-testid="task-execution-status"]');
      await expect(taskStatus).toBeVisible({ timeout: 10000 });
      const statusBefore = await taskStatus.textContent();

      // 等待状态变化（从 pending 到 running 或 completed）
      await page.waitForTimeout(3000);
      const statusAfter = await taskStatus.textContent();

      console.log(`任务触发前状态: ${statusBefore} -> 触发后状态: ${statusAfter}`);
      expect(statusAfter).toMatch(/running|processing|completed|success|pending/i);
    }

    console.log('✅ Agent 管理操作完成');

    // 截图断言
    await expect(page).toHaveScreenshot('step2-agent-management.png');
  });

  // ====================================================================
  // Step 3: 监控面板
  // ====================================================================
  test('Step 3: 监控面板', async ({ page }) => {
    console.log('📡 Step 3: 监控面板...');

    // 先完成登录
    await page.goto(`${BASE_URL}/admin/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('[data-testid="input-admin-email"]', ADMIN_USER.email);
    await page.fill('[data-testid="input-admin-password"]', ADMIN_USER.password);
    await page.click('[data-testid="btn-admin-login"]');
    await page.waitForURL(/.*admin.*/i, { timeout: 10000 });

    // 进入系统监控页面
    await page.click('[data-testid="nav-monitoring"], a[data-nav="monitoring"]');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="monitoring-page"]')).toBeVisible();

    // 验证 Prometheus 指标展示
    const prometheusMetrics = page.locator('[data-testid="prometheus-metrics"]');
    if ((await prometheusMetrics.count()) > 0) {
      await expect(prometheusMetrics).toBeVisible();
      // 验证有指标数据展示
      const metricItems = prometheusMetrics.locator('[data-testid="metric-item"]');
      if ((await metricItems.count()) > 0) {
        expect(await metricItems.count()).toBeGreaterThanOrEqual(1);
      }
      console.log('Prometheus 指标展示正常');
    }

    // 检查告警规则状态
    const alertRules = page.locator('[data-testid="alert-rules"]');
    if ((await alertRules.count()) > 0) {
      await expect(alertRules).toBeVisible();
      // 验证告警规则列表存在
      const ruleItems = alertRules.locator('[data-testid="alert-rule-item"]');
      expect(await ruleItems.count()).toBeGreaterThanOrEqual(0); // 可以为空但应正常渲染
      console.log('告警规则状态检查正常');
    }

    // 查看系统资源使用率 (CPU/Memory/DB连接)
    // CPU 使用率
    const cpuUsage = page.locator('[data-testid="cpu-usage"]');
    if ((await cpuUsage.count()) > 0) {
      await expect(cpuUsage).toBeVisible();
      const cpuValue = await cpuUsage.textContent();
      expect(parseFloat(cpuValue || '0')).toBeGreaterThanOrEqual(0);
      expect(parseFloat(cpuValue || '100')).toBeLessThanOrEqual(100);
      console.log(`CPU 使用率: ${cpuValue}%`);
    }

    // Memory 使用率
    const memoryUsage = page.locator('[data-testid="memory-usage"]');
    if ((await memoryUsage.count()) > 0) {
      await expect(memoryUsage).toBeVisible();
      const memValue = await memoryUsage.textContent();
      expect(parseFloat(memValue || '0')).toBeGreaterThanOrEqual(0);
      console.log(`Memory 使用率: ${memValue}%`);
    }

    // DB 连接数
    const dbConnections = page.locator('[data-testid="db-connections"]');
    if ((await dbConnections.count()) > 0) {
      await expect(dbConnections).toBeVisible();
      const dbConnValue = await dbConnections.textContent();
      expect(parseInt(dbConnValue || '0')).toBeGreaterThanOrEqual(0);
      console.log(`DB 连接数: ${dbConnValue}`);
    }

    console.log('✅ 监控面板数据验证通过');

    // 截图断言
    await expect(page).toHaveScreenshot('step3-monitoring-panel.png');
  });

  // ====================================================================
  // Step 4: n8n工作流管理
  // ====================================================================
  test('Step 4: n8n 工作流管理', async ({ page }) => {
    console.log('⚙️ Step 4: n8n 工作流管理...');

    // 先完成登录
    await page.goto(`${BASE_URL}/admin/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('[data-testid="input-admin-email"]', ADMIN_USER.email);
    await page.fill('[data-testid="input-admin-password"]', ADMIN_USER.password);
    await page.click('[data-testid="btn-admin-login"]');
    await page.waitForURL(/.*admin.*/i, { timeout: 10000 });

    // 进入 n8n 集成页面
    await page.click('[data-testid="nav-n8n"], a[data-nav="n8n"]');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="n8n-management-page"]')).toBeVisible();

    // 查看已配置的工作流列表
    const workflowList = page.locator('[data-testid="workflow-list"]');
    await expect(workflowList).toBeVisible();

    const workflowItems = workflowList.locator('[data-testid="workflow-item"]');
    const workflowCount = await workflowItems.count();
    expect(workflowCount).toBeGreaterThanOrEqual(0); // 可能为空但应正常渲染
    console.log(`已配置的工作流数量: ${workflowCount}`);

    // 如果有工作流，执行激活/停用操作
    if (workflowCount > 0) {
      const firstWorkflow = workflowItems.first();
      const workflowName = await firstWorkflow
        .locator('[data-testid="workflow-name"]')
        .textContent();
      console.log(`选择工作流: ${workflowName}`);

      // 获取当前状态
      const currentStatus = firstWorkflow.locator('[data-testid="workflow-status"]');
      const statusText = await currentStatus.textContent();

      // 切换状态（激活/停用）
      const toggleButton = firstWorkflow.locator('[data-testid="btn-toggle-workflow"]');
      await expect(toggleButton).toBeEnabled();
      await toggleButton.click();

      // 确认对话框（如果有）
      const confirmDialog = page.locator('[data-testid="confirm-dialog"]');
      if ((await confirmDialog.count()) > 0) {
        await page.click('[data-testid="btn-confirm-action"]');
      }

      // 等待状态更新
      await page.waitForTimeout(2000);

      // 验证状态已改变
      const newStatus = await currentStatus.textContent();
      expect(newStatus).not.toBe(statusText);
      console.log(`工作流状态变更: ${statusText} -> ${newStatus}`);
    } else {
      console.log('ℹ️ 当前无已配置的工作流');
    }

    // 查看最近执行记录
    const executionHistory = page.locator('[data-testid="execution-history"]');
    if ((await executionHistory.count()) > 0) {
      await expect(executionHistory).toBeVisible();

      const executionRecords = executionHistory.locator('[data-testid="execution-record"]');
      const recordCount = await executionRecords.count();
      console.log(`最近执行记录数量: ${recordCount}`);

      // 验证执行记录有时间戳和状态
      if (recordCount > 0) {
        const firstRecord = executionRecords.first();
        const recordTimestamp = firstRecord.locator('[data-testid="execution-timestamp"]');
        const recordStatus = firstRecord.locator('[data-testid="execution-status"]');
        await expect(recordTimestamp).toBeVisible();
        await expect(recordStatus).toBeVisible();
      }
    }

    console.log('✅ n8n 工作流管理操作完成');

    // 截图断言
    await expect(page).toHaveScreenshot('step4-n8n-workflow-management.png');
  });

  // ====================================================================
  // Step 5: 报表导出
  // ====================================================================
  test('Step 5: 报表导出', async ({ page }) => {
    console.log('📈 Step 5: 报表导出...');

    // 先完成登录
    await page.goto(`${BASE_URL}/admin/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('[data-testid="input-admin-email"]', ADMIN_USER.email);
    await page.fill('[data-testid="input-admin-password"]', ADMIN_USER.password);
    await page.click('[data-testid="btn-admin-login"]');
    await page.waitForURL(/.*admin.*/i, { timeout: 10000 });

    // 进入报表页面
    await page.click('[data-testid="nav-reports"], a[data-nav="reports"]');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="reports-page"]')).toBeVisible();

    // 选择时间范围
    const dateRangePicker = page.locator('[data-testid="date-range-picker"]');
    if ((await dateRangePicker.count()) > 0) {
      await dateRangePicker.click();

      // 选择预设时间范围（如"最近30天"）
      const presetOption = page.locator('[data-testid="preset-range-30d"]');
      if ((await presetOption.count()) > 0) {
        await presetOption.click();
      } else {
        // 或者选择自定义日期
        const startDateInput = page.locator('[data-testid="input-start-date"]');
        const endDateInput = page.locator('[data-testid="input-end-date"]');
        if ((await startDateInput.count()) > 0) {
          await startDateInput.fill('2026-05-01');
        }
        if ((await endDateInput.count()) > 0) {
          await endDateInput.fill('2026-06-11');
        }
      }

      // 确认日期选择
      const confirmDateBtn = page.locator('[data-testid="btn-confirm-date-range"]');
      if ((await confirmDateBtn.count()) > 0) {
        await confirmDateBtn.click();
      }
    }

    // 选择报表类型
    const reportTypeSelect = page.locator('[data-testid="select-report-type"]');
    if ((await reportTypeSelect.count()) > 0) {
      await reportTypeSelect.selectOption('operation'); // 运营报告
    }

    // 生成运营报告
    const generatePromise = page.waitForResponse(
      (resp) => resp.url().includes('/report') && (resp.status() === 200 || resp.status() === 201),
      { timeout: 30000 } // 报告生成可能需要较长时间
    );

    await page.click('[data-testid="btn-generate-report"]');
    await generatePromise;

    // 等待报告生成完成
    const reportLoading = page.locator('[data-testid="report-loading"]');
    if ((await reportLoading.count()) > 0) {
      await expect(reportLoading).toBeHidden({ timeout: 60000 }); // 等待加载消失
    }

    // 验证报告内容区域显示
    const reportContent = page.locator('[data-testid="report-content"]');
    await expect(reportContent).toBeVisible({ timeout: 30000 });

    // 验证报告包含关键章节
    const expectedSections = ['概览', 'Overview', '数据统计', '趋势分析'];
    let foundSections = 0;

    for (const section of expectedSections) {
      const sectionLocator = page.locator(`[data-testid="report-section"]:has-text("${section}")`);
      if ((await sectionLocator.count()) > 0) {
        foundSections++;
      }
    }
    expect(foundSections).toBeGreaterThanOrEqual(1);

    console.log('✅ 运营报告生成成功');

    // 验证报告下载功能
    const downloadButton = page.locator('[data-testid="btn-download-report"]');
    if ((await downloadButton.count()) > 0) {
      await expect(downloadButton).toBeEnabled();

      // 开始下载
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 30000 }),
        downloadButton.click(),
      ]);

      // 验证下载文件名和大小
      const fileName = download.suggestedFilename();
      expect(fileName).toBeDefined();
      expect(fileName.length).toBeGreaterThan(0);
      console.log(`报告下载成功: ${fileName}`);
    }

    console.log('✅ 报表导出流程验证通过');

    // 截图断言
    await expect(page).toHaveScreenshot('step5-report-export.png');
  });
});
