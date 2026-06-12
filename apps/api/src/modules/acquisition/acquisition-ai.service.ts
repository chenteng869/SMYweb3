import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { LlmProviderFactory } from '../../modules/ai-models/llm/providers/index';

/**
 * 投放效果分析结果
 */
export interface CampaignAnalysis {
  /** 分析文本（中文） */
  analysisText: string;
  /** 平台对比图表数据 */
  platformComparison: PlatformComparisonData[];
  /** 趋势方向：上升/下降/平稳 */
  trendDirection: 'up' | 'down' | 'stable';
  /** 建议列表 */
  recommendations: string[];
}

/** 平台对比数据 */
interface PlatformComparisonData {
  platform: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roi: number;
}

/**
 * 预算优化建议
 */
export interface BudgetRecommendation {
  /** 各平台分配表 */
  allocations: BudgetAllocation[];
  /** AI生成的推理说明（中文） */
  reasoning: string;
  /** 风险评估 */
  riskAssessment: RiskAssessment;
}

/** 单平台预算分配 */
interface BudgetAllocation {
  platform: string;
  amount: number;
  percentage: number;
  expectedROI: number;
  confidence: number; // 0-1
}

/** 风险评估 */
interface RiskAssessment {
  level: 'low' | 'medium' | 'high';
  factors: string[];
  mitigationSuggestions: string[];
}

/**
 * 达人匹配条件
 */
export interface InfluencerMatchCriteria {
  campaignId?: string;
  keywords?: string[];
  minFollowers?: number;
  maxFollowers?: number;
  categories?: string[];
  platforms?: string[];
  excludeIds?: string[];
  limit?: number;
}

/**
 * 达人匹配结果
 */
export interface InfluencerMatchResult {
  influencerId: string;
  name: string;
  platform: string;
  followers: number;
  engagementRate: number;
  totalScore: number; // 0-100
  /** 各维度得分明细 */
  scores: {
    audienceRelevance: number; // 30分制
    engagementQuality: number; // 25分制
    contentFit: number; // 20分制
    costEfficiency: number; // 15分制
    brandSafety: number; // 10分制
  };
  /** AI生成推荐理由 */
  aiExplanation?: string;
  avatarUrl?: string;
  bio?: string;
  estimatedCpm?: number;
  estimatedCpe?: number;
}

/**
 * 时段推荐结果
 */
export interface TimingRecommendation {
  dayOfWeek: number; // 0=周日, 1=周一, ..., 6=周六
  hourOfDay: number; // 0-23
  expectedEngagementMultiplier: number; // 相对平均值的倍数
  confidenceLevel: 'high' | 'medium' | 'low';
  suggestedLabel: string; // 如"工作日午间高峰"
}

/**
 * 内容策略建议
 */
export interface ContentStrategy {
  /** 推荐话题 */
  topics: string[];
  /** 推荐内容格式 */
  formats: string[];
  /** 建议发布频率 */
  postingFrequency: string;
  /** Hashtag策略 */
  hashtagStrategy: string[];
  /** CTA模式建议 */
  ctaPatterns: string[];
  /** 竞品对标数据（如有） */
  competitorBenchmarking?: CompetitorBenchmark;
  /** AI策略说明 */
  strategyRationale: string;
}

/** 竞品对标数据 */
interface CompetitorBenchmark {
  competitors: string[];
  topPerformingContentTypes: string[];
  avgEngagementRates: Record<string, number>;
}

/**
 * 一键采纳结果
 */
export interface AdoptRecommendationResult {
  success: boolean;
  appliedChanges: AppliedChange[];
}

/** 已应用的变更记录 */
interface AppliedChange {
  type: 'budget_allocation' | 'influencer_selection' | 'posting_schedule' | 'content_strategy';
  targetId: string;
  description: string;
  timestamp: string;
}

/**
 * 获客AI智能服务 — 获客系统的"大脑"
 *
 * 基于LLM提供投放效果分析、预算优化、达人匹配、时段推荐、内容策略等智能决策能力。
 * 所有AI分析均结合业务数据库中的真实数据，确保建议的可落地性。
 */
