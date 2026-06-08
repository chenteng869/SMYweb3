import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class N8nService {
  constructor(private prisma: PrismaService) {}

  // ========== 工作流编辑器 CRUD ==========

  async findAllWorkflows(query: any) {
    const { page = 1, pageSize = 10, status, tag } = query;
    const where: any = {};
    if (status) where.status = status;
    if (tag) where.tags = { contains: tag };
    const [data, total] = await Promise.all([
      this.prisma.n8nWorkflow.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.n8nWorkflow.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getWorkflow(id: number) {
    const workflow = await this.prisma.n8nWorkflow.findUnique({ where: { id } });
    if (!workflow) return null;
    const [triggers, executionCount] = await Promise.all([
      this.prisma.n8nTrigger.findMany({ where: { workflowId: id } }),
      this.prisma.n8nExecution.count({ where: { workflowId: id } }),
    ]);
    return { ...workflow, triggers, executionCount };
  }

  async createWorkflow(data: any) {
    if (data.nodes && typeof data.nodes !== 'string') data.nodes = JSON.stringify(data.nodes);
    if (data.connections && typeof data.connections !== 'string') data.connections = JSON.stringify(data.connections);
    if (data.settings && typeof data.settings !== 'string') data.settings = JSON.stringify(data.settings);
    return this.prisma.n8nWorkflow.create({ data });
  }

  async updateWorkflow(id: number, data: any) {
    // 版本 +1
    const current = await this.prisma.n8nWorkflow.findUnique({ where: { id }, select: { version: true } });
    if (current) {
      data.version = (current.version || 0) + 1;
    }
    if (data.nodes && typeof data.nodes !== 'string') data.nodes = JSON.stringify(data.nodes);
    if (data.connections && typeof data.connections !== 'string') data.connections = JSON.stringify(data.connections);
    if (data.settings && typeof data.settings !== 'string') data.settings = JSON.stringify(data.settings);
    return this.prisma.n8nWorkflow.update({ where: { id }, data });
  }

  async deleteWorkflow(id: number) {
    return this.prisma.n8nWorkflow.delete({ where: { id } });
  }

  async duplicateWorkflow(id: number) {
    const source = await this.prisma.n8nWorkflow.findUnique({ where: { id } });
    if (!source) throw new Error('工作流不存在');
    const { id: _id, createdAt, updatedAt, ...rest } = source;
    return this.prisma.n8nWorkflow.create({
      data: {
        ...rest,
        name: `${source.name} (副本)`,
        status: 'draft',
        runCount: 0,
        version: 0,
      },
    });
  }

  async getWorkflowStats() {
    const [statusStats, totalRuns] = await Promise.all([
      this.prisma.n8nWorkflow.groupBy({ by: ['status'], _count: true }),
      this.prisma.n8nWorkflow.aggregate({ _sum: { runCount: true } }),
    ]);
    return {
      byStatus: statusStats.reduce((acc, item) => ({ ...acc, [item.status]: item._count }), {}),
      totalRunCount: totalRuns._sum.runCount || 0,
    };
  }

  // ========== 触发器管理 ==========

  async findAllTriggers(query: any) {
    const { page = 1, pageSize = 10, workflowId, type, isActive } = query;
    const where: any = {};
    if (workflowId) where.workflowId = Number(workflowId);
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true' || isActive === true;
    const [data, total] = await Promise.all([
      this.prisma.n8nTrigger.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.n8nTrigger.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getTrigger(id: number) {
    return this.prisma.n8nTrigger.findUnique({ where: { id } });
  }

  async createTrigger(data: any) {
    if (data.config && typeof data.config !== 'string') data.config = JSON.stringify(data.config);
    return this.prisma.n8nTrigger.create({ data });
  }

  async updateTrigger(id: number, data: any) {
    if (data.config && typeof data.config !== 'string') data.config = JSON.stringify(data.config);
    return this.prisma.n8nTrigger.update({ where: { id }, data });
  }

  async deleteTrigger(id: number) {
    return this.prisma.n8nTrigger.delete({ where: { id } });
  }

  async toggleTrigger(id: number, isActive: boolean) {
    return this.prisma.n8nTrigger.update({ where: { id }, data: { isActive } });
  }

  async testTrigger(id: number) {
    // 模拟测试触发
    const trigger = await this.prisma.n8nTrigger.findUnique({ where: { id } });
    if (!trigger) throw new Error('触发器不存在');
    return {
      success: true,
      message: `触发器 "${trigger.name}" 测试成功`,
      triggerId: id,
      testedAt: new Date(),
      mockResponse: { status: 'triggered', payload: { test: true } },
    };
  }

  // ========== 执行历史 ==========

  async findAllExecutions(query: any) {
    const { page = 1, pageSize = 10, workflowId, status, dateFrom, dateTo } = query;
    const where: any = {};
    if (workflowId) where.workflowId = Number(workflowId);
    if (status) where.status = status;
    if (dateFrom || dateTo) where.startedAt = {};
    if (dateFrom) where.startedAt.gte = new Date(dateFrom);
    if (dateTo) where.startedAt.lte = new Date(dateTo);
    const [data, total] = await Promise.all([
      this.prisma.n8nExecution.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.n8nExecution.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getExecution(id: number) {
    return this.prisma.n8nExecution.findUnique({ where: { id } });
  }

  async cancelExecution(id: number) {
    return this.prisma.n8nExecution.update({
      where: { id },
      data: { status: 'canceled', finishedAt: new Date() },
    });
  }

  async retryExecution(id: number) {
    const execution = await this.prisma.n8nExecution.findUnique({ where: { id } });
    if (!execution) throw new Error('执行记录不存在');
    return this.prisma.n8nExecution.create({
      data: {
        workflow: { connect: { id: execution.workflowId } },
        status: 'running',
        startedAt: new Date(),
        inputPayload: execution.inputPayload,
      } as any,
    });
  }

  async getExecutionStats(workflowId?: number) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const where: any = { startedAt: { gte: sevenDaysAgo } };
    if (workflowId) where.workflowId = workflowId;

    const [totalExecs, successExecs, execsWithDuration, dailyData] = await Promise.all([
      this.prisma.n8nExecution.count({ where }),
      this.prisma.n8nExecution.count({ where: { ...where, status: 'success' } }),
      this.prisma.n8nExecution.findMany({
        where: { ...where, finishedAt: { not: null } },
        select: { startedAt: true, finishedAt: true },
      }),
      this.prisma.$queryRaw`
        SELECT DATE(startedAt) as day, COUNT(*) as count
        FROM n8n_executions
        WHERE startedAt >= ${sevenDaysAgo}
        ${workflowId ? `AND workflowId = ${workflowId}` : ''}
        GROUP BY DATE(startedAt)
        ORDER BY day ASC
      ` as unknown as any[],
    ]);

    const successRate = totalExecs > 0 ? Math.round(successExecs / totalExecs * 10000) / 100 : 0;
    const avgDurationMs = execsWithDuration.length > 0
      ? Math.round(
          execsWithDuration.reduce((sum, e) => {
            const duration = new Date(e.finishedAt).getTime() - new Date(e.startedAt).getTime();
            return sum + duration;
          }, 0) / execsWithDuration.length
        )
      : 0;

    return {
      totalExecutions: totalExecs,
      successRate,
      avgDurationMs,
      trend7Days: dailyData.map(d => ({
        date: d.day instanceof Date ? d.day.toISOString().split('T')[0] : String(d.day),
        count: Number(d.count),
      })),
    };
  }

  // ========== 模板市场 ==========

  async findAllTemplates(query: any) {
    const { page = 1, pageSize = 10, category, difficulty, isOfficial } = query;
    const where: any = {};
    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    if (isOfficial !== undefined && isOfficial !== '' && isOfficial !== null) where.isOfficial = isOfficial === 'true' || isOfficial === true;
    const [data, total] = await Promise.all([
      this.prisma.n8nTemplate.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.n8nTemplate.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getTemplate(id: number) {
    return this.prisma.n8nTemplate.findUnique({ where: { id } });
  }

  async createTemplate(data: any) {
    if (data.nodes && typeof data.nodes !== 'string') data.nodes = JSON.stringify(data.nodes);
    if (data.connections && typeof data.connections !== 'string') data.connections = JSON.stringify(data.connections);
    return this.prisma.n8nTemplate.create({ data });
  }

  async updateTemplate(id: number, data: any) {
    if (data.nodes && typeof data.nodes !== 'string') data.nodes = JSON.stringify(data.nodes);
    if (data.connections && typeof data.connections !== 'string') data.connections = JSON.stringify(data.connections);
    return this.prisma.n8nTemplate.update({ where: { id }, data });
  }

  async deleteTemplate(id: number) {
    return this.prisma.n8nTemplate.delete({ where: { id } });
  }

  async installTemplate(templateId: number) {
    const template = await this.prisma.n8nTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new Error('模板不存在');
    const { id: _id, createdAt, updatedAt, useCount, rating, ...workflowData } = template;
    const workflow = await this.prisma.n8nWorkflow.create({
      data: {
        name: `${template.name} (来自模板)`,
        description: template.description,
        nodes: template.nodes,
        connections: template.connections,
        tags: template.tags,
        status: 'draft',
        version: 1,
      },
    });
    // 更新模板安装次数
    await this.prisma.n8nTemplate.update({
      where: { id: templateId },
      data: { useCount: { increment: 1 } },
    });
    return workflow;
  }

  async getTemplateStats() {
    const [categoryStats, difficultyStats, popular] = await Promise.all([
      this.prisma.n8nTemplate.groupBy({ by: ['category'], _count: true }),
      this.prisma.n8nTemplate.groupBy({ by: ['difficulty'], _count: true }),
      this.prisma.n8nTemplate.findMany({
        orderBy: { useCount: 'desc' },
        take: 10,
        select: { id: true, name: true, category: true, useCount: true, rating: true },
      }),
    ]);
    return {
      categoryDistribution: categoryStats.reduce((acc, item) => ({ ...acc, [item.category]: item._count }), {}),
      difficultyDistribution: difficultyStats.reduce((acc, item) => ({ ...acc, [item.difficulty]: item._count }), {}),
      mostPopular: popular,
    };
  }
}
