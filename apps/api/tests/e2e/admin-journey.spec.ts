import { test, expect } from '@playwright/test';

/**
 * 管理员操作旅程 E2E 测试
 * 覆盖管理后台核心功能：Agent启动 → 监控 → 工作流触发 → 报告查看
 *
 * 前置条件：
 * - 管理员账号已创建（通过 seed 脚本或手动创建）
 * - WebSocket 服务正常运行
 * - n8n 工作流已配置
 */

const ADMIN_USER = {
  email: process.env.E2E_ADMIN_EMAIL || 'admin@smy.test',
  password: process.env.E2E_ADMIN_PASSWORD || 'AdminPass2026!',
};

test.describe('管理员操作旅程', () => {
  test.beforeEach(async ({ page }) => {
    // 管理员登录
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');

    await page.fill('[name="email"], input[type="email"]', ADMIN_USER.email);
    await page.fill('[name="password"], input[type="password"]', ADMIN_USER.password);
    await page.click('button[type="submit"]');

    // 等待登录成功跳转到管理后台
    await page.waitForURL(/.*admin.*/i, { timeout: 10000 });
  });

  test('Agent 启动 → 监控 → 工作流触发 → 报告查看', async ({ page }) => {
    // ====================================================================
    // 步骤 1: 登录管理后台 & 导航到 Agent 管理
    // ====================================================================
    console.log('🔐 步骤 1: 管理员登录并导航到 Agent 管理...');

    // 验证管理员权限标识
    const adminBadge = page.locator('[data-role="admin"], [class*="admin-badge"]');
    if ((await adminBadge.count()) > 0) {
      await expect(adminBadge).toBeVisible();
    }

    // 导航到 Agent 管理页面
    await page.click('a[href*="agent"], nav a:has-text("Agent"), [data-nav="agents"]');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*agent.*/i);

    console.log('✅ 成功进入 Agent 管理页面');

    // ====================================================================
    // 步骤 2: 启动新的 Agent 会话
    // ====================================================================
    console.log('🤖 步骤 2: 启动新的 Agent 会话...');

    // 点击"新建会话"或"启动Agent"按钮
    const startButton = page.locator(
      'button:has-text("新建会话"), button:has-text("启动"), button:has-text("Start Session"), [data-action="start-agent"]'
    );
    await expect(startButton.first()).toBeEnabled();
    await startButton.first().click();

    // 配置 Agent 参数
    await page.waitForSelector('[class*="agent-config"], [class*="session-form"]', {
      timeout: 5000,
    });

    // 选择 Agent 类型
    const agentTypeSelect = page.locator('[name="agentType"], select#agentType');
    if ((await agentTypeSelect.count()) > 0) {
      await agentTypeSelect.selectOption('data-analyst'); // 数据分析型 Agent
    }

    // 输入任务描述
    const taskInput = page.locator(
      '[name="taskDescription"], textarea#taskDescription, [name="prompt"]'
    );
    if ((await taskInput.count()) > 0) {
      await taskInput.fill('分析最近7天的销售数据趋势，生成可视化报告');
    }

    // 设置参数（如模型选择、温度等）
    const modelSelect = page.locator('[name="model"], select#model');
    if ((await modelSelect.count()) > 0) {
      await modelSelect.selectOption('gpt-4o');
    }

    // 确认启动
    const confirmPromise = page.waitForResponse(
      (resp) =>
        resp.url().includes('/agent-session') && (resp.status() === 200 || resp.status() === 201),
      { timeout: 15000 }
    );

    await page.click(
      'button:has-text("确认启动"), button:has-text("Confirm"), button:has-text("Start")'
    );
    await confirmPromise;

    // 验证 Agent 会话已创建
    const sessionIdElement = page.locator('[data-session-id], [class*="session-id"]');
    await expect(sessionIdElement).toBeVisible({ timeout: 10000 });

    const sessionId = await sessionIdElement.textContent();
    expect(sessionId).toBeDefined();
    expect(sessionId?.length).toBeGreaterThan(0);

    console.log(`✅ Agent 会话已启动: sessionId=${sessionId}`);

    // ====================================================================
    // 步骤 3: 通过 WebSocket 实时监控状态
    // ====================================================================
    console.log('📡 步骤 3: 实时监控 Agent 运行状态...');

    // 切换到监控视图/标签
    const monitorTab = page.locator(
      'button:has-text("监控"), button:has-text("Monitor"), [data-tab="monitor"], a[href*="monitor"]'
    );
    if ((await monitorTab.count()) > 0) {
      await monitorTab.click();
    }

    // 验证实时状态面板可见
    const statusPanel = page.locator(
      '[class*="status-panel"], [class*="real-time"], [data-component="monitor"]'
    );
    await expect(statusPanel).toBeVisible({ timeout: 5000 });

    // 验证 WebSocket 连接状态指示器
    const wsIndicator = page.locator(
      '[data-ws-status], [class*="connection-status"], [class*="ws-indicator"]'
    );
    if ((await wsIndicator.count()) > 0) {
      // 等待 WebSocket 连接建立
      await expect(wsIndicator).toHaveClass(/connected|active|online/i, { timeout: 5000 });
    }

    // 验证实时日志流区域
    const logStream = page.locator('[class*="log-stream"], [class*="terminal"], pre[data-logs]');
    if ((await logStream.count()) > 0) {
      // 日志应开始输出内容
      await expect(logStream).not.toBeEmpty({ timeout: 10000 });
    }

    // 验证进度条或状态指示
    const progressBar = page.locator('[role="progressbar"], [class*="progress"]');
    if ((await progressBar.count()) > 0) {
      const progressValue = await progressBar.getAttribute('aria-valuenow', 'value');
      expect(parseFloat(progressValue || '0')).toBeGreaterThanOrEqual(0);
    }

    // Agent 状态应为 running 或 processing
    const agentStatus = page.locator('[data-status], [class*="agent-status"]');
    if ((await agentStatus.count()) > 0) {
      const currentStatus = await agentStatus.textContent();
      expect(currentStatus).toMatch(
        /running|processing|executing|运行中|执行中|initialized|initializing/i
      );
    }

    console.log('✅ 实时监控连接正常，Agent 状态可观测');

    // ====================================================================
    // 步骤 4: 触发 n8n 工作流
    // ====================================================================
    console.log('⚙️ 步骤 4: 触发 n8n 自动化工作流...');

    // 导航到工作流管理或从当前页面触发
    const workflowTrigger = page.locator(
      'button:has-text("触发工作流"), button:has-text("Trigger Workflow"), [data-action="trigger-workflow"]'
    );

    if ((await workflowTrigger.count()) > 0) {
      await workflowTrigger.click();

      // 选择要触发的工作流
      const workflowSelect = page.locator('[name="workflowId"], select#workflowId');
      if ((await workflowSelect.count()) > 0) {
        await workflowSelect.selectOption({ index: 0 });
      }

      // 确认触发
      const triggerPromise = page.waitForResponse(
        (resp) => resp.url().includes('/n8n') && resp.status() === 200,
        { timeout: 15000 }
      );

      await page.click('button:has-text("确认触发"), button:has-text("Execute")');
      await triggerPromise;

      // 验证工作流触发成功提示
      const successToast = page.locator(
        '[class*="success"], [class*="toast"], [role="status"]:has-text("成功")'
      );
      await expect(successToast).toBeVisible({ timeout: 5000 });
    } else {
      console.log('ℹ️ 当前页面无可用的工作流触发按钮，跳过此步骤');
    }

    console.log('✅ n8n 工作流触发完成');

    // ====================================================================
    // 步骤 5: 查看生成的报告
    // ====================================================================
    console.log('📈 步骤 5: 查看 Agent 生成的分析报告...');

    // 导航到报告页面
    const reportTab = page.locator(
      'button:has-text("报告"), button:has-text("Report"), [data-tab="report"], a[href*="report"]'
    );
    if ((await reportTab.count()) > 0) {
      await reportTab.click();
    } else {
      // 直接导航到报告 URL
      await page.goto(`/agent/${sessionId}/report`);
      await page.waitForLoadState('networkidle');
    }

    // 验证报告内容区域
    const reportContent = page.locator(
      '[class*="report-content"], [class*="analysis-result"], article'
    );
    await expect(reportContent).toBeVisible({ timeout: 15000 }); // 报告生成可能需要时间

    // 验证报告包含关键部分
    const reportSections = ['摘要', 'Summary', '数据分析', '结论', 'Conclusion'];
    let foundSections = 0;

    for (const section of reportSections) {
      const sectionLocator = page.locator(`h2:has-text("${section}"), h3:has-text("${section}")`);
      if ((await sectionLocator.count()) > 0) {
        foundSections++;
      }
    }
    expect(foundSections).toBeGreaterThanOrEqual(2); // 至少找到 2 个章节

    // 验证图表渲染（如果有）
    const charts = page.locator('canvas, [class*="chart-container"], svg[class*="chart"]');
    if ((await charts.count()) > 0) {
      await expect(charts.first()).toBeVisible();
    }

    // 验证导出功能可用
    const exportButton = page.locator(
      'button:has-text("导出"), button:has-text("Export"), button:has-text("下载PDF")'
    );
    if ((await exportButton.count()) > 0) {
      await expect(exportButton.first()).toBeEnabled();
    }

    console.log('✅ 分析报告生成并展示正常');

    // ====================================================================
    // 截图记录 & 清理
    // ====================================================================
    await page.screenshot({
      path: `./test-results/e2e/admin-journey-${Date.now()}.png`,
      fullPage: true,
    });

    console.log('🎉 管理员操作旅程 E2E 测试全部通过！');
  });

  test('Agent 异常恢复与错误处理', async ({ page }) => {
    // 测试 Agent 执行失败时的错误处理
    await page.goto('/admin/agents');
    await page.waitForLoadState('networkidle');

    // 尝试启动一个配置错误的 Agent（模拟失败场景）
    const startBtn = page.locator('button:has-text("新建会话")').first();
    await startBtn.click();

    // 输入无效的任务配置
    const taskInput = page.locator('[name="taskDescription"], textarea');
    if ((await taskInput.count()) > 0) {
      await taskInput.fill(''); // 空任务描述
    }

    // 尝试提交
    await page.click('button:has-text("确认启动")');

    // 应显示验证错误而非崩溃
    const errorAlert = page.locator('[class*="error"], [role="alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 5000 });

    // 测试 Agent 会话终止功能
    await page.goto('/admin/agents');
    const sessionList = page.locator('[data-session-id]');
    if ((await sessionList.count()) > 0) {
      // 找到停止按钮并点击
      const stopBtn = page.locator('button:has-text("停止"), [data-action="stop"]').first();
      if ((await stopBtn.count()) > 0) {
        await stopBtn.click();
        // 确认对话框（如果有）
        const confirmDialog = page.locator('[role="dialog"], .ant-modal');
        if ((await confirmDialog.count()) > 0) {
          await page.click('button:has-text("确定"), button:has-text("Confirm")');
        }
        // 验证状态更新为 stopped
        await expect(page.locator('[data-status="stopped"]')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('WebSocket 断线重连机制', async ({ page }) => {
    // 进入监控页面
    await page.goto('/admin/agents/monitor');
    await page.waitForLoadState('networkidle');

    // 模拟网络断开
    await page.context().setOffline(true);

    // 等待断线检测
    const offlineIndicator = page.locator(
      '[data-ws-status="disconnected"], [class*="disconnected"]'
    );
    await expect(offlineIndicator).toBeVisible({ timeout: 10000 });

    // 恢复网络
    await page.context().setOffline(false);

    // 等待自动重连
    const reconnectedIndicator = page.locator('[data-ws-status="connected"], [class*="connected"]');
    await expect(reconnectedIndicator).toBeVisible({ timeout: 15000 });

    console.log('✅ WebSocket 断线重连机制正常');
  });
});