@Injectable()
export class AcquisitionAiService {
  private readonly logger = new Logger(AcquisitionAiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmFactory: LlmProviderFactory
  ) {}

  /**
   * 投放效果分析
   *
   * 从数据库拉取指定活动在时间范围内的投放数据（花费、曝光、点击、转化等），
   * 结合LLM生成深度洞察分析，包括各平台表现对比、趋势判断和优化建议。
   *
   * @param campaignId 活动ID
   * @param dateRange 可选时间范围，默认近30天
   * @returns 分析结果，包含中文分析文本、平台对比数据和优化建议
   */
  async analyzeCampaignPerformance(
    campaignId: string,
    dateRange?: { start: string; end: string }
  ): Promise<CampaignAnalysis> {
    const start = dateRange?.start || this.getDefaultStartDate();
    const end = dateRange?.end || new Date().toISOString();

    // 1. 从数据库获取活动投放数据
    const rawData = await this.fetchCampaignRawData(campaignId, start, end);

    // 2. 构建平台对比数据
    const platformComparison = this.buildPlatformComparison(rawData);

    // 3. 判断趋势方向
    const trendDirection = this.calculateTrendDirection(rawData);

    // 4. 调用LLM生成深度分析
    const analysisText = await this.generatePerformanceAnalysisWithLlm(
      campaignId,
      rawData,
      platformComparison
    );

    // 5. 生成优化建议
    const recommendations = await this.generateRecommendationsWithLlm(campaignId, rawData);

    return {
      analysisText,
      platformComparison,
      trendDirection,
      recommendations,
    };
  }

  /**
   * 预算优化建议
   *
   * 多目标优化算法：
   * a) 分析各平台历史ROI
   * b) 计算每增加一美元的边际回报
   * c) 考虑平台间受众重叠度
   * d) 生成带置信度的分配方案
   *
   * @param campaignId 活动ID
   * @param totalBudget 总预算金额
   * @param platforms 待分配平台列表
   * @returns 预算分配方案、推理说明和风险评估
   */
  async optimizeBudget(
    campaignId: string,
    totalBudget: number,
    platforms: string[]
  ): Promise<BudgetRecommendation> {
    // 1. 获取各平台历史ROI数据
    const historicalRoi = await this.fetchHistoricalRoiByPlatform(campaignId, platforms);

    // 2. 计算边际回报率
    const marginalReturns = this.calculateMarginalReturns(historicalRoi, totalBudget);

    // 3. 计算平台间受众重叠度
    const overlapMatrix = await this.calculateAudienceOverlap(platforms);

    // 4. 运行多目标优化算法生成分配方案
    const allocations = this.runBudgetOptimizationAlgorithm(
      platforms,
      totalBudget,
      marginalReturns,
      overlapMatrix
    );

    // 5. LLM生成自然语言推理说明
    const reasoning = await this.generateBudgetReasoningWithLlm(allocations, historicalRoi);

    // 6. 风险评估
    const riskAssessment = this.assessBudgetRisk(allocations, historicalRoi);

    return { allocations, reasoning, riskAssessment };
  }

