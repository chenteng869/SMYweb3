import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AiService {
  constructor(private prisma: PrismaService) {}

  // Agents
  async listAgents(query: any) {
    const { search, status } = query;
    const where: any = {};
    if (search) where.OR = [{ name: { contains: search } }, { role: { contains: search } }];
    if (status) where.status = status;
    return this.prisma.aiAgent.findMany({ where, orderBy: { sortOrder: 'asc' } });
  }

  async agentDetail(id: number) {
    return this.prisma.aiAgent.findUnique({ where: { id } });
  }

  async createAgent(data: any) {
    if (data.capabilities && typeof data.capabilities !== 'string') data.capabilities = JSON.stringify(data.capabilities);
    return this.prisma.aiAgent.create({ data });
  }

  async updateAgent(id: number, data: any) {
    return this.prisma.aiAgent.update({ where: { id }, data });
  }

  async deleteAgent(id: number) {
    return this.prisma.aiAgent.delete({ where: { id } });
  }

  // Messages
  async listMessages(query: any) {
    const { page = 1, pageSize = 20, agentId, userId, search } = query;
    const where: any = {};
    if (agentId) where.agentId = Number(agentId);
    if (userId) where.userId = Number(userId);
    if (search) where.OR = [{ content: { contains: search } }];
    const [data, total] = await Promise.all([
      this.prisma.aiMessage.findMany({ where, skip: (Number(page) - 1) * Number(pageSize), take: Number(pageSize), orderBy: { createdAt: 'desc' }, include: { agent: true, user: true } }),
      this.prisma.aiMessage.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  // Todos
  async listTodos(query: any) {
    const { status, priority, agentId, userId } = query;
    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (agentId) where.agentId = Number(agentId);
    if (userId) where.userId = Number(userId);
    return this.prisma.aiTodo.findMany({ where, orderBy: { createdAt: 'desc' }, include: { agent: true, user: true } });
  }

  // Knowledge
  async listKnowledge(query: any) {
    const { search, category } = query;
    const where: any = {};
    if (search) where.OR = [{ title: { contains: search } }, { content: { contains: search } }];
    if (category) where.category = category;
    return this.prisma.aiKnowledge.findMany({ where, orderBy: { updatedAt: 'desc' } });
  }

  async createKnowledge(data: any) {
    if (data.tags && typeof data.tags !== 'string') data.tags = JSON.stringify(data.tags);
    return this.prisma.aiKnowledge.create({ data });
  }

  async updateKnowledge(id: number, data: any) {
    return this.prisma.aiKnowledge.update({ where: { id }, data });
  }

  async deleteKnowledge(id: number) {
    return this.prisma.aiKnowledge.delete({ where: { id } });
  }

  // Stats
  async stats() {
    const [agentCount, messageCount, todoCount, knowledgeCount] = await Promise.all([
      this.prisma.aiAgent.count({ where: { isActive: true } }),
      this.prisma.aiMessage.count(),
      this.prisma.aiTodo.count({ where: { status: { in: ['pending', 'in_progress'] } } }),
      this.prisma.aiKnowledge.count({ where: { isActive: true } }),
    ]);
    return { agentCount, messageCount, todoCount, knowledgeCount };
  }
}
