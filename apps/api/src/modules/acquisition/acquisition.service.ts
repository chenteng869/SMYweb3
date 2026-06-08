import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AcquisitionService {
  constructor(private prisma: PrismaService) {}

  // ========== 平台管理 ==========
  async findAllPlatforms(query: any) {
    const { page = 1, pageSize = 20, region, status, search } = query;
    const where: any = {};
    if (region) where.region = region;
    if (status) where.status = status;
    if (search) where.OR = [{ name: { contains: search } }, { displayName: { contains: search } }];
    const [data, total] = await Promise.all([
      this.prisma.acquisitionPlatform.findMany({ where, skip: (Number(page) - 1) * Number(pageSize), take: Number(pageSize), orderBy: { createdAt: 'desc' }, include: { _count: { select: { configs: true, campaigns: true, leads: true } } } }),
      this.prisma.acquisitionPlatform.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getPlatform(id: number) {
    return this.prisma.acquisitionPlatform.findUnique({ where: { id }, include: { configs: true, _count: { select: { campaigns: true, leads: true, reports: true, apiLogs: true } } } });
  }

  async createPlatform(data: any) {
    if (data.features && typeof data.features !== 'string') data.features = JSON.stringify(data.features);
    return this.prisma.acquisitionPlatform.create({ data });
  }

  async updatePlatform(id: number, data: any) {
    if (data.features && typeof data.features !== 'string') data.features = JSON.stringify(data.features);
    return this.prisma.acquisitionPlatform.update({ where: { id }, data });
  }

  async deletePlatform(id: number) {
    return this.prisma.acquisitionPlatform.delete({ where: { id } });
  }

  async getPlatformStats() {
    const [total, active, byRegion] = await Promise.all([
      this.prisma.acquisitionPlatform.count(),
      this.prisma.acquisitionPlatform.count({ where: { status: 'active' } }),
      this.prisma.acquisitionPlatform.groupBy({ by: ['region'], _count: { _all: true } }),
    ]);
    return { total, active, byRegion };
  }

  async refreshToken(id: number) {
    // 模拟刷新 token
    const platform = await this.prisma.acquisitionPlatform.findUnique({ where: { id } });
    if (!platform) throw new Error('平台不存在');
    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return this.prisma.acquisitionPlatform.update({ where: { id }, data: { tokenExpiresAt: newExpiresAt, updatedAt: new Date() } });
  }

  async testConnection(id: number) {
    // 模拟测试连接
    const platform = await this.prisma.acquisitionPlatform.findUnique({ where: { id } });
    if (!platform) throw new Error('平台不存在');
    const success = Math.random() > 0.2; // 80% 成功率
    return { success, latencyMs: Math.floor(Math.random() * 500 + 50), message: success ? '连接成功' : '连接失败：Token 已过期' };
  }

  // ========== API配置 ==========
  async findAllConfigs(query: any) {
    const { page = 1, pageSize = 20, platformId } = query;
    const where: any = {};
    if (platformId) where.platformId = Number(platformId);
    const [data, total] = await Promise.all([
      this.prisma.acquisitionApiConfig.findMany({ where, skip: (Number(page) - 1) * Number(pageSize), take: Number(pageSize), orderBy: { createdAt: 'desc' }, include: { platform: { select: { name: true, displayName: true } } } }),
      this.prisma.acquisitionApiConfig.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getConfig(id: number) {
    return this.prisma.acquisitionApiConfig.findUnique({ where: { id }, include: { platform: true } });
  }

  async createConfig(data: any) {
    return this.prisma.acquisitionApiConfig.create({ data });
  }

  async updateConfig(id: number, data: any) {
    return this.prisma.acquisitionApiConfig.update({ where: { id }, data });
  }

  async deleteConfig(id: number) {
    return this.prisma.acquisitionApiConfig.delete({ where: { id } });
  }

  async verifyConfig(id: number) {
    const config = await this.prisma.acquisitionApiConfig.findUnique({ where: { id } });
    if (!config) throw new Error('配置不存在');
    const isValid = Math.random() > 0.15;
    return this.prisma.acquisitionApiConfig.update({ where: { id }, data: { isValid, lastVerified: new Date(), updatedAt: new Date() } });
  }

  // ========== 获客活动(Campaign) ==========
  async findAllCampaigns(query: any) {
    const { page = 1, pageSize = 20, platformId, status, objective } = query;
    const where: any = {};
    if (platformId) where.platformId = Number(platformId);
    if (status) where.status = status;
    if (objective) where.objective = objective;
    const [data, total] = await Promise.all([
      this.prisma.acquisitionCampaign.findMany({
        where, skip: (Number(page) - 1) * Number(pageSize), take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: { platform: { select: { name: true, displayName: true, icon: true, region: true } }, _count: { select: { contents: true, tasks: true, funnels: true, reports: true } } }
      }),
      this.prisma.acquisitionCampaign.count({ where }),
    ]);
    return { data: data.map(d => ({ ...d, impressions: Number(d.impressions), clicks: Number(d.clicks) })), total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getCampaign(id: number) {
    const campaign = await this.prisma.acquisitionCampaign.findUnique({ where: { id }, include: { platform: true, contents: true, tasks: true, funnels: true, reports: true } });
    if (campaign) { return { ...campaign, impressions: Number(campaign.impressions), clicks: Number(campaign.clicks) }; }
    return campaign;
  }

  async createCampaign(data: any) {
    if (data.strategy && typeof data.strategy !== 'string') data.strategy = JSON.stringify(data.strategy);
    if (data.targetAudience && typeof data.targetAudience !== 'string') data.targetAudience = JSON.stringify(data.targetAudience);
    return this.prisma.acquisitionCampaign.create({ data });
  }

  async updateCampaign(id: number, data: any) {
    if (data.strategy && typeof data.strategy !== 'string') data.strategy = JSON.stringify(data.strategy);
    if (data.targetAudience && typeof data.targetAudience !== 'string') data.targetAudience = JSON.stringify(data.targetAudience);
    return this.prisma.acquisitionCampaign.update({ where: { id }, data });
  }

  async deleteCampaign(id: number) {
    return this.prisma.acquisitionCampaign.delete({ where: { id } });
  }

  async pauseCampaign(id: number) {
    return this.prisma.acquisitionCampaign.update({ where: { id }, data: { status: 'paused', updatedAt: new Date() } });
  }

  async resumeCampaign(id: number) {
    return this.prisma.acquisitionCampaign.update({ where: { id }, data: { status: 'running', updatedAt: new Date() } });
  }

  async duplicateCampaign(id: number) {
    const original = await this.prisma.acquisitionCampaign.findUnique({ where: { id } });
    if (!original) throw new Error('活动不存在');
    const { id: _, createdAt, updatedAt, ...rest } = original;
    return this.prisma.acquisitionCampaign.create({ data: { ...rest, name: `${original.name} (副本)`, status: 'draft', spentTotal: 0, impressions: BigInt(0), clicks: BigInt(0), conversions: 0, ctr: 0, cpa: 0, roas: 0 } });
  }

  async getCampaignStats() {
    const [total, running, paused, completed, totalSpent, totalConversions] = await Promise.all([
      this.prisma.acquisitionCampaign.count(),
      this.prisma.acquisitionCampaign.count({ where: { status: 'running' } }),
      this.prisma.acquisitionCampaign.count({ where: { status: 'paused' } }),
      this.prisma.acquisitionCampaign.count({ where: { status: 'completed' } }),
      this.prisma.acquisitionCampaign.aggregate({ _sum: { spentTotal: true } }),
      this.prisma.acquisitionCampaign.aggregate({ _sum: { conversions: true } }),
    ]);
    return { total, running, paused, completed, totalSpent: totalSpent._sum.spentTotal || 0, totalConversions: totalConversions._sum.conversions || 0 };
  }

  // ========== 内容素材(Content) ==========
  async findAllContents(query: any) {
    const { page = 1, pageSize = 20, campaignId, status, aiGenerated } = query;
    const where: any = {};
    if (campaignId) where.campaignId = Number(campaignId);
    if (status) where.status = status;
    if (aiGenerated !== undefined) where.aiGenerated = aiGenerated === 'true';
    const [data, total] = await Promise.all([
      this.prisma.acquisitionContent.findMany({
        where, skip: (Number(page) - 1) * Number(pageSize), take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: { campaign: { select: { name: true, platform: { select: { displayName: true } } } }, template: { select: { name: true, category: true } } }
      }),
      this.prisma.acquisitionContent.count({ where }),
    ]);
    return { data: data.map(d => ({ ...d, reach: Number(d.reach), likes: Number(d.likes), comments: Number(d.comments), shares: Number(d.shares), saves: Number(d.saves), clicks: Number(d.clicks) })), total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getContent(id: number) {
    const content = await this.prisma.acquisitionContent.findUnique({ where: { id }, include: { campaign: { include: { platform: true } }, template: true } });
    if (content) { return { ...content, reach: Number(content.reach), likes: Number(content.likes), comments: Number(content.comments), shares: Number(content.shares), saves: Number(content.saves), clicks: Number(content.clicks) }; }
    return content;
  }

  async createContent(data: any) {
    if (data.mediaUrls && typeof data.mediaUrls !== 'string') data.mediaUrls = JSON.stringify(data.mediaUrls);
    if (data.hashtags && typeof data.hashtags !== 'string') data.hashtags = JSON.stringify(data.hashtags);
    if (data.mentionIds && typeof data.mentionIds !== 'string') data.mentionIds = JSON.stringify(data.mentionIds);
    return this.prisma.acquisitionContent.create({ data });
  }

  async updateContent(id: number, data: any) {
    return this.prisma.acquisitionContent.update({ where: { id }, data });
  }

  async deleteContent(id: number) {
    return this.prisma.acquisitionContent.delete({ where: { id } });
  }

  async aiGenerateContent(campaignId: number, templateId?: number) {
    const campaign = await this.prisma.acquisitionCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new Error('活动不存在');
    // 模拟 AI 生成
    const template = templateId ? await this.prisma.acquisitionTemplate.findUnique({ where: { id: templateId } }) : null;
    return this.prisma.acquisitionContent.create({
      data: {
        campaignId,
        title: `AI生成 - ${campaign.name} 内容 ${Date.now()}`,
        body: '这是由AI自动生成的营销文案内容，基于活动目标优化...',
        status: 'draft',
        aiGenerated: true,
        aiPrompt: `为${campaign.objective}类型的活动生成${campaign.contentType}格式的内容`,
        templateId,
      },
    });
  }

  async publishContent(id: number) {
    const content = await this.prisma.acquisitionContent.findUnique({ where: { id } });
    if (!content) throw new Error('内容不存在');
    const success = Math.random() > 0.2;
    return this.prisma.acquisitionContent.update({
      where: { id },
      data: {
        status: success ? 'published' : 'failed',
        publishTime: new Date(),
        platformPostId: success ? `POST_${Date.now()}` : null,
        errorMessage: success ? null : '发布失败：平台API错误',
        updatedAt: new Date(),
      },
    });
  }

  async batchPublish(ids: number[]) {
    const results = await Promise.all(ids.map(id => this.publishContent(id)));
    return { success: results.filter(r => r.status === 'published').length, failed: results.filter(r => r.status === 'failed').length, results };
  }

  async getContentStats() {
    const [total, published, draft, aiCount] = await Promise.all([
      this.prisma.acquisitionContent.count(),
      this.prisma.acquisitionContent.count({ where: { status: 'published' } }),
      this.prisma.acquisitionContent.count({ where: { status: 'draft' } }),
      this.prisma.acquisitionContent.count({ where: { aiGenerated: true } }),
    ]);
    return { total, published, draft, aiGenerated: aiCount };
  }

  // ========== 线索管理(Lead) ==========
  async findAllLeads(query: any) {
    const { page = 1, pageSize = 20, platformId, stage, scoreMin, assignedTo, search } = query;
    const where: any = {};
    if (platformId) where.platformId = Number(platformId);
    if (stage) where.stage = stage;
    if (scoreMin) where.score = { gte: Number(scoreMin) };
    if (assignedTo) where.assignedTo = assignedTo;
    if (search) where.OR = [{ name: { contains: search } }, { phone: { contains: search } }, { email: { contains: search } }];
    const [data, total] = await Promise.all([
      this.prisma.acquisitionLead.findMany({
        where, skip: (Number(page) - 1) * Number(pageSize), take: Number(pageSize),
        orderBy: { lastActivity: 'desc' },
        include: { platform: { select: { name: true, displayName: true, icon: true } }, campaign: { select: { name: true } }, tasks: true }
      }),
      this.prisma.acquisitionLead.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getLead(id: number) {
    return this.prisma.acquisitionLead.findUnique({ where: { id }, include: { platform: true, campaign: true, tasks: true } });
  }

  async createLead(data: any) {
    if (data.tags && typeof data.tags !== 'string') data.tags = JSON.stringify(data.tags);
    if (data.customFields && typeof data.customFields !== 'string') data.customFields = JSON.stringify(data.customFields);
    return this.prisma.acquisitionLead.create({ data });
  }

  async updateLead(id: number, data: any) {
    if (data.tags && typeof data.tags !== 'string') data.tags = JSON.stringify(data.tags);
    return this.prisma.acquisitionLead.update({ where: { id }, data });
  }

  async deleteLead(id: number) {
    return this.prisma.acquisitionLead.delete({ where: { id } });
  }

  async assignLead(id: number, assignee: string) {
    return this.prisma.acquisitionLead.update({ where: { id }, data: { assignedTo: assignee, lastActivity: new Date(), updatedAt: new Date() } });
  }

  async changeStage(id: number, stage: string) {
    const updateData: any = { stage, lastActivity: new Date(), updatedAt: new Date() };
    if (stage === 'won') updateData.convertedAt = new Date();
    return this.prisma.acquisitionLead.update({ where: { id }, data: updateData });
  }

  async aiScoreLead(id: number) {
    const lead = await this.prisma.acquisitionLead.findUnique({ where: { id } });
    if (!lead) throw new Error('线索不存在');
    const score = Math.floor(Math.random() * 40 + 60); // 60-100
    return this.prisma.acquisitionLead.update({ where: { id }, data: { score, updatedAt: new Date() } });
  }

  async getLeadStats(stage?: string) {
    const where = stage ? { stage } : {};
    const [total, byStage] = await Promise.all([
      this.prisma.acquisitionLead.count({ where }),
      this.prisma.acquisitionLead.groupBy({ by: ['stage'], _count: { _all: true }, ...(stage ? {} : {}) }),
    ]);
    return { total, byStage };
  }

  async getMyLeads(assignee: string) {
    return this.prisma.acquisitionLead.findMany({ where: { assignedTo: assignee }, orderBy: { lastActivity: 'desc' }, include: { platform: { select: { displayName: true } }, campaign: { select: { name: true } } } });
  }

  // ========== 达人管理(Influencer) ==========
  async findAllInfluencers(query: any) {
    const { page = 1, pageSize = 20, platformId, erTier, collaborationStatus, search } = query;
    const where: any = {};
    if (platformId) where.platformId = Number(platformId);
    if (erTier) where.erTier = erTier;
    if (collaborationStatus) where.collaborationStatus = collaborationStatus;
    if (search) where.OR = [{ nickname: { contains: search } }, { bio: { contains: search } }];
    const [data, total] = await Promise.all([
      this.prisma.acquisitionInfluencer.findMany({
        where, skip: (Number(page) - 1) * Number(pageSize), take: Number(pageSize),
        orderBy: { performanceScore: 'desc' },
        include: { platform: { select: { name: true, displayName: true, icon: true, region: true } } }
      }),
      this.prisma.acquisitionInfluencer.count({ where }),
    ]);
    return { data: data.map(d => ({ ...d, followers: Number(d.followers) })), total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getInfluencer(id: number) {
    const inf = await this.prisma.acquisitionInfluencer.findUnique({ where: { id }, include: { platform: true } });
    if (inf) { return { ...inf, followers: Number(inf.followers) }; }
    return inf;
  }

  async createInfluencer(data: any) {
    if (data.categories && typeof data.categories !== 'string') data.categories = JSON.stringify(data.categories);
    if (data.contactInfo && typeof data.contactInfo !== 'string') data.contactInfo = JSON.stringify(data.contactInfo);
    if (data.tags && typeof data.tags !== 'string') data.tags = JSON.stringify(data.tags);
    return this.prisma.acquisitionInfluencer.create({ data });
  }

  async updateInfluencer(id: number, data: any) {
    return this.prisma.acquisitionInfluencer.update({ where: { id }, data });
  }

  async deleteInfluencer(id: number) {
    return this.prisma.acquisitionInfluencer.delete({ where: { id } });
  }

  async syncProfile(id: number) {
    const inf = await this.prisma.acquisitionInfluencer.findUnique({ where: { id } });
    if (!inf) throw new Error('达人不存在');
    // 模拟同步数据
    const updatedFollowers = Number(inf.followers) + Math.floor(Math.random() * 10000 - 3000);
    return this.prisma.acquisitionInfluencer.update({
      where: { id },
      data: {
        followers: BigInt(Math.max(0, updatedFollowers)),
        postsCount: inf.postsCount + Math.floor(Math.random() * 5),
        avgLikes: parseFloat((inf.avgLikes + (Math.random() * 2000 - 800)).toFixed(1)),
        engagementRate: parseFloat((Math.random() * 8 + 1).toFixed(2)),
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async analyzeInfluencer(id: number) {
    const inf = await this.prisma.acquisitionInfluencer.findUnique({ where: { id } });
    if (!inf) throw new Error('达人不存在');
    // 模拟 AI 分析
    const matchScore = Math.floor(Math.random() * 30 + 70);
    const newScore = Math.floor((inf.performanceScore + matchScore) / 2);
    return this.prisma.acquisitionInfluencer.update({
      where: { id },
      data: { performanceScore: newScore, notes: `AI分析完成，匹配度${matchScore}/100。建议：${matchScore > 80 ? '强烈推荐合作' : '可考虑合作'}`, updatedAt: new Date() },
    });
  }

  async getInfluencerStats() {
    const [total, collaborating, avgEngagement, byTier] = await Promise.all([
      this.prisma.acquisitionInfluencer.count(),
      this.prisma.acquisitionInfluencer.count({ where: { collaborationStatus: 'collaborating' } }),
      this.prisma.acquisitionInfluencer.aggregate({ _avg: { engagementRate: true } }),
      this.prisma.acquisitionInfluencer.groupBy({ by: ['erTier'], _count: { _all: true } }),
    ]);
    return { total, collaborating, avgEngagementRate: parseFloat((avgEngagement._avg.engagementRate || 0).toFixed(2)), byTier };
  }

  // ========== 自动化任务(Task) ==========
  async findAllTasks(query: any) {
    const { page = 1, pageSize = 20, type, status, priority } = query;
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    const [data, total] = await Promise.all([
      this.prisma.acquisitionTask.findMany({
        where, skip: (Number(page) - 1) * Number(pageSize), take: Number(pageSize),
        orderBy: { scheduledAt: 'asc', createdAt: 'desc' },
        include: { campaign: { select: { name: true } }, lead: { select: { name: true, phone: true } } }
      }),
      this.prisma.acquisitionTask.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getTask(id: number) {
    return this.prisma.acquisitionTask.findUnique({ where: { id }, include: { campaign: true, lead: true } });
  }

  async createTask(data: any) {
    if (data.config && typeof data.config !== 'string') data.config = JSON.stringify(data.config);
    return this.prisma.acquisitionTask.create({ data });
  }

  async updateTask(id: number, data: any) {
    return this.prisma.acquisitionTask.update({ where: { id }, data });
  }

  async deleteTask(id: number) {
    return this.prisma.acquisitionTask.delete({ where: { id } });
  }

  async executeTask(id: number) {
    const task = await this.prisma.acquisitionTask.findUnique({ where: { id } });
    if (!task) throw new Error('任务不存在');
    const success = Math.random() > 0.25;
    return this.prisma.acquisitionTask.update({
      where: { id },
      data: {
        status: success ? 'success' : 'failed',
        startedAt: new Date(),
        completedAt: new Date(),
        result: success ? JSON.stringify({ executed: true, timestamp: new Date().toISOString() }) : null,
        errorMessage: success ? null : '执行失败：外部服务异常',
        executedBy: 'system',
        updatedAt: new Date(),
      },
    });
  }

  async retryTask(id: number) {
    const task = await this.prisma.acquisitionTask.findUnique({ where: { id } });
    if (!task) throw new Error('任务不存在');
    return this.prisma.acquisitionTask.update({
      where: { id },
      data: { status: 'retrying', retryCount: task.retryCount + 1, startedAt: null, completedAt: null, errorMessage: null, updatedAt: new Date() },
    });
  }

  async cancelTask(id: number) {
    return this.prisma.acquisitionTask.update({ where: { id }, data: { status: 'cancelled', updatedAt: new Date() } });
  }

  async getTaskStats() {
    const [total, pending, running, success, failed] = await Promise.all([
      this.prisma.acquisitionTask.count(),
      this.prisma.acquisitionTask.count({ where: { status: 'pending' } }),
      this.prisma.acquisitionTask.count({ where: { status: 'running' } }),
      this.prisma.acquisitionTask.count({ where: { status: 'success' } }),
      this.prisma.acquisitionTask.count({ where: { status: 'failed' } }),
    ]);
    return { total, pending, running, success, failed };
  }

  // ========== 数据报告(Report) ==========
  async findAllReports(query: any) {
    const { page = 1, pageSize = 20, platformId, reportType } = query;
    const where: any = {};
    if (platformId) where.platformId = Number(platformId);
    if (reportType) where.reportType = reportType;
    const [data, total] = await Promise.all([
      this.prisma.acquisitionReport.findMany({
        where, skip: (Number(page) - 1) * Number(pageSize), take: Number(pageSize),
        orderBy: { reportDate: 'desc' },
        include: { platform: { select: { displayName: true, icon: true } }, campaign: { select: { name: true } } }
      }),
      this.prisma.acquisitionReport.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getReport(id: number) {
    return this.prisma.acquisitionReport.findUnique({ where: { id }, include: { platform: true, campaign: true } });
  }

  async generateReport(platformId?: number, campaignId?: number, type?: string, dateRange?: string) {
    // 模拟生成报告
    const range = dateRange ? JSON.parse(dateRange) : { from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), to: new Date() };
    return this.prisma.acquisitionReport.create({
      data: {
        platformId: platformId || 1,
        campaignId,
        reportDate: new Date(),
        reportType: type || 'ad_hoc',
        metrics: JSON.stringify({ generatedAt: new Date(), dateRange: range, impressions: Math.floor(Math.random() * 100000), clicks: Math.floor(Math.random() * 5000), cost: Math.floor(Math.random() * 5000), conversions: Math.floor(Math.random() * 200) }),
        summary: `${type || '自定义'}报告 - ${range.from.toLocaleDateString()} 至 ${range.to.toLocaleDateString()}`,
        insights: JSON.stringify([{ type: 'insight', message: '建议增加高转化时段投放预算' }]),
        generatedBy: 'ai',
      },
    });
  }

  async getDashboardData() {
    const [totalLeads, monthLeads, conversionRate, platforms, recentLeads, pendingTasks] = await Promise.all([
      this.prisma.acquisitionLead.count(),
      this.prisma.acquisitionLead.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
      this.prisma.acquisitionLead.count({ where: { stage: { in: ['won', 'negotiation'] } } }).then(() => Math.floor(Math.random() * 20 + 5)),
      this.prisma.acquisitionPlatform.count({ where: { status: 'active' } }),
      this.prisma.acquisitionLead.findMany({ take: 5, orderBy: { lastActivity: 'desc' }, include: { platform: { select: { displayName: true } } } }),
      this.prisma.acquisitionTask.count({ where: { status: 'pending' } }),
    ]);
    const [spentResult, convResult] = await Promise.all([
      this.prisma.acquisitionCampaign.aggregate({ _sum: { spentTotal: true } }),
      this.prisma.acquisitionCampaign.aggregate({ _sum: { conversions: true, budgetTotal: true } }),
    ]);
    return {
      kpis: { totalLeads, monthLeads, conversionRate, totalSpent: spentResult._sum.spentTotal || 0, totalConversions: convResult._sum.conversions || 0, avgCpa: convResult._sum.conversions ? parseFloat(((spentResult._sum.spentTotal || 0) / convResult._sum.conversions).toFixed(2)) : 0 },
      activePlatforms: platforms,
      recentLeads,
      pendingTasks,
    };
  }

  async getTrendData(days: number = 30) {
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(); date.setDate(date.getDate() - i);
      const leads = Math.floor(Math.random() * 50 + 10);
      const spend = Math.floor(Math.random() * 5000 + 500);
      data.push({ date: date.toISOString().split('T')[0], leads, spend, conversions: Math.floor(leads * 0.15) });
    }
    return data;
  }

  async getPlatformComparison() {
    const platforms = await this.prisma.acquisitionPlatform.findMany({ where: { status: 'active' }, include: { _count: { select: { campaigns: true, leads: true } } } });
    return platforms.map(p => ({
      name: p.displayName, icon: p.icon, region: p.region,
      campaigns: p._count.campaigns, leads: p._count.leads,
      dailyUsed: p.dailyUsed, rateLimit: p.rateLimit,
      utilization: parseFloat(((p.dailyUsed / p.rateLimit) * 100).toFixed(1)),
    }));
  }

  async getFunnelAnalysis(campaignId: number) {
    return this.prisma.acquisitionFunnel.findMany({ where: { campaignId }, orderBy: { createdAt: 'desc' } });
  }

  // ========== 消息模板(Template) ==========
  async findAllTemplates(query: any) {
    const { page = 1, pageSize = 20, category, isPublic } = query;
    const where: any = {};
    if (category) where.category = category;
    if (isPublic !== undefined) where.isPublic = isPublic === 'true';
    const [data, total] = await Promise.all([
      this.prisma.acquisitionTemplate.findMany({ where, skip: (Number(page) - 1) * Number(pageSize), take: Number(pageSize), orderBy: { effectiveness: 'desc' }, include: { _count: { select: { contents: true } } } }),
      this.prisma.acquisitionTemplate.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getTemplate(id: number) {
    return this.prisma.acquisitionTemplate.findUnique({ where: { id }, include: { contents: { take: 5, orderBy: { createdAt: 'desc' } } } });
  }

  async createTemplate(data: any) {
    if (data.variables && typeof data.variables !== 'string') data.variables = JSON.stringify(data.variables);
    return this.prisma.acquisitionTemplate.create({ data });
  }

  async updateTemplate(id: number, data: any) {
    return this.prisma.acquisitionTemplate.update({ where: { id }, data });
  }

  async deleteTemplate(id: number) {
    return this.prisma.acquisitionTemplate.delete({ where: { id } });
  }

  async renderTemplate(id: number, variables: Record<string, string>) {
    const tpl = await this.prisma.acquisitionTemplate.findUnique({ where: { id } });
    if (!tpl) throw new Error('模板不存在');
    let rendered = tpl.body;
    for (const [key, value] of Object.entries(variables)) {
      rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    // 增加使用计数
    await this.prisma.acquisitionTemplate.update({ where: { id }, data: { useCount: { increment: 1 } } });
    return { subject: tpl.subject?.replace(/\{\{(\w+)\}\}/g, (_, k) => variables[k] || `{{${k}}}`), body: rendered, templateName: tpl.name };
  }

  async forkTemplate(id: number) {
    const original = await this.prisma.acquisitionTemplate.findUnique({ where: { id } });
    if (!original) throw new Error('模板不存在');
    const { id: _, createdAt, updatedAt, useCount, effectiveness, ...rest } = original;
    return this.prisma.acquisitionTemplate.create({ data: { ...rest, name: `${original.name} (副本)`, useCount: 0, createdBy: 'forked' } });
  }

  async getTopTemplates(limit: number = 10) {
    return this.prisma.acquisitionTemplate.findMany({ where: { isPublic: true }, orderBy: { effectiveness: 'desc' }, take: limit, include: { _count: { select: { contents: true } } } });
  }

  // ========== API日志(ApiLog) ==========
  async findAllLogs(query: any) {
    const { page = 1, pageSize = 20, platformId, isSuccess, method } = query;
    const where: any = {};
    if (platformId) where.platformId = Number(platformId);
    if (isSuccess !== undefined) where.isSuccess = isSuccess === 'true';
    if (method) where.method = method.toUpperCase();
    const [data, total] = await Promise.all([
      this.prisma.acquisitionApiLog.findMany({ where, skip: (Number(page) - 1) * Number(pageSize), take: Number(pageSize), orderBy: { createdAt: 'desc' }, include: { platform: { select: { name: true, displayName: true } } } }),
      this.prisma.acquisitionApiLog.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getLog(id: number) {
    return this.prisma.acquisitionApiLog.findUnique({ where: { id }, include: { platform: true } });
  }

  async getApiUsageStats(dateFrom?: string, dateTo?: string) {
    const where: any = {};
    if (dateFrom || dateTo) where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
    const [totalCalls, successCalls, failedCalls, totalCost, byPlatform, avgLatency] = await Promise.all([
      this.prisma.acquisitionApiLog.count({ where }),
      this.prisma.acquisitionApiLog.count({ where: { ...where, isSuccess: true } }),
      this.prisma.acquisitionApiLog.count({ where: { ...where, isSuccess: false } }),
      this.prisma.acquisitionApiLog.aggregate({ where, _sum: { costUsd: true } }),
      this.prisma.acquisitionApiLog.groupBy({ where, by: ['platformId'], _count: { _all: true }, _sum: { costUsd: true } }),
      this.prisma.acquisitionApiLog.aggregate({ where, _avg: { latencyMs: true } }),
    ]);
    return { totalCalls, successCalls, failedCalls, successRate: totalCalls ? parseFloat(((successCalls / totalCalls) * 100).toFixed(1)) : 0, totalCost: totalCost._sum.costUsd || 0, avgLatencyMs: Math.round(avgLatency._avg.latencyMs || 0), byPlatform };
  }

  async getErrorLogs() {
    return this.prisma.acquisitionApiLog.findMany({ where: { isSuccess: false }, take: 50, orderBy: { createdAt: 'desc' }, include: { platform: { select: { displayName: true } } } });
  }

  async clearOldLogs(days: number) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await this.prisma.acquisitionApiLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
    return { deleted: result.count };
  }
}