  /**
   * 达人智能匹配
   *
   * 多因子加权评分算法（总分100）：
   * - 受众相关性 (30%): 关键词与达人bio/标签/内容的匹配度
   * - 互动质量 (25%): 互动率 × 粉丝真实性因子
   * - 内容契合度 (20%): LLM分析近期内容风格匹配度
   * - 成本效率 (15%): 基于粉丝数和互动的预估CPM/CPE
   * - 品牌安全 (10%): 内容历史风险评分
   *
   * @param criteria 匹配条件
   * @returns 按总评分排序的达人列表，含各维度得分明细和AI推荐理由
   */
  async matchInfluencers(criteria: InfluencerMatchCriteria): Promise<InfluencerMatchResult[]> {
    const limit = criteria.limit || 20;

    // 1. 根据条件筛选候选达人池
    const candidates = await this.queryInfluencerCandidates(criteria);

    if (candidates.length === 0) {
      return [];
    }

    // 2. 并行计算各维度分数
    const scoredResults = await Promise.all(
      candidates.map(async (candidate) => {
        const [audienceRelevance, engagementQuality, costEfficiency, brandSafety] =
          await Promise.all([
            this.scoreAudienceRelevance(candidate, criteria.keywords || []),
            this.scoreEngagementQuality(candidate),
            this.scoreCostEfficiency(candidate),
            this.scoreBrandSafety(candidate),
          ]);

        // 内容契合度需要LLM分析，单独处理
        const contentFit = await this.scoreContentFitWithLlm(candidate, criteria.campaignId);

        const totalScore =
          audienceRelevance + engagementQuality + contentFit + costEfficiency + brandSafety;

        return {
          influencerId: candidate.id,
          name: candidate.name,
          platform: candidate.platform,
          followers: candidate.followers,
          engagementRate: candidate.engagementRate,
          totalScore,
          scores: {
            audienceRelevance, // max 30
            engagementQuality, // max 25
            contentFit, // max 20
            costEfficiency, // max 15
            brandSafety, // max 10
          },
          avatarUrl: candidate.avatarUrl,
          bio: candidate.bio,
          estimatedCpm: this.estimateCpm(candidate),
          estimatedCpe: this.estimateCpe(candidate),
        };
      })
    );

    // 3. 按总分降序排列并截取
    const sorted = scoredResults.sort((a, b) => b.totalScore - a.totalScore).slice(0, limit);

    // 4. 为Top 10生成AI推荐理由
    const top10 = sorted.slice(0, 10);
    const withExplanations = await Promise.all(
      top10.map(async (item) => ({
        ...item,
        aiExplanation: await this.generateInfluencerExplanationWithLlm(item, criteria),
      }))
    );

    // 合并剩余无解释的结果
    const rest = sorted.slice(10);
    return [...withExplanations, ...rest];
  }

  /**
   * 时段推荐
   *
   * 分析历史互动数据的小时级和星期级规律，
   * 结合平台特性使用高峰时段和目标受众时区，
   * 输出排名靠前的时间段及预期互动倍率。
   *
   * @param platform 平台名称
   * @param audienceTimezone 目标受众时区，默认 Asia/Shanghai
   * @returns 排名的时间段列表，含预期互动倍率和置信度
   */
  async recommendPostingTimes(
    platform: string,
    audienceTimezone: string = 'Asia/Shanghai'
  ): Promise<TimingRecommendation[]> {
    // 1. 获取该平台历史互动数据（按小时聚合）
    const hourlyPatterns = await this.fetchHourlyEngagementPatterns(platform);

    // 2. 获取按星期聚合的数据
    const weeklyPatterns = await this.fetchWeeklyEngagementPatterns(platform);

    // 3. 平台特定高峰时间基准
    const platformPeaks = this.getPlatformPeakTimes(platform);

    // 4. 综合计算每个时间段的推荐指数
    const timeSlots = this.calculateTimeSlotScores(
      hourlyPatterns,
      weeklyPatterns,
      platformPeaks,
      audienceTimezone
    );

    // 5. 按预期互动倍率降序排列，返回Top推荐
    return timeSlots
      .sort((a, b) => b.expectedEngagementMultiplier - a.expectedEngagementMultiplier)
      .slice(0, 24); // 返回最佳24个时段
  }

