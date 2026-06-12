import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class BpmService {
  constructor(private prisma: PrismaService) {}

  // ==================== 流程建模 CRUD ====================

  async findAllDefs(page: number = 1, pageSize: number = 20, category?: string, status?: string) {
    const where: any = {};
    if (category) where.category = category;
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.bpmProcessDef.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.bpmProcessDef.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async getDef(id: number) {
    const def = await this.prisma.bpmProcessDef.findUnique({ where: { id } });
    if (!def) return null;
    const [instanceCount, metricCount] = await Promise.all([
      this.prisma.bpmProcessInstance.count({ where: { defId: id } }),
      this.prisma.bpmMonitorMetric.count({ where: { defId: id } }),
    ]);
    return { ...def, instanceCount, metricCount };
  }

  async createDef(data: any) {
    return this.prisma.bpmProcessDef.create({ data: { ...data, version: 1, status: 'draft' } });
  }

  async updateDef(id: number, data: any) {
    return this.prisma.bpmProcessDef.update({ where: { id }, data });
  }

  async deleteDef(id: number) {
    // 检查是否有关联运行中的实例
    const runningCount = await this.prisma.bpmProcessInstance.count({
      where: { defId: id, status: { in: ['running', 'suspended'] } },
    });
    if (runningCount > 0) throw new Error(`存在 ${runningCount} 个运行中的实例，无法删除`);
    return this.prisma.bpmProcessDef.delete({ where: { id } });
  }

  async publishDef(id: number) {
    const def = await this.prisma.bpmProcessDef.findUnique({ where: { id } });
    if (!def || def.status !== 'draft') throw new Error('只有草稿状态的流程定义可以发布');
    // 版本号自增
    const newVersion = (def.version || 0) + 1;
    return this.prisma.bpmProcessDef.update({
      where: { id },
      data: { status: 'active', version: newVersion },
    });
  }

  async archiveDef(id: number) {
    const def = await this.prisma.bpmProcessDef.findUnique({ where: { id } });
    if (!def || def.status !== 'active') throw new Error('只有活跃状态的流程定义可以归档');
    return this.prisma.bpmProcessDef.update({ where: { id }, data: { status: 'archived' } });
  }

  async getVersionHistory(defId: number) {
    // 版本历史通过流程定义的 version 字段追踪，这里返回空数组或实现版本历史逻辑
    return [];
  }

  async getDefStats() {
    const [categoryStats, statusStats, totalInstances] = await Promise.all([
      this.prisma.bpmProcessDef.groupBy({ by: ['category'], _count: { id: true } }),
      this.prisma.bpmProcessDef.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.bpmProcessInstance.count(),
    ]);
    return { categoryDistribution: categoryStats, statusDistribution: statusStats, totalInstances };
  }

  // ==================== 流程运行 ====================

  async findAllInstances(
    page: number = 1,
    pageSize: number = 20,
    defId?: number,
    status?: string,
    initiator?: string
  ) {
    const where: any = {};
    if (defId) where.defId = defId;
    if (status) where.status = status;
    if (initiator) where.initiator = { contains: initiator };
    const [data, total] = await Promise.all([
      this.prisma.bpmProcessInstance.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { def: true },
      }),
      this.prisma.bpmProcessInstance.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async getInstance(id: number) {
    const instance = await this.prisma.bpmProcessInstance.findUnique({
      where: { id },
      include: { def: true },
    });
    if (!instance) return null;
    const tasks = await this.prisma.bpmTask.findMany({
      where: { instanceId: id },
      orderBy: { createdAt: 'asc' },
    });
    return { ...instance, tasks };
  }

  async startInstance(defId: number, data: any) {
    const def = await this.prisma.bpmProcessDef.findUnique({ where: { id: defId } });
    if (!def || def.status !== 'active') throw new Error('流程定义不存在或未发布');
    return this.prisma.bpmProcessInstance.create({
      data: {
        def: { connect: { id: defId } },
        status: 'running',
        initiator: data.initiator || 'system',
        variables: data.variables ? JSON.stringify(data.variables) : null,
        startedAt: new Date(),
      } as any,
    });
  }

  async completeInstance(instanceId: number) {
    const instance = await this.prisma.bpmProcessInstance.findUnique({ where: { id: instanceId } });
    if (!instance || instance.status !== 'running') throw new Error('实例不存在或不在运行状态');
    return this.prisma.bpmProcessInstance.update({
      where: { id: instanceId },
      data: { status: 'completed', completedAt: new Date() },
    });
  }

  async cancelInstance(instanceId: number, reason?: string) {
    const instance = await this.prisma.bpmProcessInstance.findUnique({ where: { id: instanceId } });
    if (!instance || !['running', 'suspended'].includes(instance.status))
      throw new Error('实例无法取消');
    return this.prisma.bpmProcessInstance.update({
      where: { id: instanceId },
      data: { status: 'cancelled', completedAt: new Date() },
    });
  }

  async suspendInstance(instanceId: number) {
    const instance = await this.prisma.bpmProcessInstance.findUnique({ where: { id: instanceId } });
    if (!instance || instance.status !== 'running') throw new Error('实例不在运行状态');
    return this.prisma.bpmProcessInstance.update({
      where: { id: instanceId },
      data: { status: 'suspended' },
    });
  }

  async resumeInstance(instanceId: number) {
    const instance = await this.prisma.bpmProcessInstance.findUnique({ where: { id: instanceId } });
    if (!instance || instance.status !== 'suspended') throw new Error('实例未处于暂停状态');
    return this.prisma.bpmProcessInstance.update({
      where: { id: instanceId },
      data: { status: 'running' },
    });
  }

  async getInstanceTimeline(instanceId: number) {
    const [tasks, statusChanges] = await Promise.all([
      this.prisma.bpmTask.findMany({
        where: { instanceId },
        select: {
          id: true,
          nodeName: true,
          status: true,
          assignee: true,
          createdAt: true,
          completedAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      // 假设有状态变更日志表
      [],
    ]);
    return { tasks, statusChanges };
  }

  async getInstanceStats(defId?: number) {
    const where: any = {};
    if (defId) where.defId = defId;

    const [statusCounts, instances] = await Promise.all([
      this.prisma.bpmProcessInstance.groupBy({ by: ['status'], where, _count: { id: true } }),
      this.prisma.bpmProcessInstance.findMany({
        where: { ...where, status: 'completed' },
        select: { startedAt: true, completedAt: true, durationHours: true },
      }),
    ]);

    // 计算平均耗时
    let avgDuration = 0;
    if (instances.length > 0) {
      const totalDuration = instances.reduce((sum, inst) => {
        if (inst.startedAt && inst.completedAt) {
          return sum + inst.durationHours * 60 * 60 * 1000; // 转换为毫秒
        }
        return sum;
      }, 0);
      avgDuration = totalDuration / instances.length;
    }

    return {
      statusDistribution: statusCounts,
      avgDurationMs: Math.round(avgDuration),
      totalCompleted: instances.length,
    };
  }

  // ==================== 任务管理 ====================

  async findAllTasks(
    page: number = 1,
    pageSize: number = 20,
    instanceId?: number,
    assignee?: string,
    status?: string,
    type?: string
  ) {
    const where: any = {};
    if (instanceId) where.instanceId = instanceId;
    if (assignee) where.assignee = assignee;
    if (status) where.status = status;
    if (type) where.type = type;
    const [data, total] = await Promise.all([
      this.prisma.bpmTask.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { instance: { include: { def: true } } },
      }),
      this.prisma.bpmTask.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async getTask(id: number) {
    return this.prisma.bpmTask.findUnique({
      where: { id },
      include: { instance: { include: { def: true } } },
    });
  }

  async completeTask(id: number, data: any) {
    const task = await this.prisma.bpmTask.findUnique({ where: { id } });
    if (!task || task.status !== 'pending') throw new Error('任务不存在或已完成');
    return this.prisma.bpmTask.update({
      where: { id },
      data: {
        status: 'completed',
        comment: data.comment,
        completedAt: new Date(),
      },
    });
  }

  async delegateTask(id: number, newAssignee: string) {
    const task = await this.prisma.bpmTask.findUnique({ where: { id } });
    if (!task || task.status !== 'pending') throw new Error('任务不存在或已完成');
    return this.prisma.bpmTask.update({ where: { id }, data: { assignee: newAssignee } });
  }

  async skipTask(id: number, reason?: string) {
    const task = await this.prisma.bpmTask.findUnique({ where: { id } });
    if (!task || task.status !== 'pending') throw new Error('任务不存在或已完成');
    return this.prisma.bpmTask.update({
      where: { id },
      data: { status: 'skipped', completedAt: new Date() },
    });
  }

  async claimTask(id: number, userId: string) {
    const task = await this.prisma.bpmTask.findUnique({ where: { id } });
    if (!task || task.status !== 'pending') throw new Error('任务不存在或已认领');
    return this.prisma.bpmTask.update({ where: { id }, data: { assignee: userId } });
  }

  async getMyTasks(assignee: string, status?: string) {
    const where: any = { assignee };
    if (status) where.status = status;
    else where.status = 'pending';
    return this.prisma.bpmTask.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: { instance: { include: { def: true } } },
    });
  }

  async getTaskStats() {
    const [statusCounts, overdueCount, assigneeLoad] = await Promise.all([
      this.prisma.bpmTask.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.bpmTask.count({ where: { status: 'pending', dueDate: { lt: new Date() } } }),
      this.prisma.bpmTask.groupBy({
        by: ['assignee'],
        where: { status: 'pending' },
        _count: { id: true },
      }),
    ]);
    return {
      statusDistribution: statusCounts,
      overdueCount,
      assigneeLoad: assigneeLoad.sort((a, b) => b._count.id - a._count.id).slice(0, 10),
    };
  }

  // ==================== 流程监控 ====================

  async findAllMetrics(
    page: number = 1,
    pageSize: number = 20,
    defId?: number,
    dateFrom?: Date,
    dateTo?: Date
  ) {
    const where: any = {};
    if (defId) where.defId = defId;
    if (dateFrom || dateTo) where.date = {};
    if (dateFrom) where.date.gte = dateFrom;
    if (dateTo) where.date.lte = dateTo;
    const [data, total] = await Promise.all([
      this.prisma.bpmMonitorMetric.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { date: 'desc' },
      }),
      this.prisma.bpmMonitorMetric.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async getMetric(id: number) {
    return this.prisma.bpmMonitorMetric.findUnique({ where: { id } });
  }

  async getDashboardData() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [runningCount, todayCompleted, avgDurationData, bottlenecks, recentEfficiency] =
      await Promise.all([
        this.prisma.bpmProcessInstance.count({ where: { status: 'running' } }),
        this.prisma.bpmProcessInstance.count({
          where: { status: 'completed', completedAt: { gte: todayStart } },
        }),
        this.prisma.bpmProcessInstance.aggregate({
          where: {
            status: 'completed',
            completedAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
          },
          _avg: { durationHours: true },
        }),
        this.getBottlenecks(),
        this.prisma.bpmMonitorMetric.findMany({
          where: { date: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
          orderBy: { date: 'asc' },
          take: 30,
        }),
      ]);

    return {
      runningInstances: runningCount,
      todayCompleted,
      avgDurationMs: Math.round((avgDurationData._avg.durationHours || 0) * 60 * 60 * 1000),
      bottlenecks,
      efficiencyTrend: recentEfficiency.map((m) => ({
        date: m.date,
        completionRate: m.completedCnt,
        avgDuration: m.avgDurationHrs,
      })),
    };
  }

  async getBottlenecks() {
    // 获取任务数量最多的节点类型作为瓶颈节点
    const taskStats = await this.prisma.bpmTask.groupBy({
      by: ['nodeId', 'nodeName'],
      _count: { id: true },
      where: { status: 'completed' },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });
    return taskStats.map((t) => ({
      nodeId: t.nodeId,
      nodeName: t.nodeName,
      taskCount: t._count.id,
    }));
  }

  async getEfficiencyReport(category?: string) {
    const where: any = {};
    if (category) where.def = { category };

    const defs = await this.prisma.bpmProcessDef.findMany({
      where: category ? { category } : {},
      select: { id: true, name: true, category: true },
    });

    const report = [];
    for (const def of defs) {
      const [total, completed, avgDuration] = await Promise.all([
        this.prisma.bpmProcessInstance.count({ where: { defId: def.id } }),
        this.prisma.bpmProcessInstance.count({ where: { defId: def.id, status: 'completed' } }),
        this.prisma.bpmProcessInstance.aggregate({
          where: { defId: def.id, status: 'completed' },
          _avg: { durationHours: true },
        }),
      ]);

      report.push({
        defId: def.id,
        defName: def.name,
        category: def.category,
        totalInstances: total,
        completedInstances: completed,
        completionRate: total > 0 ? Math.round((completed / total) * 10000) / 100 : 0,
        avgDurationMs: Math.round((avgDuration._avg.durationHours || 0) * 60 * 60 * 1000),
      });
    }

    return report;
  }

  async getSlaCompliance(slaHours: number = 24) {
    const slaHrs = slaHours; // durationHours 已经是小时单位
    const [total, withinSla, breached] = await Promise.all([
      this.prisma.bpmProcessInstance.count({ where: { status: 'completed' } }),
      this.prisma.bpmProcessInstance.count({
        where: { status: 'completed', durationHours: { lte: slaHrs } },
      }),
      this.prisma.bpmProcessInstance.count({
        where: { status: 'completed', durationHours: { gt: slaHrs } },
      }),
    ]);

    return {
      slaHours,
      totalCompleted: total,
      withinSla,
      breached,
      complianceRate: total > 0 ? Math.round((withinSla / total) * 10000) / 100 : 100,
    };
  }
}