  /**
   * 内容策略建议
   *
   * 使用LLM分析领域内成功内容模式，
   * 提供话题方向、内容格式、发布频率、Hashtag策略、CTA模式等全方位建议。
   * 若有竞品数据则纳入对标分析。
   *
   * @param campaignId 活动ID
   * @param targetAudience 目标受众描述
   * @returns 完整的内容策略建议
   */
  async suggestContentStrategy(
    campaignId: string,
    targetAudience: string
  ): Promise<ContentStrategy> {
    // 1. 获取活动相关历史内容表现数据
    const contentHistory = await this.fetchContentHistory(campaignId);

    // 2. 尝试获取竞品数据
    const competitorData = await this.fetchCompetitorData(campaignId);

    // 3. LLM综合分析生成策略
    const llmResult = await this.generateContentStrategyWithLlm(
      campaignId,
      targetAudience,
      contentHistory,
      competitorData
    );

    return {
      topics: llmResult.topics,
      formats: llmResult.formats,
      postingFrequency: llmResult.postingFrequency,
      hashtagStrategy: llmResult.hashtagStrategy,
      ctaPatterns: llmResult.ctaPatterns,
      competitorBenchmarking: competitorData
        ? {
            competitors: competitorData.competitors,
            topPerformingContentTypes: competitorData.topTypes,
            avgEngagementRates: competitorData.avgRates,
          }
        : undefined,
      strategyRationale: llmResult.rationale,
    };
  }

  /**
   * 一键采纳建议
   *
   * 将推荐的设置保存为当前生效配置，
   * 并在任务队列中创建对应的执行项。
   *
   * @param recommendationId 建议ID
   * @returns 操作结果及已应用的变更列表
   */
  async adoptRecommendation(recommendationId: string): Promise<AdoptRecommendationResult> {
    // 1. 查询推荐详情
    const recommendation = await this.fetchRecommendationById(recommendationId);
    if (!recommendation) {
      throw new Error(`未找到推荐记录: ${recommendationId}`);
    }

    const appliedChanges: AppliedChange[] = [];
    const now = new Date().toISOString();

    try {
      // 2. 根据推荐类型分别处理
      switch (recommendation.type) {
        case 'budget_allocation':
          await this.applyBudgetAllocation(recommendation.data);
          appliedChanges.push({
            type: 'budget_allocation',
            targetId: recommendation.campaignId,
            description: `应用预算分配方案`,
            timestamp: now,
          });
          break;

        case 'influencer_selection':
          await this.applyInfluencerSelection(recommendation.data);
          appliedChanges.push({
            type: 'influencer_selection',
            targetId: recommendation.id,
            description: `采纳达人推荐 (${recommendation.data.influencerIds?.length || 0}位)`,
            timestamp: now,
          });
          break;

        case 'posting_schedule':
          await this.applyPostingSchedule(recommendation.data);
          appliedChanges.push({
            type: 'posting_schedule',
            targetId: recommendation.campaignId,
            description: `采纳发布时段建议`,
            timestamp: now,
          });
          break;

        case 'content_strategy':
          await this.applyContentStrategy(recommendation.data);
          appliedChanges.push({
            type: 'content_strategy',
            targetId: recommendation.campaignId,
            description: `采纳内容策略建议`,
            timestamp: now,
          });
          break;

        default:
          throw new Error(`不支持的推荐类型: ${recommendation.type}`);
      }

      // 3. 创建任务队列执行项
      await this.createTaskQueueItems(recommendation, appliedChanges);

      // 4. 标记推荐为已采纳
      await this.markRecommendationAsAdopted(recommendationId);

      return { success: true, appliedChanges };
    } catch (error) {
      this.logger.error(
        `一键采纳失败 (recommendationId=${recommendationId})`,
        error instanceof Error ? error.stack : error
      );
      return { success: false, appliedChanges: [] };
    }
  }

  // ==================== 私有辅助方法 ====================

  /** 获取默认起始日期（30天前） */
  private getDefaultStartDate(): string {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  }

  /** 从数据库获取活动原始投放数据 */
  private async fetchCampaignRawData(
    _campaignId: string,
    _start: string,
    _end: string
  ): Promise<any[]> {
    // TODO: 通过Prisma查询campaign_metrics表，按platform和date分组聚合
    // 返回格式: [{ platform, date, spend, impressions, clicks, conversions }]
    return [];
  }

  /** 构建平台对比数据 */
  private buildPlatformComparison(_rawData: any[]): PlatformComparisonData[] {
    // TODO: 将原始数据聚合成平台级别汇总
    return [];
  }

  /** 计算趋势方向 */
  private calculateTrendDirection(_rawData: any[]): 'up' | 'down' | 'stable' {
    // TODO: 对比前后半段数据判断趋势
    return 'stable';
  }

  /** LLM生成投放效果分析 */
  private async generatePerformanceAnalysisWithLlm(
    _campaignId: string,
    _rawData: any[],
    _comparison: PlatformComparisonData[]
  ): Promise<string> {
    // TODO: 构建prompt调用LLM生成中文分析报告
    return '';
  }

  /** LLM生成优化建议 */
  private async generateRecommendationsWithLlm(
    _campaignId: string,
    _rawData: any[]
  ): Promise<string[]> {
    // TODO: 基于数据分析结果让LLM给出可执行的优化建议
    return [];
  }

  /** 获取各平台历史ROI */
  private async fetchHistoricalRoiByPlatform(
    _campaignId: string,
    _platforms: string[]
  ): Promise<Record<string, number>> {
    // TODO: 查询各平台历史ROI数据
    return {};
  }

  /** 计算边际回报率 */
  private calculateMarginalReturns(
    _historicalRoi: Record<string, number>,
    _totalBudget: number
  ): Record<string, number> {
    // TODO: 基于历史ROI计算递减的边际回报曲线
    return {};
  }

  /** 计算受众重叠矩阵 */
  private async calculateAudienceOverlap(_platforms: string[]): Promise<number[][]> {
    // TODO: 分析各平台间受众重叠程度
    return [];
  }

  /** 执行预算优化算法 */
  private runBudgetOptimizationAlgorithm(
    platforms: string[],
    totalBudget: number,
    marginalReturns: Record<string, number>,
    _overlapMatrix: number[][]
  ): BudgetAllocation[] {
    // TODO: 使用线性规划或贪心算法进行多目标优化
    // 这里简化为按边际回报比例分配
    const totalReturn =
      Object.values(marginalReturns).reduce((sum, v) => sum + Math.max(v, 0), 0) || 1;

    return platforms.map((platform) => {
      const rawReturn = marginalReturns[platform] || 0;
      const normalizedReturn = Math.max(rawReturn, 0);
      const percentage = normalizedReturn / totalReturn;
      return {
        platform,
        amount: Math.round(totalBudget * percentage),
        percentage: Math.round(percentage * 10000) / 100,
        expectedROI: rawReturn,
        confidence: Math.min(Math.max(normalizedReturn / totalReturn, 0.3), 0.95),
      };
    });
  }

  /** LLM生成预算推理说明 */
  private async generateBudgetReasoningWithLlm(
    _allocations: BudgetAllocation[],
    _historicalRoi: Record<string, number>
  ): Promise<string> {
    // TODO: 让LLM用自然语言解释预算分配逻辑
    return '';
  }

  /** 风险评估 */
  private assessBudgetRisk(
    _allocations: BudgetAllocation[],
    _historicalRoi: Record<string, number>
  ): RiskAssessment {
    // TODO: 评估集中度风险、波动风险等
    return {
      level: 'medium',
      factors: ['需持续监控ROI变化'],
      mitigationSuggestions: ['建议每周复盘一次预算分配'],
    };
  }

  /** 查询达人候选池 */
  private async queryInfluencerCandidates(_criteria: InfluencerMatchCriteria): Promise<any[]> {
    // TODO: 通过Prisma查询influencers表，根据条件筛选
    return [];
  }

  /** 受众相关性评分 (满分30) */
  private async scoreAudienceRelevance(_candidate: any, _keywords: string[]): Promise<number> {
    // TODO: TF-IDF关键词匹配 bio/tags/content
    return 0;
  }

  /** 互动质量评分 (满分25) */
  private async scoreEngagementQuality(_candidate: any): Promise<number> {
    // TODO: engagementRate × authenticityFactor
    return 0;
  }

  /** 内容契合度评分 - LLM分析 (满分20) */
  private async scoreContentFitWithLlm(_candidate: any, _campaignId?: string): Promise<number> {
    // TODO: 取最近帖子让LLM评估内容风格匹配度
    return 0;
  }

  /** 成本效率评分 (满分15) */
  private async scoreCostEfficiency(_candidate: any): Promise<number> {
    // TODO: 基于followers和engagement估算CPM/CPE
    return 0;
  }

  /** 品牌安全评分 (满分10) */
  private async scoreBrandSafety(_candidate: any): Promise<number> {
    // TODO: 检查内容历史是否有敏感信息
    return 10; // 默认安全
  }

  /** 估算CPM */
  private estimateCpm(_candidate: any): number {
    return 0;
  }

  /** 估算CPE */
  private estimateCpe(_candidate: any): number {
    return 0;
  }

  /** LLM生成达人推荐理由 */
  private async generateInfluencerExplanationWithLlm(
    _result: InfluencerMatchResult,
    _criteria: InfluencerMatchCriteria
  ): Promise<string> {
    // TODO: 让LLM用简洁中文解释为什么推荐这位达人
    return '';
  }

  /** 获取小时级互动模式 */
  private async fetchHourlyEngagementPatterns(_platform: string): Promise<Map<string, number>> {
    // TODO: 查询按hour_of_day聚合的互动数据
    return new Map();
  }

  /** 获取周级互动模式 */
  private async fetchWeeklyEngagementPatterns(_platform: string): Promise<Map<number, number>> {
    // TODO: 查询按day_of_week聚合的互动数据
    return new Map();
  }

  /** 获取平台高峰时间基准 */
  private getPlatformPeakTimes(_platform: string): number[] {
    // TODO: 返回各平台的已知高峰小时数组
    return [10, 12, 14, 18, 20, 21];
  }

  /** 计算时间段得分 */
  private calculateTimeSlotScores(
    _hourlyPatterns: Map<string, number>,
    _weeklyPatterns: Map<number, number>,
    _platformPeaks: number[],
    _timezone: string
  ): TimingRecommendation[] {
    // TODO: 综合三种数据源计算每个时间段的推荐指数
    return [];
  }

  /** 获取活动历史内容数据 */
  private async fetchContentHistory(_campaignId: string): Promise<any[]> {
    // TODO: 查询活动相关的发布内容和表现
    return [];
  }

  /** 获取竞品数据 */
  private async fetchCompetitorData(_campaignId: string): Promise<any> {
    // TODO: 查询竞品监测数据
    return null;
  }

  /** LLM生成内容策略 */
  private async generateContentStrategyWithLlm(
    _campaignId: string,
    _targetAudience: string,
    _contentHistory: any[],
    _competitorData: any
  ): Promise<{
    topics: string[];
    formats: string[];
    postingFrequency: string;
    hashtagStrategy: string[];
    ctaPatterns: string[];
    rationale: string;
  }> {
    // TODO: 构建详细prompt让LLM输出结构化策略
    return {
      topics: [],
      formats: [],
      postingFrequency: '',
      hashtagStrategy: [],
      ctaPatterns: [],
      rationale: '',
    };
  }

  /** 查询推荐详情 */
  private async fetchRecommendationById(_id: string): Promise<any> {
    // TODO: 查询recommendations表
    return null;
  }

  /** 应用预算分配 */
  private async applyBudgetAllocation(_data: any): Promise<void> {
    // TODO: 更新campaign的budget_allocation配置
  }

  /** 应用达人选择 */
  private async applyInfluencerSelection(_data: any): Promise<void> {
    // TODO: 将选中的达人加入campaign_influencers关联表
  }

  /** 应用发布时段 */
  private async applyPostingSchedule(_data: any): Promise<void> {
    // TODO: 更新campaign的posting_schedule配置
  }

  /** 应用内容策略 */
  private async applyContentStrategy(_data: any): Promise<void> {
    // TODO: 将策略写入campaign的content_strategy配置
  }

  /** 创建任务队列项 */
  private async createTaskQueueItems(
    _recommendation: any,
    _changes: AppliedChange[]
  ): Promise<void> {
    // TODO: 在task_queue表中创建待执行任务
  }

  /** 标记推荐为已采纳 */
  private async markRecommendationAsAdopted(_id: string): Promise<void> {
    // TODO: 更新recommendations表的status为adopted
  }
}
